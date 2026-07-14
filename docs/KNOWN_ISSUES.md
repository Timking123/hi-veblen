# 已知质量边界

本页记录严格发布门之外仍然存在的工程债。严格门通过不代表这些问题已经解决，legacy 失败也不自动否定对应 revision 已单独通过的受限门禁。

## 2026-07-11 全量诊断

以下 legacy 计数来自以 MyWeb `f766147` 为基础、精确暂存 93 个任务文件的隔离快照，验证时间为 2026-07-11 21:33~21:49 +08。`f766147` 是这组计数的快照基线，不是当前 `main` HEAD。临时 worktree 只包含 staged index，明确排除了游戏、简历、Contact/Navigation、MCP、本机配置和其他用户脏改。ESLint、根项目全量单测与 Admin backend legacy Jest 均在该快照重跑；Home、Admin frontend、生产构建、凭据失败关闭和 Portal Chromium E2E 也在同一快照验证。

这组 2026-07-11 快照当时的生产证据为 portal `d099480` 的 [CI run `29161853006`](https://github.com/Timking123/hi-veblen/actions/runs/29161853006)、Lingxi `014bdc1` 的 [CI run `29159820620`](https://github.com/Timking123/Lingxi/actions/runs/29159820620)，以及 [production workflow `29162079426`](https://github.com/Timking123/hi-veblen/actions/runs/29162079426)，三者均为 success。当前生产已推进到 portal `3b0f010a0fb495504d0c3ffa01006f8bc33a8475`、Lingxi `55255df61ae6aef89ce5d8e4d46ba637ca3cd632`。对应 [Portal CI run `29301865888` attempt 2](https://github.com/Timking123/hi-veblen/actions/runs/29301865888/attempts/2) 四路 success；attempt 1 因 GitHub 托管 runner 访问 APT 镜像超时中断，不是项目代码失败。[Lingxi CI run `29301558361`](https://github.com/Timking123/Lingxi/actions/runs/29301558361) 三路 success，[production workflow `29302920011`](https://github.com/Timking123/hi-veblen/actions/runs/29302920011) 构建 3 分 30 秒、部署 1 分 50 秒且均为 success。构建和部署日志的六项异常搜索均为 0 命中，匿名公网协议探针 24/24 通过，最终证据归档在 `E:\MyAgent Test\P6生产浏览器验收\2026-07-14_1124_P6短会话鉴权优化最终生产复验\`。revision 的推进不改变下表 legacy 计数的历史快照口径。CI 页面上的 `Legacy diagnostics (non-blocking)` success 是非阻断包装的结果：它表示诊断命令已执行并保留结果，不表示下表三个 legacy 检查已经通过。

| 检查 | 结果 | 当前处理 |
| --- | --- | --- |
| ESLint | `227 errors / 4 warnings`，退出 1 | 保留在 `Legacy diagnostics (non-blocking)`，不得宣称全量 lint 通过 |
| 根项目全量单测 | `2085/2310` 通过，203 失败，其余 22 未计入通过/失败，退出 1 | 不作为当前发布证明；按失败套件分批修复 |
| Admin backend legacy Jest | `79/95` 通过，16 失败；`26/28` suites 失败，退出 1 | 初始化与套件级欠债保留在 non-blocking job |
| 根项目类型检查 | 通过 | `Release gate` 阻断项 |
| Home 关键契约 | `4/4` 通过 | `Release gate` 阻断项 |
| Admin frontend | type-check、`34/34`、production build 均通过 | `Admin quality` 阻断项 |
| Admin backend 发布门 | production build、产物边界、PM2/db:init/一键部署环境加载、占位凭据失败关闭均通过 | `Admin quality` 阻断项 |
| Portal Chromium E2E | `3/3` 通过 | `Portal E2E` 阻断项 |

此前工作树上的 `0 errors / 55 warnings` 与 `1495/1570` 是在后来明确排除的用户脏改存在时得到，不能代表本次提交，现由上表 staged 结果取代。legacy 失败没有覆盖 Lingxi 角色创建，也没有否定门户首页、Admin 发布门或入口 E2E，但意味着不能宣称全站 lint、全量单测或 Admin legacy Jest 已通过。

## 游戏子系统

- 响应式画布可以缩小到运行时尺寸，部分子弹、导弹和补给实体仍按固定 `1200x900` 边界销毁。实体可能离开可视区后继续存活。
- 游戏主循环尚未隔离渲染异常。单次 Canvas 绘制异常可能终止后续帧。
- 当前 Portal E2E 只覆盖 Legacy OS 与游戏规则入口，不启动真实游戏循环，因此以上两项需要独立修复和浏览器回归后才能关闭。

相关游戏文件含有另一批尚未提交的开发改动，本轮发布收口不代替其所有者提交，也不把这些改动混入 README、安全与 Lingxi 发布提交。

## 依赖与构建

- 门户与 Admin frontend 的 `npm audit` 当前为 0。
- Admin backend 仍有 2 个 moderate，来自 ExcelJS 的间接 `uuid`。npm 只提供降级到 ExcelJS 3.4 的破坏性自动修复，本轮没有使用 `--force`；应在替换或升级导出链后重新评估。
- Admin frontend 构建仍报告 Sass `@import`、循环分包和大 chunk 警告，不影响当前构建退出码，但需要在性能专项中处理。
- Home 契约测试仍提示 `caniuse-lite` 数据已过期约 6 个月；它不影响当前退出码，但应在独立依赖维护提交中更新并复跑浏览器门禁。
- GitHub 托管 runner 会把仍以 Node.js 20 为目标的固定 SHA Actions 强制运行在 Node.js 24，并产生弃用警告。当前 CI 使用 Node.js 22 验证项目代码且结果通过；两者属于不同运行层。待相关 Actions 发布原生 Node.js 24 版本后再更新固定 SHA，不启用退回不安全 Node.js 20 的临时开关。

## MyWeb API 运维缺口

双站发布 workflow 只检查 PM2 进程 `:3001` 的 `/api/health`，不安装 MyWeb API 依赖、不执行数据库迁移，也不重启或回滚该进程。仓库目前没有与双站 workflow 等价的自动维护和回滚入口；任何 MyWeb API 变更都需要单独获批的维护方案、数据备份、迁移步骤和回滚验证，不能写成已被双站发布覆盖。

## 安全维护边界

- `myagent-world.service` 与 `myagent-gateway.service` 当前没有配置专用 `User`/`Group`，仍以 root 运行；`systemd-analyze security` 对两个单元的评分均为 `9.0 UNSAFE`。现有 `data`、`snapshots`、缓存、环境文件和 release venv 含 root-owned 路径，专用用户迁移需要独立维护窗口、权限迁移和回滚演练，不能只改 systemd 单元。
- 后台生产口令尚未轮换，现有后台会话也没有统一失效。口令轮换、会话失效和依赖它们的运维验证需要安排同一受控窗口。
- 当前树已经停止跟踪环境文件和数据库运行数据，并补齐递归 ignore。Git 历史净化与强制同步仍未执行；在仓库所有者明确授权并安排同步窗口前，不强推历史。
