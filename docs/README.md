# hi-veblen 文档索引

生产行为以 [发布 workflow](../.github/workflows/deploy.yml) 为可执行真相源，[生产发布与回滚](./PRODUCTION_DEPLOYMENT.md) 解释它的操作边界。旧的 Docker、Vercel、Webhook、手工上传和服务器速查文档已经移除，避免并行维护多套互相冲突的发布方式。

## 当前文档

| 文档 | 内容 | 读者 |
| --- | --- | --- |
| [生产发布与回滚](./PRODUCTION_DEPLOYMENT.md) | 双仓构建、不可变制品、维护切换、验证与回滚 | 发布维护者 |
| [已知质量边界](./KNOWN_ISSUES.md) | Legacy 诊断、游戏风险、依赖残留与关闭条件 | 维护者 |
| [安全策略](../SECURITY.md) | 私密漏洞报告、支持范围与凭据处理 | 使用者与安全研究者 |
| [开发规范](./DEVELOPMENT_STANDARDS.md) | Vue、TypeScript、样式、测试和提交约定 | 开发者 |
| [视觉系统设计](./next-generation-sci-fi-terminal-portfolio-design.md) | 展厅信息架构、视觉语言、动效与降级策略 | 设计与前端开发者 |
| [彩蛋游戏文档](./GAME_DOCUMENTATION.md) | 游戏入口、操作、引擎结构与扩展方式 | 使用者与开发者 |
| [亮色主题对比度验证](./contrast-verification.md) | 对比度口径、颜色组合与复核方法 | 前端开发者 |
| [端到端测试](../e2e/README.md) | Playwright 测试结构与运行方式 | 开发者 |

## 历史材料

以下文件保留设计演进和迁移背景，不代表当前生产状态，也不能替代发布 workflow：

- [实施路线图](./IMPLEMENTATION_ROADMAP.md)
- [项目提升方案](./IMPROVEMENT_PLAN.md)
- [迁移指南](./MIGRATION_GUIDE.md)

## 维护规则

- 发布链路变更时，同步修改 workflow 与 `PRODUCTION_DEPLOYMENT.md`。
- 文档不记录服务器地址、账号、密钥、生产环境变量值或用户数据。
- `.env`、数据库、上传文件和运行日志属于本地或生产运行数据，不进入 Git。
- 测试结果按阻断发布门和 legacy diagnostics 分开描述，不能把非阻断任务当作全量通过。
