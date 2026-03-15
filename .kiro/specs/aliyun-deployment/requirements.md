# 需求文档：阿里云部署系统

## 简介

本文档定义了将 Vue3 个人作品集网站部署到阿里云服务器的完整需求，包括前端静态资源部署、后端 API 服务部署、域名配置、HTTPS 证书管理以及自动化部署流程。

## 术语表

- **Deployment_System**：部署系统，负责将应用程序部署到阿里云服务器的整体系统
- **Frontend_Builder**：前端构建器，负责构建 Vue3 前端应用
- **Backend_Builder**：后端构建器，负责构建 Express 后端服务
- **Docker_Manager**：Docker 管理器，负责管理 Docker 容器和镜像
- **Nginx_Configurator**：Nginx 配置器，负责配置 Nginx 反向代理和静态文件服务
- **SSL_Manager**：SSL 管理器，负责申请和管理 SSL 证书
- **Domain_Configurator**：域名配置器，负责配置域名解析和绑定
- **CI_CD_Pipeline**：持续集成/持续部署流水线，负责自动化部署流程
- **Health_Monitor**：健康监控器，负责监控服务运行状态
- **Backup_Manager**：备份管理器，负责数据备份和恢复
- **Admin_Backend**：管理后台后端服务，基于 Express + SQLite
- **Admin_Frontend**：管理后台前端应用，基于 Vue3
- **Main_Frontend**：主网站前端应用，个人作品集网站
- **ECS_Server**：阿里云弹性计算服务器
- **Valid_Domain**：有效域名，符合 DNS 规范的域名字符串
- **SSL_Certificate**：SSL 证书，用于 HTTPS 加密的数字证书
- **Deployment_Package**：部署包，包含构建产物和配置文件的压缩包

## 需求

### 需求 1：前端应用构建

**用户故事：** 作为开发者，我希望能够构建前端应用，以便生成可部署的静态资源。

#### 验收标准

1. WHEN 执行构建命令时，THE Frontend_Builder SHALL 编译 Vue3 源代码为优化的静态资源
2. WHEN 构建完成时，THE Frontend_Builder SHALL 生成包含 HTML、CSS、JavaScript 和静态资源的 dist 目录
3. WHEN 构建过程中出现错误时，THE Frontend_Builder SHALL 输出详细的错误信息并终止构建
4. THE Frontend_Builder SHALL 应用代码压缩、Tree Shaking 和资源优化
5. WHEN 构建主网站前端时，THE Frontend_Builder SHALL 在根目录执行 npm run build
6. WHEN 构建管理后台前端时，THE Frontend_Builder SHALL 在 src/admin/frontend 目录执行 npm run build

### 需求 2：后端应用构建

**用户故事：** 作为开发者，我希望能够构建后端应用，以便生成可部署的 Node.js 服务。

#### 验收标准

1. WHEN 执行构建命令时，THE Backend_Builder SHALL 编译 TypeScript 源代码为 JavaScript
2. WHEN 构建完成时，THE Backend_Builder SHALL 生成包含编译后代码的 dist 目录
3. WHEN 构建过程中出现类型错误时，THE Backend_Builder SHALL 输出错误信息并终止构建
4. THE Backend_Builder SHALL 保留必要的依赖包信息用于生产环境安装
5. WHEN 构建管理后台后端时，THE Backend_Builder SHALL 在 src/admin/backend 目录执行 npm run build

### 需求 3：Docker 容器化部署

**用户故事：** 作为运维人员，我希望使用 Docker 部署应用，以便实现环境一致性和便捷管理。

#### 验收标准

1. WHEN 构建 Docker 镜像时，THE Docker_Manager SHALL 使用多阶段构建优化镜像大小
2. WHEN Docker 镜像构建完成时，THE Docker_Manager SHALL 包含 Nginx、构建产物和配置文件
3. WHEN 启动容器时，THE Docker_Manager SHALL 映射端口 80 和 443 到宿主机
4. THE Docker_Manager SHALL 配置容器健康检查，每 30 秒检查一次服务状态
5. WHEN 容器健康检查失败 3 次时，THE Docker_Manager SHALL 标记容器为不健康状态
6. THE Docker_Manager SHALL 支持通过 docker-compose 管理多个服务容器
7. WHEN 容器停止时，THE Docker_Manager SHALL 保留数据卷中的持久化数据

### 需求 4：Nginx 反向代理配置

**用户故事：** 作为运维人员，我希望配置 Nginx 反向代理，以便实现前后端分离和负载均衡。

#### 验收标准

1. THE Nginx_Configurator SHALL 配置静态文件服务，将请求路由到前端构建产物
2. WHEN 请求路径以 /api 开头时，THE Nginx_Configurator SHALL 代理请求到后端服务端口 3001
3. THE Nginx_Configurator SHALL 配置 SPA 路由支持，所有未匹配路径返回 index.html
4. THE Nginx_Configurator SHALL 启用 Gzip 压缩，压缩级别设置为 6
5. THE Nginx_Configurator SHALL 为静态资源设置缓存策略，缓存时间为 1 年
6. THE Nginx_Configurator SHALL 添加安全响应头：X-Frame-Options、X-Content-Type-Options、X-XSS-Protection
7. WHEN 配置文件语法错误时，THE Nginx_Configurator SHALL 在测试阶段报错并拒绝重载
8. THE Nginx_Configurator SHALL 配置访问日志和错误日志路径

### 需求 5：SSL 证书管理

**用户故事：** 作为运维人员，我希望自动申请和管理 SSL 证书，以便为网站启用 HTTPS。

#### 验收标准

1. WHEN 提供有效域名时，THE SSL_Manager SHALL 使用 Let's Encrypt 申请免费 SSL 证书
2. WHEN 证书申请成功时，THE SSL_Manager SHALL 将证书文件保存到指定路径
3. WHEN 证书距离过期少于 30 天时，THE SSL_Manager SHALL 自动续期证书
4. WHEN 证书续期成功时，THE SSL_Manager SHALL 重载 Nginx 配置使新证书生效
5. IF 证书申请失败，THEN THE SSL_Manager SHALL 记录详细错误信息并保持 HTTP 模式运行
6. THE SSL_Manager SHALL 支持通过 Certbot 管理证书生命周期
7. THE SSL_Manager SHALL 配置证书自动续期定时任务

### 需求 6：域名配置

**用户故事：** 作为运维人员，我希望配置域名解析，以便用户通过域名访问网站。

#### 验收标准

1. WHEN 提供域名和服务器 IP 时，THE Domain_Configurator SHALL 验证域名格式的有效性
2. THE Domain_Configurator SHALL 提供域名 DNS 配置指南，包括 A 记录配置说明
3. WHEN 域名解析生效时，THE Domain_Configurator SHALL 验证域名能够正确解析到服务器 IP
4. THE Domain_Configurator SHALL 支持配置主域名和子域名（如 admin.domain.com）
5. WHEN 域名未解析或解析错误时，THE Domain_Configurator SHALL 输出诊断信息

### 需求 7：环境变量管理

**用户故事：** 作为开发者，我希望管理不同环境的配置，以便在开发、测试和生产环境使用不同的配置。

#### 验收标准

1. THE Deployment_System SHALL 支持通过 .env 文件管理环境变量
2. THE Deployment_System SHALL 提供 .env.example 模板文件，包含所有必需的配置项
3. WHEN 部署到生产环境时，THE Deployment_System SHALL 使用 .env.production 配置
4. THE Deployment_System SHALL 验证必需的环境变量是否已设置
5. IF 缺少必需的环境变量，THEN THE Deployment_System SHALL 输出错误信息并终止部署
6. THE Deployment_System SHALL 保护敏感配置信息，不将 .env 文件提交到版本控制

### 需求 8：数据库初始化和迁移

**用户故事：** 作为开发者，我希望自动初始化数据库，以便在首次部署时创建必要的表结构。

#### 验收标准

1. WHEN 首次部署时，THE Deployment_System SHALL 执行数据库初始化脚本
2. WHEN 数据库文件不存在时，THE Deployment_System SHALL 创建新的 SQLite 数据库文件
3. WHEN 数据库初始化完成时，THE Deployment_System SHALL 创建所有必需的表和索引
4. THE Deployment_System SHALL 创建默认管理员账户，密码需在首次登录后修改
5. WHEN 数据库已存在时，THE Deployment_System SHALL 跳过初始化，保留现有数据
6. THE Deployment_System SHALL 设置数据库文件的正确权限，确保应用可读写

### 需求 9：进程管理

**用户故事：** 作为运维人员，我希望使用进程管理器管理后端服务，以便实现自动重启和监控。

#### 验收标准

1. THE Deployment_System SHALL 使用 PM2 管理 Node.js 后端进程
2. WHEN 后端服务启动时，THE Deployment_System SHALL 通过 PM2 启动进程并命名为 admin-api
3. WHEN 后端进程崩溃时，THE Deployment_System SHALL 自动重启进程
4. WHEN 后端进程内存超过 500MB 时，THE Deployment_System SHALL 自动重启进程
5. THE Deployment_System SHALL 配置 PM2 开机自启动
6. THE Deployment_System SHALL 提供查看进程状态和日志的命令
7. THE Deployment_System SHALL 限制进程最大重启次数，防止无限重启循环

### 需求 10：健康检查和监控

**用户故事：** 作为运维人员，我希望监控服务健康状态，以便及时发现和处理故障。

#### 验收标准

1. THE Health_Monitor SHALL 提供健康检查端点 /api/health
2. WHEN 服务正常运行时，THE Health_Monitor SHALL 返回 HTTP 200 状态码和 {"status":"ok"}
3. THE Health_Monitor SHALL 每 30 秒执行一次健康检查
4. WHEN 健康检查连续失败 3 次时，THE Health_Monitor SHALL 记录告警日志
5. THE Health_Monitor SHALL 监控后端进程的 CPU 和内存使用率
6. THE Health_Monitor SHALL 监控磁盘空间使用情况
7. WHEN 磁盘空间使用率超过 80% 时，THE Health_Monitor SHALL 记录警告日志

### 需求 11：日志管理

**用户故事：** 作为运维人员，我希望集中管理应用日志，以便排查问题和分析访问情况。

#### 验收标准

1. THE Deployment_System SHALL 配置应用日志输出到指定目录
2. THE Deployment_System SHALL 分别记录访问日志和错误日志
3. THE Deployment_System SHALL 配置日志轮转，每天生成新的日志文件
4. THE Deployment_System SHALL 保留最近 7 天的日志文件
5. WHEN 日志文件超过 7 天时，THE Deployment_System SHALL 自动删除旧日志
6. THE Deployment_System SHALL 压缩归档的日志文件以节省空间
7. THE Deployment_System SHALL 记录每个请求的时间戳、IP 地址、请求路径和响应状态

### 需求 12：数据备份和恢复

**用户故事：** 作为运维人员，我希望定期备份数据，以便在数据丢失时能够恢复。

#### 验收标准

1. THE Backup_Manager SHALL 每天凌晨 2 点自动备份 SQLite 数据库文件
2. WHEN 执行备份时，THE Backup_Manager SHALL 将数据库文件复制到备份目录，文件名包含时间戳
3. THE Backup_Manager SHALL 保留最近 30 天的备份文件
4. WHEN 备份文件超过 30 天时，THE Backup_Manager SHALL 自动删除旧备份
5. THE Backup_Manager SHALL 提供手动备份命令
6. THE Backup_Manager SHALL 提供数据恢复命令，从指定备份文件恢复数据库
7. WHEN 执行恢复操作时，THE Backup_Manager SHALL 先备份当前数据库再执行恢复

### 需求 13：部署脚本自动化

**用户故事：** 作为开发者，我希望使用自动化脚本部署应用，以便减少手动操作和人为错误。

#### 验收标准

1. THE Deployment_System SHALL 提供一键部署脚本 deploy.sh
2. WHEN 执行部署脚本时，THE Deployment_System SHALL 依次执行构建、上传、配置和启动步骤
3. WHEN 任何步骤失败时，THE Deployment_System SHALL 停止部署并输出错误信息
4. THE Deployment_System SHALL 在部署前备份当前运行的版本
5. THE Deployment_System SHALL 提供回滚脚本，快速恢复到上一个版本
6. THE Deployment_System SHALL 在部署完成后执行健康检查验证部署成功
7. THE Deployment_System SHALL 输出部署进度信息，包括当前步骤和完成百分比

### 需求 14：CI/CD 流水线集成

**用户故事：** 作为开发者，我希望集成 CI/CD 流水线，以便在代码提交后自动部署到服务器。

#### 验收标准

1. WHERE 使用 GitHub Actions，THE CI_CD_Pipeline SHALL 在代码推送到 main 分支时触发部署
2. WHEN 流水线触发时，THE CI_CD_Pipeline SHALL 执行代码检查、测试和构建步骤
3. WHEN 所有测试通过时，THE CI_CD_Pipeline SHALL 构建 Docker 镜像
4. WHEN Docker 镜像构建成功时，THE CI_CD_Pipeline SHALL 推送镜像到镜像仓库
5. WHEN 镜像推送成功时，THE CI_CD_Pipeline SHALL 通过 SSH 连接到服务器执行部署
6. IF 任何步骤失败，THEN THE CI_CD_Pipeline SHALL 停止流水线并发送失败通知
7. WHEN 部署成功时，THE CI_CD_Pipeline SHALL 发送成功通知

### 需求 15：安全加固

**用户故事：** 作为安全管理员，我希望加固服务器安全，以便防止常见的安全威胁。

#### 验收标准

1. THE Deployment_System SHALL 配置防火墙，仅开放必要的端口（22、80、443）
2. THE Deployment_System SHALL 禁用 SSH 密码登录，仅允许密钥认证
3. THE Deployment_System SHALL 配置 fail2ban 防止暴力破解攻击
4. THE Deployment_System SHALL 定期更新系统安全补丁
5. THE Deployment_System SHALL 限制后端 API 的请求频率，防止 DDoS 攻击
6. THE Deployment_System SHALL 配置 HTTPS 强制跳转，禁止 HTTP 访问
7. THE Deployment_System SHALL 使用强密码策略，要求管理员密码至少 12 位且包含大小写字母、数字和特殊字符

### 需求 16：性能优化

**用户故事：** 作为运维人员，我希望优化服务器性能，以便在有限资源下提供良好的用户体验。

#### 验收标准

1. THE Deployment_System SHALL 配置 Nginx 工作进程数等于 CPU 核心数
2. THE Deployment_System SHALL 启用 HTTP/2 协议提升传输效率
3. THE Deployment_System SHALL 配置浏览器缓存策略，减少重复请求
4. THE Deployment_System SHALL 启用 Gzip 压缩，减少传输数据量
5. THE Deployment_System SHALL 限制 Node.js 进程最大内存为 512MB
6. THE Deployment_System SHALL 配置 SQLite 使用 WAL 模式提升并发性能
7. THE Deployment_System SHALL 定期执行 SQLite VACUUM 操作清理碎片

### 需求 17：部署文档

**用户故事：** 作为新运维人员，我希望有详细的部署文档，以便快速了解部署流程和维护操作。

#### 验收标准

1. THE Deployment_System SHALL 提供完整的部署指南文档
2. THE Deployment_System SHALL 在文档中说明服务器环境要求和前置依赖
3. THE Deployment_System SHALL 在文档中提供分步骤的部署说明，包含所有必要的命令
4. THE Deployment_System SHALL 在文档中提供常见问题排查指南
5. THE Deployment_System SHALL 在文档中提供维护操作说明，包括更新、备份和回滚
6. THE Deployment_System SHALL 在文档中提供性能监控和日志查看方法
7. THE Deployment_System SHALL 在文档中提供安全配置建议

### 需求 18：多环境支持

**用户故事：** 作为开发者，我希望支持多个部署环境，以便在测试环境验证后再部署到生产环境。

#### 验收标准

1. THE Deployment_System SHALL 支持开发、测试和生产三种环境配置
2. WHEN 指定部署环境时，THE Deployment_System SHALL 加载对应环境的配置文件
3. THE Deployment_System SHALL 为不同环境使用不同的域名或端口
4. THE Deployment_System SHALL 为不同环境使用独立的数据库文件
5. THE Deployment_System SHALL 在测试环境启用详细日志，在生产环境使用精简日志
6. THE Deployment_System SHALL 提供环境切换命令，快速切换运行环境

### 需求 19：零停机部署

**用户故事：** 作为运维人员，我希望实现零停机部署，以便在更新应用时不影响用户访问。

#### 验收标准

1. WHEN 部署新版本时，THE Deployment_System SHALL 先启动新版本容器
2. WHEN 新版本容器健康检查通过时，THE Deployment_System SHALL 将流量切换到新容器
3. WHEN 流量切换完成时，THE Deployment_System SHALL 停止旧版本容器
4. IF 新版本健康检查失败，THEN THE Deployment_System SHALL 保持旧版本运行并回滚部署
5. THE Deployment_System SHALL 在部署过程中保持至少一个健康的容器实例运行
6. THE Deployment_System SHALL 提供流量切换的等待时间配置，默认等待 10 秒

### 需求 20：部署验证

**用户故事：** 作为开发者，我希望在部署完成后自动验证，以便确认部署成功且功能正常。

#### 验收标准

1. WHEN 部署完成时，THE Deployment_System SHALL 执行自动化验证测试
2. THE Deployment_System SHALL 验证前端页面能够正常加载，返回 HTTP 200 状态码
3. THE Deployment_System SHALL 验证后端健康检查端点返回正常状态
4. THE Deployment_System SHALL 验证 HTTPS 证书有效且未过期
5. THE Deployment_System SHALL 验证数据库连接正常
6. THE Deployment_System SHALL 验证静态资源能够正常访问
7. IF 任何验证失败，THEN THE Deployment_System SHALL 输出详细错误信息并标记部署为失败状态
