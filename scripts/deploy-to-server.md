# 服务器部署指南

## 当前问题

服务器上遇到以下问题：
1. Git 冲突：本地有未跟踪的文件 `scripts/deploy.sh` 等
2. 缺少 `build:skip-check` 脚本（已在本地添加）
3. Nginx 403 错误
4. 后端 CORS 配置问题

## 解决方案

### 步骤 1: 上传最新代码到 GitHub

在本地执行：
```bash
.\scripts\auto-push.ps1 "添加部署修复脚本和配置"
```

### 步骤 2: 在服务器上执行修复脚本

SSH 连接到服务器后执行：
```bash
cd /var/www/portfolio
git pull origin main
chmod +x scripts/fix-deployment.sh
sudo bash scripts/fix-deployment.sh
```

## 修复脚本功能

`scripts/fix-deployment.sh` 会自动完成：

1. **解决 Git 冲突**
   - 备份冲突文件
   - 拉取最新代码

2. **构建前端**
   - 安装依赖
   - 使用 `npm run build:skip-check` 构建

3. **部署前端**
   - 复制到 `/usr/share/nginx/html`
   - 设置正确的权限

4. **配置后端**
   - 自动生成强随机 JWT_SECRET
   - 创建 `.env.production` 文件
   - 配置 CORS 为 `https://hi-veblen.com`

5. **编译后端**
   - 安装依赖
   - 编译 TypeScript 代码

6. **初始化数据库**
   - 创建数据库表
   - 导入默认管理员账户

7. **配置 Nginx**
   - 创建正确的站点配置
   - 后端代理到 `http://127.0.0.1:3001`
   - 重启 Nginx

8. **启动后端服务**
   - 使用 PM2 启动
   - 自动更新环境变量
   - 设置开机自启

9. **验证部署**
   - 检查 Nginx 状态
   - 检查后端状态
   - 测试前端和后端访问

## 部署后验证

### 检查服务状态
```bash
# Nginx 状态
sudo systemctl status nginx

# 后端状态
pm2 status
pm2 logs admin-backend --lines 50

# 查看后端日志
pm2 logs admin-backend
```

### 测试访问
```bash
# 测试前端
curl -I http://localhost

# 测试后端 API
curl http://localhost:3001/api/health
```

### 浏览器访问
- 前端: http://hi-veblen.com
- 管理后台: http://hi-veblen.com/admin

## 常见问题

### 1. Nginx 403 错误
- 检查文件权限: `ls -la /usr/share/nginx/html`
- 应该是 `nginx:nginx` 所有者，权限 `755`

### 2. 后端 CORS 错误
- 检查 `.env.production` 中的 `CORS_ORIGIN`
- 应该是 `https://hi-veblen.com`（生产环境）或 `http://hi-veblen.com`（测试环境）

### 3. 后端无法启动
- 查看日志: `pm2 logs admin-backend`
- 检查端口占用: `sudo lsof -i :3001`

### 4. 数据库错误
- 检查数据库文件: `ls -la /var/www/portfolio/src/admin/backend/data/`
- 重新初始化: `node dist/init-db.js`

## 下一步：配置 SSL

部署成功后，建议配置 SSL 证书：

```bash
# 安装 Certbot
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d hi-veblen.com --email 1243222867@qq.com --agree-tos --no-eff-email

# 自动续期
sudo certbot renew --dry-run
```

## 管理员账户

- 用户名: `veblen`
- 密码: `123456`
- ⚠️ 首次登录后请立即修改密码

## 自动部署

部署成功后，可以配置 Webhook 实现自动部署：
```bash
cd /var/www/portfolio
chmod +x scripts/setup-webhook.sh
sudo bash scripts/setup-webhook.sh
```

参考文档: `docs/auto-deployment-guide.md`
