# 阿里云部署系统 - 使用说明

## 🎉 部署系统已就绪！

所有必需的脚本、配置文件和文档已创建完成。你现在可以将网站部署到阿里云服务器了。

## 📋 已创建的文件

### 核心脚本（scripts/）
- ✅ `build-frontend.sh` - 前端构建脚本
- ✅ `build-backend.sh` - 后端构建脚本
- ✅ `deploy.sh` - 一键部署脚本（最重要）
- ✅ `setup-ssl.sh` - SSL 证书申请脚本
- ✅ `verify-domain.sh` - 域名验证脚本
- ✅ `init-database.sh` - 数据库初始化脚本
- ✅ `init-server.sh` - 服务器初始化脚本
- ✅ `backup.sh` - 数据库备份脚本
- ✅ `monitor.sh` - 服务监控脚本
- ✅ `verify-deployment.sh` - 部署验证脚本
- ✅ `validate-nginx.sh` - Nginx 配置验证脚本

### 配置文件
- ✅ `Dockerfile` - Docker 镜像配置（已优化）
- ✅ `docker-compose.yml` - Docker Compose 配置（已更新）
- ✅ `nginx.conf` - Nginx 配置（已配置 HTTPS、反向代理、性能优化）
- ✅ `.env.example` - 主网站环境变量模板
- ✅ `.env.production` - 主网站生产环境配置
- ✅ `src/admin/backend/.env.example` - 后端环境变量模板
- ✅ `src/admin/backend/.env.production` - 后端生产环境配置
- ✅ `src/admin/backend/src/schema.sql` - 数据库表结构

### CI/CD 配置
- ✅ `.github/workflows/deploy.yml` - GitHub Actions 自动部署工作流

### 文档（docs/）
- ✅ `deployment-guide.md` - 完整部署指南（必读）
- ✅ `domain-setup.md` - 域名配置指南
- ✅ `github-secrets.md` - GitHub Secrets 配置指南
- ✅ `quick-reference.md` - 命令速查表

## 🚀 快速开始

### 方案 A: 本地部署测试（推荐先测试）

```bash
# 1. 确保 Docker 和 Node.js 已安装
docker --version
node --version

# 2. 执行一键部署
bash scripts/deploy.sh

# 3. 访问本地网站
# 主网站: http://localhost
# 管理后台: http://localhost/admin
# 后端 API: http://localhost:3001/api/health
```

### 方案 B: 部署到阿里云服务器

#### 步骤 1: 准备服务器

```bash
# SSH 连接到服务器
ssh root@<你的服务器IP>

# 克隆项目代码
git clone <你的仓库地址>
cd <项目目录>

# 初始化服务器环境
bash scripts/init-server.sh
```

#### 步骤 2: 配置域名

在阿里云域名控制台配置 DNS A 记录：
- 主机记录: @
- 记录值: <你的服务器IP>

详细步骤见：`docs/domain-setup.md`

#### 步骤 3: 验证域名解析

```bash
bash scripts/verify-domain.sh hi-veblen.com <你的服务器IP>
```

#### 步骤 4: 配置环境变量

```bash
# 生成强密码
JWT_SECRET=$(openssl rand -base64 32)

# 编辑后端配置
nano src/admin/backend/.env.production
# 将 JWT_SECRET 替换为上面生成的密码
```

#### 步骤 5: 申请 SSL 证书

```bash
bash scripts/setup-ssl.sh
```

#### 步骤 6: 执行部署

```bash
bash scripts/deploy.sh
```

#### 步骤 7: 验证部署

```bash
bash scripts/verify-deployment.sh hi-veblen.com
```

访问：https://hi-veblen.com

## 📖 详细文档

- **完整部署指南**: `docs/deployment-guide.md`
- **域名配置**: `docs/domain-setup.md`
- **命令速查**: `docs/quick-reference.md`
- **GitHub Actions**: `docs/github-secrets.md`

## ⚙️ 配置说明

### 域名配置
- 当前配置的域名: `hi-veblen.com`
- SSL 证书邮箱: `1243222867@qq.com`

### 管理员账户
- 用户名: `veblen`
- 默认密码: `123456`
- ⚠️ **重要**: 首次登录后必须立即修改密码！

### 端口配置
- HTTP: 80
- HTTPS: 443
- 后端 API: 3001

## 🔧 常用命令

```bash
# 查看服务状态
docker-compose ps
pm2 status

# 查看日志
docker-compose logs nginx
pm2 logs admin-backend

# 重启服务
docker-compose restart
pm2 restart admin-backend

# 备份数据库
bash scripts/backup.sh

# 更新部署
git pull
bash scripts/deploy.sh
```

## 🛠️ 故障排查

### 问题 1: 端口被占用

```bash
# 查看端口占用
sudo netstat -tulpn | grep :80

# 停止占用端口的进程
sudo kill -9 <PID>
```

### 问题 2: Docker 容器无法启动

```bash
# 查看日志
docker-compose logs nginx

# 重新构建
docker-compose build --no-cache
docker-compose up -d
```

### 问题 3: SSL 证书申请失败

确保：
1. 域名已正确解析
2. 端口 80 未被占用
3. 防火墙已开放端口 80

```bash
bash scripts/setup-ssl.sh
```

## 📊 系统架构

```
用户浏览器
    ↓ HTTPS (443)
Nginx 容器 (Docker)
    ↓ 静态文件
前端构建产物 (dist/)
    ↓ API 请求 (/api)
后端服务 (PM2)
    ↓
SQLite 数据库
```

## 🔐 安全提示

1. ✅ 已配置 HTTPS 强制跳转
2. ✅ 已配置安全响应头
3. ✅ 已配置防火墙规则
4. ⚠️ 请修改默认管理员密码
5. ⚠️ 请配置 SSH 密钥认证
6. ⚠️ 请定期备份数据库

## 📈 下一步

1. **测试部署**: 先在本地测试部署流程
2. **配置服务器**: 初始化阿里云服务器环境
3. **配置域名**: 设置 DNS 解析
4. **申请证书**: 使用 Let's Encrypt 申请 SSL 证书
5. **执行部署**: 运行一键部署脚本
6. **配置 CI/CD**: 设置 GitHub Actions 自动部署

## 💡 提示

- 所有脚本都在 Windows 系统上创建，在 Linux 服务器上执行时会自动适配
- 脚本使用 Bash，确保服务器已安装 Bash
- 首次部署建议先在测试环境验证
- 遇到问题请查看日志文件

## 📞 获取帮助

如果遇到问题：
1. 查看日志：`logs/nginx/error.log`、`pm2 logs`
2. 查看文档：`docs/deployment-guide.md`
3. 查看命令：`docs/quick-reference.md`

## ✨ 功能特性

- ✅ 一键部署
- ✅ 自动备份
- ✅ 健康监控
- ✅ SSL 自动续期
- ✅ 零停机部署（蓝绿部署）
- ✅ CI/CD 自动化
- ✅ 完整文档

---

**祝部署顺利！** 🎊
