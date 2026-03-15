# 阿里云部署指南

## 概述

本指南将帮助你将 Vue3 个人作品集网站部署到阿里云 ECS 服务器。

## 服务器要求

- **操作系统**: Ubuntu 20.04+ 或 CentOS 7+
- **内存**: 至少 2GB
- **磁盘**: 至少 20GB
- **网络**: 公网 IP 地址

## 部署步骤

### 1. 准备服务器

#### 1.1 购买阿里云 ECS 服务器

1. 登录阿里云控制台
2. 选择"云服务器 ECS"
3. 创建实例，选择配置：
   - 地域：根据需要选择
   - 实例规格：2核2GB 或更高
   - 镜像：Ubuntu 20.04 64位
   - 网络：分配公网 IP
   - 安全组：开放 22、80、443 端口

#### 1.2 配置 SSH 密钥登录

```bash
# 在本地生成 SSH 密钥（如果还没有）
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# 将公钥复制到服务器
ssh-copy-id root@your-server-ip

# 测试连接
ssh root@your-server-ip
```

### 2. 初始化服务器环境

连接到服务器后，执行以下命令：

```bash
# 克隆项目代码
git clone https://github.com/your-username/your-repo.git
cd your-repo

# 执行服务器初始化脚本
bash scripts/init-server.sh
```

这个脚本会自动安装：
- Docker 和 Docker Compose
- Node.js 18
- PM2 进程管理器
- Certbot SSL 证书工具
- 其他必需工具

### 3. 配置域名

#### 3.1 配置 DNS 解析

在域名服务商控制台（如阿里云域名）配置 A 记录：

```
类型: A
主机记录: @
记录值: <你的服务器公网IP>
TTL: 600
```

#### 3.2 验证域名解析

```bash
# 验证域名解析
bash scripts/verify-domain.sh hi-veblen.com <你的服务器IP>
```

等待 DNS 解析生效（通常 5-10 分钟）。

### 4. 配置环境变量

#### 4.1 配置后端环境变量

编辑 `src/admin/backend/.env.production`：

```bash
# 生成强密码（至少 32 位）
JWT_SECRET=$(openssl rand -base64 32)

# 编辑配置文件
nano src/admin/backend/.env.production
```

**必须修改的配置**：
- `JWT_SECRET`: 替换为上面生成的强密码
- `ADMIN_PASSWORD`: 建议修改默认密码

#### 4.2 配置前端环境变量

编辑 `.env.production`，确认域名配置正确：

```bash
VITE_SITE_URL=https://hi-veblen.com
VITE_API_BASE_URL=/api
```

### 5. 申请 SSL 证书

```bash
# 申请 Let's Encrypt 免费证书
bash scripts/setup-ssl.sh
```

这个脚本会：
- 安装 Certbot
- 申请 SSL 证书
- 配置自动续期（每天凌晨 2 点检查）

### 6. 执行部署

```bash
# 一键部署
bash scripts/deploy.sh
```

部署脚本会自动：
1. 检查环境
2. 备份当前版本
3. 构建前端和后端
4. 构建 Docker 镜像
5. 初始化数据库
6. 启动服务
7. 执行健康检查

### 7. 验证部署

```bash
# 验证部署
bash scripts/verify-deployment.sh hi-veblen.com
```

或手动访问：
- 主网站: https://hi-veblen.com
- 管理后台: https://hi-veblen.com/admin
- 后端 API: https://hi-veblen.com/api/health

## 常用命令

### 查看服务状态

```bash
# 查看 Docker 容器状态
docker-compose ps

# 查看 PM2 进程状态
pm2 status

# 查看 Nginx 日志
docker-compose logs nginx

# 查看后端日志
pm2 logs admin-backend
```

### 重启服务

```bash
# 重启 Nginx 容器
docker-compose restart nginx

# 重启后端服务
pm2 restart admin-backend

# 重启所有服务
docker-compose restart && pm2 restart all
```

### 更新部署

```bash
# 拉取最新代码
git pull

# 重新部署
bash scripts/deploy.sh
```

## 故障排查

### 问题 1: 端口被占用

```bash
# 查看端口占用
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443

# 停止占用端口的进程
sudo kill -9 <PID>
```

### 问题 2: Docker 容器无法启动

```bash
# 查看容器日志
docker-compose logs nginx

# 重新构建镜像
docker-compose build --no-cache
docker-compose up -d
```

### 问题 3: SSL 证书申请失败

确保：
1. 域名已正确解析到服务器 IP
2. 端口 80 未被占用
3. 防火墙已开放端口 80

```bash
# 重新申请证书
bash scripts/setup-ssl.sh
```

### 问题 4: 后端服务无法启动

```bash
# 查看后端日志
pm2 logs admin-backend

# 检查数据库文件
ls -la src/admin/backend/data/

# 重新初始化数据库
rm src/admin/backend/data/admin.db
bash scripts/init-database.sh
```

## 安全建议

1. **修改默认密码**: 首次登录后立即修改管理员密码
2. **配置 SSH 密钥**: 禁用密码登录，仅使用密钥认证
3. **定期更新**: 定期更新系统和依赖包
4. **备份数据**: 定期备份数据库（已配置自动备份）
5. **监控日志**: 定期检查日志文件

## 维护操作

### 数据备份

```bash
# 手动备份
bash scripts/backup.sh

# 查看备份列表
ls -lh backups/
```

### 数据恢复

```bash
# 从备份恢复
bash scripts/restore.sh backups/admin_db_20240101_120000.db.gz
```

### 查看监控

```bash
# 启动监控脚本（后台运行）
nohup bash scripts/monitor.sh &

# 查看监控日志
tail -f logs/monitor.log
```

## 下一步

- 配置 GitHub Actions 自动部署（参考 `.github/workflows/deploy.yml`）
- 配置域名邮箱（用于接收 SSL 证书通知）
- 配置网站分析工具
- 优化服务器性能

## 获取帮助

如果遇到问题，请检查：
1. 日志文件：`logs/nginx/error.log`、`src/admin/backend/logs/error.log`
2. 服务状态：`docker ps`、`pm2 status`
3. 系统资源：`free -h`、`df -h`

或参考其他文档：
- `docs/troubleshooting.md` - 常见问题排查
- `docs/maintenance.md` - 维护操作指南
- `docs/security.md` - 安全配置指南
