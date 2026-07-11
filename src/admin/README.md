# MyWeb Admin

`src/admin/` 是门户内容管理子系统，由 Vue 管理端和 Express/SQLite API 组成。它与 Lingxi 用户网关完全分离，也不在双站静态发布 workflow 中替换生产进程。

## 目录

| 路径 | 职责 |
| --- | --- |
| `frontend/` | Vue 3 + Element Plus 管理界面，本地端口 `5174` |
| `backend/` | Express + TypeScript + SQLite API，本地端口 `3001` |
| `file/` | 本地上传与履历运行数据，不接收新的 Git 跟踪文件 |

## 本地运行

环境要求：Node.js `>=20.19 || >=22.12`。

后端不会自动读取仓库中的生产环境文件。启动前应通过进程环境注入独立的高熵凭据；不要使用 README、测试或 Git 历史中的示例值。

```powershell
Set-Location src/admin/backend
npm ci

$env:NODE_ENV='development'
$env:PORT='3001'
$env:JWT_SECRET='replace-with-a-long-random-local-secret'
$env:ADMIN_USERNAME='replace-with-a-local-admin-name'
$env:ADMIN_PASSWORD='replace-with-a-long-random-local-password'

npm run build
npm run dev
```

另开终端启动管理端：

```powershell
Set-Location src/admin/frontend
npm ci
npm run dev
```

管理端把 `/api` 代理到 `http://localhost:3001`。首次初始化会创建管理员；非测试环境缺少合格账号或高熵密码时，后端会直接拒绝初始化。

## 验证

```powershell
Set-Location src/admin/frontend
npm run type-check
npm run test:run
npm run build
npm audit

Set-Location ../backend
npm run build
npm audit --omit=dev
```

Admin frontend 的 type-check、34 项测试和 build 属于严格 CI。Backend 的生产构建使用 `tsconfig.build.json`，排除历史测试文件，并校验 `dist/app.js`；旧 Jest 套件仍在根 workflow 的 `Legacy diagnostics (non-blocking)` 中完整展示。

当前依赖残留和关闭条件见 [已知质量边界](../../docs/KNOWN_ISSUES.md)。

## 数据与安全

- `.env*` 默认忽略，只允许跟踪无敏感值的 `.env.example`。
- `backend/data/**/*.db*`、上传文件、日志和构建目录都是运行数据，不进入 Git。
- JWT secret 与管理员密码必须是不同的随机值；轮换管理员密码时应同时使现有后台会话失效。
- 文件上传、数据库备份和凭据轮换需要受控维护窗口，日志不得回显用户内容或 secret。
- 公开 Git 历史净化属于破坏性仓库维护，不能由普通发布脚本顺带执行。

## 生产边界

门户与 Lingxi 的唯一发布入口是根仓库 [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml)。该 workflow 只检查 MyWeb API 的健康状态，不部署 Admin frontend/backend。

Admin API 由独立 PM2 进程维护。任何生产升级都必须先备份运行数据、验证 `npm run build`、记录当前 revision，并准备可恢复的上一版目录；具体维护窗口由仓库所有者单独批准。权威拓扑与双站回滚说明见 [生产发布与回滚](../../docs/PRODUCTION_DEPLOYMENT.md)。
