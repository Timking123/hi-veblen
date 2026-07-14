# 生产发布与回滚

## 发布边界

门户与 Lingxi 双站只使用 [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) 发布。它从 `hi-veblen` 当前提交构建门户，从 `Lingxi` 的固定 `LINGXI_SHA` 构建网页端与后端，再将三部分组合成同一个不可变发布包。

这条 workflow 不部署 MyWeb API。门户 API 继续由独立 PM2 进程在本机端口 `3001` 运行，发布过程只通过 `/api/health` 验证其状态。PM2 启动和 `db:init` 会通过 Node `--env-file=.env` 读取 root-only 运行配置，但仓库目前没有 MyWeb API 的自动维护和回滚入口；其依赖、数据库迁移和进程重启需要单独获批的维护方案、数据备份与回滚验证。

## 拓扑

| 组件 | 来源 | 生产职责 |
| --- | --- | --- |
| Portal | `hi-veblen` 当前提交 | 数字展厅与 Lingxi 入口 |
| Lingxi frontend | `Lingxi` 的 `LINGXI_SHA` | 登录、角色创建与专属对话界面 |
| Lingxi backend | 同一 `LINGXI_SHA` | 宿主；登录、onboarding、角色创建事务与会话适配网关；角色和会话 API |
| MyWeb API | 独立 PM2 进程 | 门户内容、联系表单与访问数据 |
| Nginx | 服务器现行配置 | 双域静态资源与 API 路由 |

门户、Lingxi 网页端和 Lingxi 后端各有一个 `current` 符号链接。发布目录按 Git revision 和 workflow run 标识创建，发布后不在原目录上覆盖文件。每个 Lingxi backend release 使用独立 `.venv`，systemd 通过 `backend-current/.venv/bin/python` 启动，使运行代码与依赖随同一个指针切换。

截至 2026-07-14，当前生产 revision 为 portal `3b0f010a0fb495504d0c3ffa01006f8bc33a8475`、Lingxi frontend/backend/host `55255df61ae6aef89ce5d8e4d46ba637ca3cd632`。[Portal CI run `29301865888` attempt 2](https://github.com/Timking123/hi-veblen/actions/runs/29301865888/attempts/2) 的四个 job 均为 success；attempt 1 因 GitHub 托管 runner 访问 APT 镜像超时中断，未形成项目代码失败结论。[Lingxi CI run `29301558361`](https://github.com/Timking123/Lingxi/actions/runs/29301558361) 的 Web、Python 3.11、Python 3.12 三个 job，以及 [production workflow `29302920011`](https://github.com/Timking123/hi-veblen/actions/runs/29302920011) 的构建和部署 job 均为 success。生产构建耗时 3 分 30 秒，部署耗时 1 分 50 秒；两个 job 分别搜索 `Traceback`、`AssertionError`、`FileNotFoundError`，六项检查均为 0 命中。匿名公网协议探针 24/24 通过，两站 `release.txt` 与预期 revision 一致，Lingxi 健康接口的 `ok`、`ready`、`continuity_ok` 和 `production_auth_safe` 均为 `true`。六档 Windows Chromium 复验保持 0 横向溢出、单一裂缝宿主与单一 ready Canvas，四类交互痕迹刷新后完整保留，双站控制台 warning/error 为 0，完整证据归档在 `E:\MyAgent Test\P6生产浏览器验收\2026-07-14_1124_P6短会话鉴权优化最终生产复验\`。本次没有生产用户凭据，不能替代登录态角色创建、历史分页或完整对话验收，也不能替代 iOS、Android、Safari 与真实平板真机。

## 发布前条件

1. `hi-veblen` 的三个阻断检查组全部通过：`Release gate`、`Admin quality` 和 `Portal E2E`。
2. 待发布的 Lingxi 提交已经完成其仓库要求的测试与浏览器验收。
3. `LINGXI_SHA` 是完整提交 SHA，并指向准备发布的 Lingxi revision；该 revision 必须包含精确锁定的 `requirements-ci.txt`。触发前要实际复核文件存在，仍指向不含该文件的旧 revision 时不得运行 workflow。
4. GitHub `production` Environment 必须存在。当前没有 required reviewer，发布由具备仓库写权限的人手动触发 `workflow_dispatch`；`LINGXI_REPO_TOKEN`、`SERVER_HOST`、`SERVER_USER`、`SERVER_SSH_KEY` 当前均为 repository-level Actions secrets。若后续启用生产审批，服务器三项 secret 可迁入 Environment，build job 使用的 `LINGXI_REPO_TOKEN` 仍需保留可见作用域。仓库只保存 secret 名称，不保存值。
5. `myagent-world.service` 与 `myagent-gateway.service` 的 `DropInPaths` 均为空；任何临时或未纳管的 systemd drop-in 都必须先清理并恢复正式配置。
6. `/run/myagent-release-maintenance`、`/run/hi-veblen-release-preserve`、`/run/hi-veblen-release-lease` 和 staging 内的 `PRESERVE` 均不存在。发现任一标记或生命周期租约都表示上次事务仍需人工核验，不得删除后继续发布。
7. MyWeb API 健康，运行数据已经按既定策略备份。

workflow 使用的敏感项包括跨仓库只读 token、服务器主机、部署账号和 SSH 私钥。所有值只放在 GitHub Actions secrets 中，不写入命令示例、日志、文档或仓库文件。

## 发布流程

1. 在 `.github/workflows/deploy.yml` 更新 `LINGXI_SHA`，提交并等待 CI。
2. 从 GitHub Actions 手动触发“发布门户与灵犀网页端”，不要在服务器上手工复制构建产物。deploy job 会在创建暂存目录前检查两个 Lingxi systemd 单元的 `DropInPaths`、全局维护标记、全局保护标记和 staging 保护现场，随后以 `run_id-run_attempt` 原子创建生命周期租约；任一检查未通过即终止。
3. workflow 的 `build` job 使用 Python 3.12 和 Lingxi 的 `requirements-ci.txt` 安装确定性验证依赖，再分别构建门户和 Lingxi，将 portal、lingxi、backend 三部分写入同一发布包；锁文件缺失或为空会直接失败。
4. 构建阶段写入 `release.txt` 和后端 revision 环境文件，对 Lingxi 提交、静态资源、必要后端文件和归档内容做一致性检查。
5. workflow 生成 SHA-256 校验文件，并将制品短期保存为本次 run 的 artifact。
6. 只有持有本次生命周期租约的步骤才能创建私有暂存目录；目录创建后立即写入 `PRESERVE`，再接收制品、重新校验摘要，并拒绝绝对路径、目录穿越和非普通归档成员。每个远端步骤还会独立持有服务器 `flock`，避免同一时刻执行两个发布事务。
7. 服务器创建收紧写权限的发布目录，复核后端文件清单，将持久化 `data` 与 `snapshots` 作为外部目录挂入。确认上一版三个指针后，清理无 `PRESERVE` 的旧数字 run staging 目录；回收 release 时保留按修改时间最新 5 份，并额外保护本次 release 与上一版三个指针的目标。
8. 在停服务前使用服务器现有 `/usr/bin/python3` 3.12 为新 backend release 创建独立 `.venv`，从 `requirements-ci.txt` 安装依赖并执行 `pip check`，再以离线 dry-run 逐项复核环境与锁文件版本；安装不使用持久 pip 缓存，也不安装或升级系统包。
9. 只有 release venv 完整、属于当前 release、通过 Python 版本和写权限检查后，workflow 才备份上一版三个指针、systemd 单元与 Nginx 配置。
10. 第一次修改 Nginx 前，workflow 再次确认本次 staging 的 `PRESERVE` 是普通文件。新配置通过语法检查、维护守卫检查并成功重载后，workflow 才创建全局维护标记，验证公网 mutation 已返回 `503`，然后停止 Lingxi 网关与宿主。
11. 在短维护窗口内协调切换 portal、lingxi、backend 三个指针，安装 Lingxi 服务并等待同 SHA 健康；当前连续性恢复最多允许 1800 秒，deploy job 总预算为 60 分钟，并为依赖安装、生产验收和最长 300 秒自动回滚保留余量。
12. 校验 Nginx 路由、生产协议和公网 revision 后移除维护标记，在本次 staging 写入 `DEPLOYED`，再关闭自动回滚 trap 并移除 `PRESERVE`。最终 cleanup 只有在生命周期租约仍属于本次运行时才会删除本次 staging；`DEPLOYED` 会阻止 cleanup 删除已完成但暂时未被 current 指针引用的 release。

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
- staging 回收只删除无保护的旧数字 run 目录；release 回收保留最新 5 份和所有受保护目标，不跟随符号链接，也不触碰持久数据。
- 每个远端步骤都必须获得服务器发布锁，暂存创建、切换和 cleanup 还必须持有与本次 `run_id-run_attempt` 一致的生命周期租约。
- 发布前及服务安装后，`myagent-world.service` 与 `myagent-gateway.service` 的 `DropInPaths` 均为空。
- 无效 token 与默认开发 token 均被拒绝并返回 `401`。
- TLS 证书覆盖 Lingxi 域名，Nginx 双域根目录与 API 代理仍指向预期服务。
- 门户与 Lingxi 均返回 `X-Frame-Options: DENY`，`Server` 响应头不泄露版本号。
- Lingxi 的 `Content-Security-Policy` 包含 `frame-ancestors 'none'` 与 `script-src 'self'`。

## 回滚

切换前失败时，当前三个指针和 Lingxi 服务保持不变。Nginx 已发生前置变更、但尚未进入维护时，workflow 会先恢复并重载备份配置；恢复无法通过语法、重载或活动配置核验时，本次 staging 与 release 会保留，并尽力写入 `/run/hi-veblen-release-preserve` 阻止后续发布和清理。

进入维护或完成切换后失败时，workflow 会尝试恢复上一版 portal、lingxi、backend 指针与备份的 systemd/Nginx 配置，再验证旧服务、旧 revision、维护守卫和公网 `503`。全部恢复门通过后才移除维护与 `PRESERVE` 标记；任一恢复门未通过时保留标记、停止 Lingxi 服务并转入人工恢复。旧 systemd 单元仍可使用 `/opt/myagent/.venv` 共享环境，因此首次采用 release venv 的发布也能回滚到旧版。

最终 cleanup 只处理属于本次生命周期租约的 staging。检测到维护或全局保护标记时，cleanup 会保留 release、staging 和租约，避免迟到步骤破坏人工恢复现场；先前 run 的迟到 cleanup 因租约 owner 不匹配只能跳过。人工恢复必须先核对三个 current 指针、两个 Lingxi 服务、Nginx 活动配置和对应 revision，再按现场结论处理保护标记与租约，不能只删除 `/run/hi-veblen-release-lease` 后重跑。

release 回收不删除共享 venv。每次新 release 建立后，`prune-production-releases.sh` 保留最新 5 份，并额外保护本次 release 和切换前三个 current 指向的 release；受保护目标可能使实际保留数超过 5。该流程使用短维护窗口，不宣称无停机或跨三个文件系统路径的单指令原子性。

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
| 检测到维护、全局保护、生命周期租约或 staging `PRESERVE` 标记 | 在创建或回收 release 前拒绝发布；cleanup 保留仍受保护的现场，待人工核验 |
| 检测到 systemd drop-in | 发布前出现则在创建暂存目录前拒绝；服务安装后仍存在则验证失败并自动回滚。恢复正式单元配置后从头重跑 |
| 制品摘要或归档校验失败 | 拒绝解包，保留当前生产指针 |
| 新 release venv 创建、安装、锁版本复核或 `pip check` 失败 | 在停服务前终止，当前指针、服务和旧共享 venv 均不变 |
| Nginx 前置变更失败 | 尝试恢复备份配置；恢复无法核验时保留 staging `PRESERVE` 并尽力写入全局保护标记，当前 Lingxi 服务保持原运行态 |
| 维护切换后验证失败 | 尝试恢复上一组指针和服务配置；恢复门未全部通过时保留维护现场、停止 Lingxi 服务并转人工恢复 |
| MyWeb API 不健康 | 不通过发布验收，API 由独立维护流程处理 |
| revision 不一致 | 视为发布失败，不手工修改 `release.txt` |
