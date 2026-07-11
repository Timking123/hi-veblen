# 已知质量边界

本页记录严格发布门之外仍然存在的工程债。它们不会被 `continue-on-error` 包装成全量通过，也不能用来推翻已经独立通过的门户与 Lingxi 发布路径。

## 2026-07-11 全量诊断

以下 legacy 计数以 MyWeb `main` HEAD `f766147` 上精确暂存的 93 个任务文件为口径，验证时间为 2026-07-11 21:33~21:49 +08。临时 worktree 只包含 staged index，明确排除了游戏、简历、Contact/Navigation、MCP、本机配置和其他用户脏改。ESLint、根项目全量单测与 Admin backend legacy Jest 均在该快照重跑；Home、Admin frontend、生产构建、凭据失败关闭和 Portal Chromium E2E 也在同一快照验证。

当前生产证据更新为 portal `1c42c8e` 的 [CI run `29158269214`](https://github.com/Timking123/hi-veblen/actions/runs/29158269214)、Lingxi `60d0b08` 的 [CI run `29158252370`](https://github.com/Timking123/Lingxi/actions/runs/29158252370)，以及 [production workflow `29158517614`](https://github.com/Timking123/hi-veblen/actions/runs/29158517614)，三者均为 success。CI 页面上的 `Legacy diagnostics (non-blocking)` success 是非阻断包装的结果：它表示诊断命令已执行并保留结果，不表示下表三个 legacy 检查已经通过。

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

## MyWeb API 运维缺口

双站发布 workflow 只检查 PM2 进程 `:3001` 的 `/api/health`，不安装 MyWeb API 依赖、不执行数据库迁移，也不重启或回滚该进程。仓库目前没有与双站 workflow 等价的自动维护和回滚入口；任何 MyWeb API 变更都需要单独获批的维护方案、数据备份、迁移步骤和回滚验证，不能写成已被双站发布覆盖。

## 安全维护边界

当前树已经停止跟踪环境文件和数据库运行数据，并补齐递归 ignore。Git 历史净化、凭据轮换以及现有后台会话失效属于独立的受控维护动作；在仓库所有者明确授权并安排同步窗口前，不执行历史强推或生产凭据变更。
