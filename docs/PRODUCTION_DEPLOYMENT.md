# 生产发布与回滚

## 发布边界

门户与 Lingxi 双站只使用 [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) 发布。它从 `hi-veblen` 当前提交构建门户，从 `Lingxi` 的固定 `LINGXI_SHA` 构建网页端与后端，再将三部分组合成同一个不可变发布包。

这条 workflow 不部署 MyWeb API。门户 API 继续由独立 PM2 进程在本机端口 `3001` 运行，发布过程只通过 `/api/health` 验证其状态。PM2 启动和 `db:init` 会通过 Node `--env-file=.env` 读取 root-only 运行配置，但仓库目前没有 MyWeb API 的自动维护和回滚入口；其依赖、数据库迁移和进程重启需要单独获批的维护方案、数据备份与回滚验证。

## 拓扑

| 组件 | 来源 | 生产职责 |
| --- | --- | --- |
| Portal | `hi-veblen` 当前提交 | 数字展厅与 Lingxi 入口 |
| Lingxi frontend | `Lingxi` 的 `LINGXI_SHA` | 登录、角色创建与专属对话界面 |
| Lingxi backend | 同一 `LINGXI_SHA` | 宿主、网关、角色与会话 API |
| MyWeb API | 独立 PM2 进程 | 门户内容、联系表单与访问数据 |
| Nginx | 服务器现行配置 | 双域静态资源与 API 路由 |

门户、Lingxi 网页端和 Lingxi 后端各有一个 `current` 符号链接。发布目录按 Git revision 和 workflow run 标识创建，发布后不在原目录上覆盖文件。每个 Lingxi backend release 使用独立 `.venv`，systemd 通过 `backend-current/.venv/bin/python` 启动，使运行代码与依赖随同一个指针切换。

当前生产 revision 为 portal `1c42c8e`、Lingxi frontend/backend/host `60d0b08`。[Portal CI run `29158269214`](https://github.com/Timking123/hi-veblen/actions/runs/29158269214)、[Lingxi CI run `29158252370`](https://github.com/Timking123/Lingxi/actions/runs/29158252370) 与 [production workflow `29158517614`](https://github.com/Timking123/hi-veblen/actions/runs/29158517614) 均为 success；独立 Python 3.12 release venv、新安全头与公网协议检查已经在生产部署 job 中通过。

## 发布前条件

1. `hi-veblen` 的三个阻断检查组全部通过：`Release gate`、`Admin quality` 和 `Portal E2E`。
2. 待发布的 Lingxi 提交已经完成其仓库要求的测试与浏览器验收。
3. `LINGXI_SHA` 是完整提交 SHA，并指向准备发布的 Lingxi revision；该 revision 必须包含精确锁定的 `requirements-ci.txt`。触发前要实际复核文件存在，仍指向不含该文件的旧 revision 时不得运行 workflow。
4. GitHub `production` Environment 的审批和 secrets 已配置。仓库只保存 secret 名称，不保存值。
5. `myagent-world.service` 与 `myagent-gateway.service` 的 `DropInPaths` 均为空；任何临时或未纳管的 systemd drop-in 都必须先清理并恢复正式配置。
6. MyWeb API 健康，运行数据已经按既定策略备份。

workflow 使用的敏感项包括跨仓库只读 token、服务器主机、部署账号和 SSH 私钥。所有值只放在 GitHub Actions secrets 中，不写入命令示例、日志、文档或仓库文件。

## 发布流程

1. 在 `.github/workflows/deploy.yml` 更新 `LINGXI_SHA`，提交并等待 CI。
2. 从 GitHub Actions 手动触发“发布门户与灵犀网页端”，不要在服务器上手工复制构建产物。deploy job 会在创建暂存目录前读取两个 Lingxi systemd 单元的 `DropInPaths`，非空即终止。
3. workflow 的 `build` job 使用 Python 3.12 和 Lingxi 的 `requirements-ci.txt` 安装确定性验证依赖，再分别构建门户和 Lingxi，将 portal、lingxi、backend 三部分写入同一发布包；锁文件缺失或为空会直接失败。
4. 构建阶段写入 `release.txt` 和后端 revision 环境文件，对 Lingxi 提交、静态资源、必要后端文件和归档内容做一致性检查。
5. workflow 生成 SHA-256 校验文件，并将制品短期保存为本次 run 的 artifact。
6. `deploy` job 在私有暂存目录接收制品，重新校验摘要，拒绝绝对路径、目录穿越和非普通归档成员。
7. 服务器创建收紧写权限的发布目录，复核后端文件清单，将持久化 `data` 与 `snapshots` 作为外部目录挂入。
8. 在停服务前使用服务器现有 `/usr/bin/python3` 3.12 为新 backend release 创建独立 `.venv`，从 `requirements-ci.txt` 安装依赖并执行 `pip check`，再以离线 dry-run 逐项复核环境与锁文件版本；安装不使用持久 pip 缓存，也不安装或升级系统包。
9. 只有 release venv 完整、属于当前 release、通过 Python 版本和写权限检查后，workflow 才保存上一版三个指针、systemd 单元与 Nginx 配置并停止 Lingxi 网关和宿主，拒绝 mutation 穿越版本边界。
10. 在短维护窗口内协调切换 portal、lingxi、backend 三个指针，安装 Lingxi 服务并等待同 SHA 健康；校验 Nginx 路由与生产协议后结束维护。全部通过后，本次发布完成。

## 自动验证

发布 workflow 至少检查以下结果：

- 双站 HTML 可访问，入口节点存在。
- `index.html` 引用的 JavaScript 与 CSS 均存在，MIME 类型正确。
- 随机缺失静态资源返回 `404`，不会错误回退到 HTML。
- 门户构建产物包含生产 Lingxi 地址。
- 门户和 Lingxi 的 `/release.txt` 与预期 revision 一致。
- 门户 `/api/health` 返回健康状态。
- Lingxi `/api/health` 报告生产认证安全、宿主健康且 revision 一致。
- 新 backend release 使用独立 Python 3.12 venv，归属当前 release、无 group/other 写权限且 `pip check` 通过。
- 发布前及服务安装后，`myagent-world.service` 与 `myagent-gateway.service` 的 `DropInPaths` 均为空。
- 无效 token 与默认开发 token 均被拒绝并返回 `401`。
- TLS 证书覆盖 Lingxi 域名，Nginx 双域根目录与 API 代理仍指向预期服务。
- 门户与 Lingxi 均返回 `X-Frame-Options: DENY`，`Server` 响应头不泄露版本号。
- Lingxi 的 `Content-Security-Policy` 包含 `frame-ancestors 'none'` 与 `script-src 'self'`。

## 回滚

维护切换后任何验证失败都会触发 workflow 的自动回滚。回滚会恢复上一版 portal、lingxi、backend 指针，同时恢复切换前备份的 systemd 和 Nginx 配置，随后重启 Lingxi 服务并重新加载 Nginx。旧 systemd 单元仍可使用保留的 `/opt/myagent/.venv` 共享环境，因此首次采用 release venv 的发布也能回滚到旧版；workflow 不删除共享 venv 或任何历史 release。该流程选择短暂拒绝 mutation，不宣称无停机或跨三个文件系统路径的单指令原子性。

已经完成且随后发现业务回归时，优先通过 Git 回退门户提交或将 `LINGXI_SHA` 改回已知正常 revision，再重新运行同一 workflow。不要直接改 `current` 链接，也不要在现行发布目录中热修文件，否则 revision 与实际代码会失去对应关系。

## 数据与凭据

- MyWeb 数据库、Lingxi `data`、`snapshots`、上传文件和日志不进入发布制品，也不进入 Git。
- `.env*` 默认忽略，仅 `.env.example` 可以跟踪；示例文件只能包含无敏感性的本地默认值。
- 从当前提交停止跟踪只能保护后续 revision。任何曾进入 Git 历史的凭据都需要立即轮换，历史净化必须由仓库所有者单独授权并安排强制同步窗口。
- 发布日志不得输出 secret、token、用户角色正文或数据库内容。

## 失败处理

| 阶段 | 处理方式 |
| --- | --- |
| 构建或测试失败 | 不生成可部署制品，修复后从新提交重跑 |
| 检测到 systemd drop-in | 发布前出现则在创建暂存目录前拒绝；服务安装后仍存在则验证失败并自动回滚。恢复正式单元配置后从头重跑 |
| 制品摘要或归档校验失败 | 拒绝解包，保留当前生产指针 |
| 新 release venv 创建、安装、锁版本复核或 `pip check` 失败 | 在停服务前终止，当前指针、服务和旧共享 venv 均不变 |
| 维护切换后验证失败 | workflow 自动恢复上一组指针和服务配置 |
| MyWeb API 不健康 | 不通过发布验收，API 由独立维护流程处理 |
| revision 不一致 | 视为发布失败，不手工修改 `release.txt` |
