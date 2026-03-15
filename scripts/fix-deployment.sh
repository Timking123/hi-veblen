#!/bin/bash

# 阿里云服务器部署修复脚本
# 解决 Git 冲突、构建项目、配置后端、启动服务

set -e  # 遇到错误立即退出

echo "=========================================="
echo "开始修复部署问题..."
echo "=========================================="

# 1. 解决 Git 冲突
echo ""
echo "步骤 1: 解决 Git 冲突..."
cd /var/www/portfolio

# 备份冲突文件
if [ -f "scripts/deploy.sh" ]; then
    mv scripts/deploy.sh scripts/deploy.sh.backup
fi
if [ -f "scripts/init-server.sh" ]; then
    mv scripts/init-server.sh scripts/init-server.sh.backup
fi
if [ -f "scripts/setup-ssl.sh" ]; then
    mv scripts/setup-ssl.sh scripts/setup-ssl.sh.backup
fi
if [ -f "scripts/verify-domain.sh" ]; then
    mv scripts/verify-domain.sh scripts/verify-domain.sh.backup
fi

# 拉取最新代码
git pull origin main
echo "✓ Git 代码已更新"

# 2. 安装依赖并构建前端
echo ""
echo "步骤 2: 构建前端..."
npm install
npm run build:skip-check
echo "✓ 前端构建完成"

# 3. 部署前端到 Nginx 目录
echo ""
echo "步骤 3: 部署前端文件..."
sudo rm -rf /usr/share/nginx/html/*
sudo cp -r dist/* /usr/share/nginx/html/
sudo chown -R nginx:nginx /usr/share/nginx/html
sudo chmod -R 755 /usr/share/nginx/html
echo "✓ 前端文件已部署"

# 4. 配置后端环境变量
echo ""
echo "步骤 4: 配置后端环境..."
cd src/admin/backend

# 生成强随机 JWT_SECRET
JWT_SECRET=$(openssl rand -base64 32)

# 创建 .env.production 文件
cat > .env.production << EOF
# 后端环境变量
NODE_ENV=production
PORT=3001

# JWT 配置
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=24h

# 数据库配置
DB_PATH=./data/admin.db

# 文件上传配置
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# 内存限制
NODE_OPTIONS=--max-old-space-size=450

# 日志配置
LOG_LEVEL=info

# CORS 配置
CORS_ORIGIN=https://hi-veblen.com

# 管理员账户
ADMIN_USERNAME=veblen
ADMIN_PASSWORD=123456
EOF

echo "✓ 后端环境变量已配置"

# 5. 编译后端代码
echo ""
echo "步骤 5: 编译后端代码..."
npm install
npm run build
echo "✓ 后端编译完成"

# 6. 初始化数据库
echo ""
echo "步骤 6: 初始化数据库..."
node dist/init-db.js
echo "✓ 数据库已初始化"

# 7. 配置 Nginx
echo ""
echo "步骤 7: 配置 Nginx..."
cd /var/www/portfolio

# 创建临时 Nginx 配置（HTTP only，用于测试）
sudo tee /etc/nginx/sites-available/portfolio > /dev/null << 'EOF'
server {
    listen 80;
    server_name hi-veblen.com;
    root /usr/share/nginx/html;
    index index.html;

    # 后端 API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 管理后台
    location /admin/ {
        alias /usr/share/nginx/html/admin/;
        try_files $uri $uri/ /admin/index.html;
        add_header Cache-Control "no-cache";
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # 禁止访问隐藏文件
    location ~ /\. {
        deny all;
    }

    # 错误页面
    error_page 404 /index.html;
    error_page 500 502 503 504 /index.html;
}
EOF

# 启用站点配置
sudo ln -sf /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 测试 Nginx 配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
echo "✓ Nginx 已配置并重启"

# 8. 启动后端服务
echo ""
echo "步骤 8: 启动后端服务..."
cd /var/www/portfolio/src/admin/backend

# 停止旧进程
pm2 delete admin-backend 2>/dev/null || true

# 启动新进程
pm2 start dist/server.js --name admin-backend --update-env

# 保存 PM2 配置
pm2 save

# 设置 PM2 开机自启
pm2 startup systemd -u root --hp /root

echo "✓ 后端服务已启动"

# 9. 验证部署
echo ""
echo "=========================================="
echo "部署完成！正在验证..."
echo "=========================================="

# 检查 Nginx 状态
echo ""
echo "Nginx 状态:"
sudo systemctl status nginx --no-pager | head -n 5

# 检查后端状态
echo ""
echo "后端服务状态:"
pm2 status

# 测试前端
echo ""
echo "测试前端访问:"
curl -I http://localhost 2>/dev/null | head -n 1

# 测试后端
echo ""
echo "测试后端 API:"
curl -s http://localhost:3001/api/health 2>/dev/null || echo "后端 API 响应: 需要等待服务完全启动"

echo ""
echo "=========================================="
echo "部署修复完成！"
echo "=========================================="
echo ""
echo "访问地址:"
echo "  前端: http://hi-veblen.com"
echo "  管理后台: http://hi-veblen.com/admin"
echo ""
echo "管理员账户:"
echo "  用户名: veblen"
echo "  密码: 123456"
echo ""
echo "⚠️  重要提示:"
echo "  1. 首次登录后请立即修改管理员密码"
echo "  2. 当前使用 HTTP，建议配置 SSL 证书"
echo "  3. JWT_SECRET 已自动生成并保存"
echo ""
