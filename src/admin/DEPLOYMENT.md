# 后台管理系统部署指南

本文档详细说明如何在阿里云 ECS 服务器上部署后台管理系统，包括 Nginx 配置、SSL 证书申请、后端服务部署等。

## 服务器环境

- **服务器**：阿里云 ECS（华南1-深圳）
- **配置**：2核 vCPU / 2GB 内存 / 40GB ESSD / 3Mbps 带宽
- **系统**：Ubuntu 24.04 64位
- **域名**：admin.huangyanjie.com（请替换为实际域名）

## 前置要求

### 1. 安装必要软件

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Nginx
sudo apt install nginx -y

# 安装 Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y

# 安装 PM2
sudo npm install -g pm2

# 安装 Certbot（Let's Encrypt）
sudo apt install certbot python3-certbot-nginx -y
```

### 2. 配置防火墙

```bash
# 允许 HTTP 和 HTTPS 流量
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

### 3. 配置域名解析

在域名服务商（如阿里云）添加 A 记录：

```
类型: A
主机记录: admin
记录值: <服务器公网IP>
TTL: 600
```

## 部署步骤

### 第一步：构建前端

```bash
# 在本地或服务器上构建前端
cd src/admin/frontend
npm install
npm run build

# 构建产物在 dist/ 目录
```

### 第二步：部署前端静态文件

```bash
# 创建前端部署目录
sudo mkdir -p /var/www/admin

# 复制构建产物到部署目录
sudo cp -r dist/* /var/www/admin/

# 设置权限
sudo chown -R www-data:www-data /var/www/admin
sudo chmod -R 755 /var/www/admin
```

### 第三步：构建和部署后端

```bash
# 构建后端
cd src/admin/backend
npm install
npm run build

# 创建后端部署目录
sudo mkdir -p /var/www/admin-backend

# 复制文件到部署目录
sudo cp -r dist/ /var/www/admin-backend/
sudo cp -r node_modules/ /var/www/admin-backend/
sudo cp package.json /var/www/admin-backend/
sudo cp ecosystem.config.js /var/www/admin-backend/

# 创建数据目录
sudo mkdir -p /var/www/admin-backend/data
sudo mkdir -p /var/www/admin-backend/logs

# 设置权限
sudo chown -R $USER:$USER /var/www/admin-backend
sudo chmod -R 755 /var/www/admin-backend
```

### 第四步：配置环境变量

```bash
# 创建环境变量文件
sudo nano /var/www/admin-backend/.env
```

添加以下内容（根据实际情况修改）：

```env
# 环境
NODE_ENV=production

# 服务器配置
PORT=3001
HOST=127.0.0.1

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# 数据库配置
DB_PATH=/var/www/admin-backend/data/admin.db

# 文件上传配置
UPLOAD_DIR=/var/www/files
MAX_FILE_SIZE=10485760

# 日志配置
LOG_DIR=/var/www/admin-backend/logs
LOG_LEVEL=info
```

### 第五步：初始化数据库

```bash
# 进入后端目录
cd /var/www/admin-backend

# 运行数据库初始化脚本
node dist/database/init.js
```

### 第六步：启动后端服务

```bash
# 使用 PM2 启动后端服务
cd /var/www/admin-backend
pm2 start ecosystem.config.js

# 查看服务状态
pm2 status

# 查看日志
pm2 logs admin-api

# 设置 PM2 开机自启
pm2 startup
pm2 save
```

### 第七步：配置 Nginx（HTTP 模式）

首先配置 HTTP 模式，用于申请 SSL 证书：

```bash
# 复制 Nginx 配置文件
sudo cp src/admin/nginx.conf /etc/nginx/sites-available/admin

# 创建临时 HTTP 配置（用于 SSL 证书申请）
sudo nano /etc/nginx/sites-available/admin-http
```

添加以下内容：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name admin.huangyanjie.com;

    # Let's Encrypt 验证路径
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # 临时允许访问（用于测试）
    location / {
        root /var/www/admin;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/admin-http /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

### 第八步：申请 SSL 证书

```bash
# 创建 certbot 目录
sudo mkdir -p /var/www/certbot

# 申请 SSL 证书
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d admin.huangyanjie.com \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email

# 测试证书自动续期
sudo certbot renew --dry-run
```

### 第九步：配置 Nginx（HTTPS 模式）

```bash
# 删除临时 HTTP 配置
sudo rm /etc/nginx/sites-enabled/admin-http

# 修改完整配置文件中的域名
sudo nano /etc/nginx/sites-available/admin

# 将 admin.huangyanjie.com 替换为实际域名

# 创建软链接
sudo ln -s /etc/nginx/sites-available/admin /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

### 第十步：验证部署

1. **检查后端服务**：
   ```bash
   curl http://127.0.0.1:3001/api/health
   # 应返回：{"status":"ok"}
   ```

2. **检查前端访问**：
   ```bash
   curl -I https://admin.huangyanjie.com
   # 应返回 200 状态码
   ```

3. **检查 SSL 证书**：
   ```bash
   curl -I https://admin.huangyanjie.com
   # 检查响应头中的安全头
   ```

4. **浏览器访问**：
   - 打开 https://admin.huangyanjie.com
   - 应该能看到登录页面
   - 检查浏览器控制台无错误

## 维护操作

### 更新前端

```bash
# 构建新版本
cd src/admin/frontend
npm run build

# 备份旧版本
sudo mv /var/www/admin /var/www/admin.backup.$(date +%Y%m%d%H%M%S)

# 部署新版本
sudo mkdir -p /var/www/admin
sudo cp -r dist/* /var/www/admin/
sudo chown -R www-data:www-data /var/www/admin
sudo chmod -R 755 /var/www/admin
```

### 更新后端

```bash
# 构建新版本
cd src/admin/backend
npm run build

# 备份旧版本
sudo cp -r /var/www/admin-backend /var/www/admin-backend.backup.$(date +%Y%m%d%H%M%S)

# 部署新版本
sudo cp -r dist/* /var/www/admin-backend/dist/

# 重启服务
pm2 restart admin-api

# 查看日志
pm2 logs admin-api
```

### 查看日志

```bash
# PM2 日志
pm2 logs admin-api

# Nginx 访问日志
sudo tail -f /var/log/nginx/admin_access.log

# Nginx 错误日志
sudo tail -f /var/log/nginx/admin_error.log

# 应用日志
tail -f /var/www/admin-backend/logs/app.log
```

### 数据库备份

```bash
# 创建备份目录
sudo mkdir -p /var/backups/admin

# 备份数据库
sudo cp /var/www/admin-backend/data/admin.db \
  /var/backups/admin/admin.db.$(date +%Y%m%d%H%M%S)

# 设置定时备份（每天凌晨 2 点）
sudo crontab -e

# 添加以下行：
0 2 * * * cp /var/www/admin-backend/data/admin.db /var/backups/admin/admin.db.$(date +\%Y\%m\%d\%H\%M\%S)

# 清理旧备份（保留最近 30 天）
0 3 * * * find /var/backups/admin -name "admin.db.*" -mtime +30 -delete
```

### SSL 证书续期

Let's Encrypt 证书有效期为 90 天，Certbot 会自动续期。

```bash
# 手动续期
sudo certbot renew

# 查看证书信息
sudo certbot certificates

# 测试自动续期
sudo certbot renew --dry-run
```

## 性能监控

### 监控后端内存占用

```bash
# 查看 PM2 进程信息
pm2 monit

# 查看详细内存使用
pm2 show admin-api
```

### 监控 Nginx 性能

```bash
# 查看 Nginx 状态
sudo systemctl status nginx

# 查看连接数
sudo netstat -an | grep :443 | wc -l

# 查看访问统计
sudo cat /var/log/nginx/admin_access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -10
```

## 故障排查

### 后端服务无法启动

```bash
# 查看 PM2 日志
pm2 logs admin-api --lines 100

# 检查端口占用
sudo netstat -tlnp | grep 3001

# 检查环境变量
cat /var/www/admin-backend/.env

# 检查数据库文件权限
ls -la /var/www/admin-backend/data/
```

### 前端无法访问

```bash
# 检查 Nginx 状态
sudo systemctl status nginx

# 测试 Nginx 配置
sudo nginx -t

# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/admin_error.log

# 检查文件权限
ls -la /var/www/admin/
```

### API 请求失败

```bash
# 检查后端服务状态
pm2 status

# 测试后端连接
curl http://127.0.0.1:3001/api/health

# 查看 Nginx 代理日志
sudo tail -f /var/log/nginx/admin_error.log

# 检查防火墙规则
sudo ufw status
```

### SSL 证书问题

```bash
# 查看证书信息
sudo certbot certificates

# 测试证书
openssl s_client -connect admin.huangyanjie.com:443 -servername admin.huangyanjie.com

# 重新申请证书
sudo certbot certonly --webroot -w /var/www/certbot -d admin.huangyanjie.com --force-renewal
```

## 安全建议

1. **定期更新系统**：
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **配置防火墙**：
   ```bash
   # 只允许必要的端口
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   sudo ufw allow ssh
   sudo ufw allow 'Nginx Full'
   sudo ufw enable
   ```

3. **修改默认管理员密码**：
   - 首次登录后立即修改密码
   - 使用强密码（至少 12 位，包含大小写字母、数字、特殊字符）

4. **定期备份数据**：
   - 数据库文件
   - 上传的文件
   - 配置文件

5. **监控日志**：
   - 定期检查访问日志
   - 关注异常登录尝试
   - 监控服务器资源使用

6. **限制 SSH 访问**：
   ```bash
   # 禁用密码登录，只允许密钥登录
   sudo nano /etc/ssh/sshd_config
   # 设置：PasswordAuthentication no
   sudo systemctl restart sshd
   ```

## 性能优化

### 针对 2GB 内存的优化

1. **Node.js 内存限制**：
   - 已在 `ecosystem.config.js` 中设置 `max_memory_restart: '500M'`
   - 已设置 `--max-old-space-size=512`

2. **Nginx 优化**：
   ```bash
   sudo nano /etc/nginx/nginx.conf
   ```
   
   调整以下参数：
   ```nginx
   worker_processes 2;  # 2核CPU
   worker_connections 1024;
   keepalive_timeout 65;
   ```

3. **SQLite 优化**：
   - 使用 WAL 模式（已在代码中配置）
   - 定期执行 VACUUM 清理

4. **定期清理日志**：
   ```bash
   # 配置日志轮转
   sudo nano /etc/logrotate.d/admin
   ```
   
   添加：
   ```
   /var/log/nginx/admin_*.log {
       daily
       rotate 7
       compress
       delaycompress
       notifempty
       create 0640 www-data adm
       sharedscripts
       postrotate
           [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
       endscript
   }
   ```

## 回滚操作

如果部署出现问题，可以快速回滚：

### 回滚前端

```bash
# 查看备份
ls -la /var/www/ | grep admin.backup

# 回滚到指定版本
sudo rm -rf /var/www/admin
sudo cp -r /var/www/admin.backup.20240101120000 /var/www/admin
sudo chown -R www-data:www-data /var/www/admin
```

### 回滚后端

```bash
# 查看备份
ls -la /var/www/ | grep admin-backend.backup

# 回滚到指定版本
sudo rm -rf /var/www/admin-backend
sudo cp -r /var/www/admin-backend.backup.20240101120000 /var/www/admin-backend

# 重启服务
pm2 restart admin-api
```

## 联系支持

如有问题，请查看：
- 项目 README.md
- API 文档
- 错误日志

---

**部署完成！** 🎉

访问 https://admin.huangyanjie.com 开始使用后台管理系统。
