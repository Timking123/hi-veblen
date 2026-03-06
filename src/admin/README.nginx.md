# Nginx 配置说明

本文档说明后台管理系统的 Nginx 配置文件及相关部署脚本的使用方法。

## 文件清单

### 配置文件

- **`nginx.conf`** - Nginx 主配置文件
  - 配置静态文件服务（前端）
  - 配置 API 反向代理（后端）
  - 配置 HTTPS 和安全头
  - 配置缓存策略

### 部署脚本

- **`deploy.sh`** - 一键部署脚本
  - 自动构建前端和后端
  - 自动部署到指定目录
  - 自动配置 Nginx
  - 自动启动服务

- **`setup-ssl.sh`** - SSL 证书申请脚本
  - 自动申请 Let's Encrypt 证书
  - 配置自动续期
  - 测试证书配置

### 文档

- **`DEPLOYMENT.md`** - 详细部署文档
  - 完整的部署步骤
  - 故障排查指南
  - 维护操作说明

## 快速开始

### 1. 准备工作

确保服务器已安装必要软件：

```bash
# 安装 Nginx
sudo apt install nginx -y

# 安装 Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y

# 安装 PM2
sudo npm install -g pm2

# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y
```

### 2. 配置域名解析

在域名服务商添加 A 记录，将域名指向服务器 IP。

### 3. 一键部署

```bash
# 赋予执行权限
chmod +x deploy.sh

# 执行部署（使用默认域名）
sudo ./deploy.sh

# 或指定自定义域名
sudo ./deploy.sh --domain admin.example.com
```

### 4. 申请 SSL 证书

```bash
# 赋予执行权限
chmod +x setup-ssl.sh

# 申请证书
sudo ./setup-ssl.sh --domain admin.huangyanjie.com --email your@email.com

# 或先测试（不会真正申请）
sudo ./setup-ssl.sh --domain admin.huangyanjie.com --email your@email.com --test
```

### 5. 验证部署

```bash
# 检查后端服务
curl http://127.0.0.1:3001/api/health

# 检查前端访问
curl -I https://admin.huangyanjie.com

# 查看服务状态
pm2 status
```

## Nginx 配置详解

### 端口配置

- **80 端口**：HTTP 服务，自动重定向到 HTTPS
- **443 端口**：HTTPS 服务，提供实际服务

### 路由规则

#### 前端静态文件

```nginx
location / {
    root /var/www/admin;
    try_files $uri $uri/ /index.html;
}
```

- 所有请求优先匹配静态文件
- 找不到文件时返回 `index.html`（支持 Vue Router 的 history 模式）

#### 后端 API 代理

```nginx
location /api {
    proxy_pass http://127.0.0.1:3001;
    # ... 代理配置
}
```

- 所有 `/api` 开头的请求代理到后端服务（端口 3001）
- 设置正确的请求头（Host、X-Real-IP 等）

#### 文件上传

```nginx
location /api/files/upload {
    proxy_pass http://127.0.0.1:3001;
    client_max_body_size 10M;
    # ... 超时配置
}
```

- 单独配置文件上传路径
- 限制上传大小为 10MB
- 增加超时时间（300 秒）

### 安全头配置

配置文件包含以下安全头：

1. **HSTS**（HTTP Strict Transport Security）
   - 强制浏览器使用 HTTPS
   - 有效期 1 年

2. **CSP**（Content Security Policy）
   - 防止 XSS 攻击
   - 限制资源加载来源

3. **X-Frame-Options**
   - 防止点击劫持
   - 设置为 DENY（禁止嵌入 iframe）

4. **X-Content-Type-Options**
   - 防止 MIME 类型嗅探
   - 设置为 nosniff

5. **X-XSS-Protection**
   - 启用浏览器 XSS 过滤器

6. **Referrer-Policy**
   - 控制 Referrer 信息发送

7. **Permissions-Policy**
   - 控制浏览器功能权限

### 缓存策略

#### HTML 文件（不缓存）

```nginx
location / {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

#### JavaScript 和 CSS（7 天）

```nginx
location ~* \.(js|css)$ {
    expires 7d;
    add_header Cache-Control "public, immutable";
}
```

#### 图片文件（30 天）

```nginx
location ~* \.(png|jpg|jpeg|gif|ico|svg|webp)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

#### 字体文件（1 年）

```nginx
location ~* \.(woff|woff2|ttf|eot|otf)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### SSL 配置

#### 协议和加密套件

- 支持 TLS 1.2 和 TLS 1.3
- 使用现代加密套件
- 禁用不安全的加密算法

#### 会话缓存

- 共享会话缓存（10MB）
- 会话超时 10 分钟
- 禁用会话票据（session tickets）

#### OCSP Stapling

- 启用 OCSP Stapling
- 使用 Google DNS（8.8.8.8）

## 部署脚本使用

### deploy.sh 选项

```bash
# 完整部署
sudo ./deploy.sh

# 只部署前端
sudo ./deploy.sh --frontend-only

# 只部署后端
sudo ./deploy.sh --backend-only

# 只配置 Nginx
sudo ./deploy.sh --nginx-only

# 跳过构建（使用已有构建产物）
sudo ./deploy.sh --skip-build

# 指定域名
sudo ./deploy.sh --domain admin.example.com

# 查看帮助
./deploy.sh --help
```

### setup-ssl.sh 选项

```bash
# 申请证书
sudo ./setup-ssl.sh --domain admin.example.com --email your@email.com

# 测试模式（不会真正申请）
sudo ./setup-ssl.sh --domain admin.example.com --email your@email.com --test

# 强制重新申请
sudo ./setup-ssl.sh --domain admin.example.com --email your@email.com --force

# 查看帮助
./setup-ssl.sh --help
```

## 常见问题

### 1. 如何修改域名？

编辑 `nginx.conf` 文件，将所有 `admin.huangyanjie.com` 替换为你的域名：

```bash
sed -i 's/admin\.huangyanjie\.com/your-domain.com/g' nginx.conf
```

或使用部署脚本的 `--domain` 参数：

```bash
sudo ./deploy.sh --domain your-domain.com
```

### 2. 如何修改后端端口？

1. 修改 `nginx.conf` 中的代理端口：
   ```nginx
   proxy_pass http://127.0.0.1:YOUR_PORT;
   ```

2. 修改后端 `.env` 文件中的端口：
   ```env
   PORT=YOUR_PORT
   ```

3. 重启服务：
   ```bash
   pm2 restart admin-backend
   sudo systemctl reload nginx
   ```

### 3. 如何增加文件上传大小限制？

修改 `nginx.conf` 中的 `client_max_body_size`：

```nginx
client_max_body_size 20M;  # 改为 20MB
```

同时修改后端 `.env` 文件：

```env
MAX_FILE_SIZE=20971520  # 20MB = 20 * 1024 * 1024
```

### 4. 如何查看日志？

```bash
# Nginx 访问日志
sudo tail -f /var/log/nginx/admin_access.log

# Nginx 错误日志
sudo tail -f /var/log/nginx/admin_error.log

# 后端应用日志
pm2 logs admin-backend

# 后端错误日志
tail -f /var/www/admin-backend/logs/error.log
```

### 5. 如何测试 Nginx 配置？

```bash
# 测试配置语法
sudo nginx -t

# 查看配置文件
sudo nginx -T

# 重载配置（不中断服务）
sudo systemctl reload nginx

# 重启 Nginx
sudo systemctl restart nginx
```

### 6. SSL 证书申请失败怎么办？

常见原因：

1. **域名解析未生效**
   ```bash
   # 检查域名解析
   dig +short your-domain.com
   ```

2. **80 端口未开放**
   ```bash
   # 检查防火墙
   sudo ufw status
   sudo ufw allow 80
   ```

3. **Nginx 配置错误**
   ```bash
   # 检查 Nginx 配置
   sudo nginx -t
   ```

4. **Let's Encrypt 速率限制**
   - 每个域名每周最多 5 次失败尝试
   - 使用 `--test` 参数测试

### 7. 如何回滚部署？

```bash
# 查看备份
ls -la /var/www/ | grep backup

# 回滚前端
sudo rm -rf /var/www/admin
sudo cp -r /var/www/admin.backup.20240101120000 /var/www/admin
sudo chown -R www-data:www-data /var/www/admin

# 回滚后端
sudo rm -rf /var/www/admin-backend
sudo cp -r /var/www/admin-backend.backup.20240101120000 /var/www/admin-backend
pm2 restart admin-backend
```

## 性能优化

### 1. 启用 Gzip 压缩

在 `/etc/nginx/nginx.conf` 的 `http` 块中添加：

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript 
           application/json application/javascript 
           application/xml+rss application/rss+xml 
           font/truetype font/opentype 
           application/vnd.ms-fontobject image/svg+xml;
```

### 2. 调整 Worker 进程

根据 CPU 核心数调整：

```nginx
worker_processes 2;  # 2核CPU
worker_connections 1024;
```

### 3. 启用 HTTP/2

已在配置中启用：

```nginx
listen 443 ssl http2;
```

### 4. 配置缓冲区

```nginx
client_body_buffer_size 128k;
client_max_body_size 10m;
proxy_buffer_size 4k;
proxy_buffers 8 4k;
```

## 安全建议

1. **定期更新系统和软件**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **配置防火墙**
   ```bash
   sudo ufw allow 'Nginx Full'
   sudo ufw allow OpenSSH
   sudo ufw enable
   ```

3. **定期备份**
   - 数据库文件
   - 上传的文件
   - 配置文件

4. **监控日志**
   - 定期检查访问日志
   - 关注异常请求
   - 监控服务器资源

5. **使用强密码**
   - 管理员账户使用强密码
   - 定期更换密码

## 更多信息

- 详细部署文档：`DEPLOYMENT.md`
- 项目说明：`../README.md`
- Nginx 官方文档：https://nginx.org/en/docs/
- Let's Encrypt 文档：https://letsencrypt.org/docs/

## 技术支持

如遇到问题，请：

1. 查看日志文件
2. 参考 `DEPLOYMENT.md` 故障排查部分
3. 检查配置文件语法
4. 验证域名解析和防火墙设置

---

**配置完成后，访问 https://your-domain.com 即可使用后台管理系统！** 🎉
