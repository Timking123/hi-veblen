# 快速部署命令（复制粘贴版）

## 🚀 在服务器上执行的完整命令

### 一键复制执行（首次部署）

```bash
# 1. SSH 连接到服务器
ssh root@120.25.234.223

# 2. 创建目录并克隆代码
mkdir -p /var/www/portfolio && cd /var/www/portfolio
git clone https://github.com/你的用户名/你的仓库名.git .

# 3. 初始化服务器环境
bash scripts/init-server.sh

# 4. 如果是首次安装 Docker，重新登录
exit
ssh root@120.25.234.223
cd /var/www/portfolio

# 5. 配置环境变量
JWT_SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET=$JWT_SECRET" >> src/admin/backend/.env.production

# 6. 申请 SSL 证书（确保域名已解析）
bash scripts/setup-ssl.sh

# 7. 执行部署
bash scripts/deploy.sh

# 8. 验证部署
bash scripts/verify-deployment.sh hi-veblen.com
```

---

## 📝 分步执行命令

### 步骤 1: 连接服务器
```bash
ssh root@120.25.234.223
```

### 步骤 2: 克隆代码
```bash
mkdir -p /var/www/portfolio
cd /var/www/portfolio
git clone https://github.com/你的用户名/你的仓库名.git .
```

### 步骤 3: 初始化环境
```bash
bash scripts/init-server.sh
```

### 步骤 4: 重新登录（如果需要）
```bash
exit
ssh root@120.25.234.223
cd /var/www/portfolio
```

### 步骤 5: 验证域名解析
```bash
bash scripts/verify-domain.sh hi-veblen.com 120.25.234.223
```

### 步骤 6: 配置环境变量
```bash
JWT_SECRET=$(openssl rand -base64 32)
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" src/admin/backend/.env.production
```

### 步骤 7: 申请 SSL 证书
```bash
bash scripts/setup-ssl.sh
```

### 步骤 8: 部署
```bash
bash scripts/deploy.sh
```

### 步骤 9: 验证
```bash
bash scripts/verify-deployment.sh hi-veblen.com
```

---

## 🔄 日常更新命令

```bash
# SSH 连接
ssh root@120.25.234.223

# 进入目录
cd /var/www/portfolio

# 拉取最新代码
git pull origin main

# 重新部署
bash scripts/deploy.sh
```

---

## 📊 查看状态命令

```bash
# 查看所有服务状态
docker-compose ps && pm2 status

# 查看日志
docker-compose logs nginx
pm2 logs admin-backend

# 查看系统资源
free -h && df -h
```

---

## 🛠️ 故障排查命令

```bash
# 重启所有服务
docker-compose restart && pm2 restart all

# 查看端口占用
netstat -tulpn | grep -E ':(80|443|3001)'

# 清理 Docker
docker system prune -a

# 重新构建
docker-compose build --no-cache && docker-compose up -d
```

---

## 服务器信息

- **IP**: 120.25.234.223
- **用户**: root
- **域名**: hi-veblen.com
- **部署目录**: /var/www/portfolio
