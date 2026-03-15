# 阿里云部署详细步骤指南

## 服务器信息
- **IP**: 120.25.234.223
- **用户**: root
- **端口**: 22
- **域名**: hi-veblen.com

---

## 📋 部署前准备

### 1. 在本地提交所有代码

```bash
# 在你的项目目录（Windows 本地）
git add .
git commit -m "准备部署到阿里云"
git push origin main
```

### 2. 测试 SSH 连接

```bash
# 在 PowerShell 或 Git Bash 中测试连接
ssh root@120.25.234.223

# 如果能连接成功，输入 exit 退出
exit
```

---

## 🚀 开始部署

### 步骤 1: 连接到服务器

```bash
ssh root@120.25.234.223
```

### 步骤 2: 克隆项目代码

```bash
# 创建部署目录
mkdir -p /var/www/portfolio
cd /var/www/portfolio

# 克隆你的 GitHub 仓库
git clone https://github.com/你的用户名/你的仓库名.git .

# 如果仓库是私有的，需要配置 GitHub 访问令牌
# git clone https://你的token@github.com/你的用户名/你的仓库名.git .
```

### 步骤 3: 初始化服务器环境

```bash
# 执行服务器初始化脚本（安装 Docker、Node.js、PM2 等）
bash scripts/init-server.sh
```

**这个脚本会安装**：
- Docker 和 Docker Compose
- Node.js 18
- PM2 进程管理器
- Certbot SSL 证书工具
- 配置防火墙（开放 22、80、443 端口）

**预计时间**: 5-10 分钟

**重要**: 如果是首次安装 Docker，需要重新登录使用户组生效：
```bash
exit
ssh root@120.25.234.223
cd /var/www/portfolio
```

### 步骤 4: 配置域名 DNS

**在阿里云域名控制台操作**：

1. 访问 https://dns.console.aliyun.com
2. 选择域名 `hi-veblen.com`
3. 点击"解析设置"
4. 添加 A 记录：
   - 记录类型: A
   - 主机记录: @
   - 记录值: `120.25.234.223`
   - TTL: 600

5. 保存配置

### 步骤 5: 验证域名解析

```bash
# 在服务器上验证（等待 5-10 分钟后执行）
bash scripts/verify-domain.sh hi-veblen.com 120.25.234.223

# 如果显示"域名解析正确"，继续下一步
# 如果显示"域名未解析"，等待几分钟后重试
```

### 步骤 6: 配置环境变量

```bash
# 生成强密码
JWT_SECRET=$(openssl rand -base64 32)
echo "生成的 JWT_SECRET: $JWT_SECRET"

# 编辑后端配置文件
nano src/admin/backend/.env.production

# 找到 JWT_SECRET 这一行，替换为上面生成的密码
# 保存并退出（Ctrl+X, Y, Enter）
```

### 步骤 7: 申请 SSL 证书

```bash
# 申请 Let's Encrypt 免费证书
bash scripts/setup-ssl.sh
```

**这个脚本会**：
- 安装 Certbot
- 申请 SSL 证书
- 配置自动续期（每天凌晨 2 点检查）

**预计时间**: 2-3 分钟

### 步骤 8: 执行部署

```bash
# 一键部署
bash scripts/deploy.sh
```

**这个脚本会自动**：
1. 检查环境
2. 备份当前版本
3. 构建前端（主网站）
4. 构建后端
5. 构建 Docker 镜像
6. 初始化数据库
7. 启动 Nginx 容器
8. 启动后端服务（PM2）
9. 执行健康检查

**预计时间**: 5-10 分钟

### 步骤 9: 验证部署

```bash
# 执行验证脚本
bash scripts/verify-deployment.sh hi-veblen.com
```

**应该看到**：
- ✓ 前端页面加载
- ✓ 后端健康检查
- ✓ Docker 容器运行
- ✓ PM2 进程运行

### 步骤 10: 访问网站

在浏览器中访问：
- **主网站**: https://hi-veblen.com
- **管理后台**: https://hi-veblen.com/admin
- **后端 API**: https://hi-veblen.com/api/health

**默认管理员账户**：
- 用户名: veblen
- 密码: 123456
- ⚠️ **首次登录后必须立即修改密码！**

---

## 🔔 配置通知（可选）

### 配置 Slack 通知

1. 创建 Slack Webhook：
   - 访问 https://api.slack.com/messaging/webhooks
   - 创建一个 Incoming Webhook
   - 复制 Webhook URL

2. 配置告警脚本：
```bash
nano scripts/send-alert.sh

# 添加以下内容：
SLACK_WEBHOOK="你的Slack_Webhook_URL"

send_slack() {
    local message="$1"
    curl -X POST "$SLACK_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"$message\"}"
}
```

### 配置邮件告警

1. 安装邮件工具：
```bash
apt-get install -y mailutils
```

2. 配置 SMTP（使用 QQ 邮箱示例）：
```bash
nano /etc/ssmtp/ssmtp.conf

# 添加配置：
root=1243222867@qq.com
mailhub=smtp.qq.com:587
AuthUser=1243222867@qq.com
AuthPass=你的QQ邮箱授权码
UseSTARTTLS=YES
```

3. 测试发送邮件：
```bash
echo "测试邮件" | mail -s "部署通知" 1243222867@qq.com
```

---

## 📊 查看服务状态

```bash
# 查看 Docker 容器
docker-compose ps

# 查看 PM2 进程
pm2 status

# 查看 Nginx 日志
docker-compose logs nginx

# 查看后端日志
pm2 logs admin-backend

# 查看系统资源
free -h        # 内存
df -h          # 磁盘
top            # CPU
```

---

## 🔄 配置 GitHub Actions 自动部署

### 1. 生成 SSH 密钥（在本地 Windows）

```bash
# 在 PowerShell 或 Git Bash
ssh-keygen -t rsa -b 4096 -C "1243222867@qq.com"

# 按提示操作（全部回车使用默认值）
```

### 2. 将公钥添加到服务器

```bash
# 查看公钥
cat ~/.ssh/id_rsa.pub

# 复制输出内容
```

在服务器上：
```bash
# SSH 连接到服务器
ssh root@120.25.234.223

# 添加公钥
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys
# 粘贴公钥内容，保存退出

# 设置权限
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### 3. 配置 GitHub Secrets

在 GitHub 仓库设置中添加：

1. **SERVER_HOST**
   - Value: `120.25.234.223`

2. **SERVER_USER**
   - Value: `root`

3. **SERVER_SSH_KEY**
   - 在本地执行: `cat ~/.ssh/id_rsa`
   - 复制完整私钥内容（包括开始和结束标记）

### 4. 测试自动部署

```bash
# 在本地
git add .
git commit -m "测试自动部署"
git push origin main

# 在 GitHub 仓库查看 Actions 标签页
```

---

## ❓ 常见问题

### Q1: 端口被占用

```bash
# 查看端口占用
netstat -tulpn | grep :80
netstat -tulpn | grep :443

# 停止占用端口的进程
kill -9 <PID>
```

### Q2: Docker 容器无法启动

```bash
# 查看日志
docker-compose logs nginx

# 重新构建
docker-compose build --no-cache
docker-compose up -d
```

### Q3: SSL 证书申请失败

确保：
1. 域名已正确解析（等待 10 分钟）
2. 端口 80 未被占用
3. 防火墙已开放端口 80

```bash
# 重新申请
bash scripts/setup-ssl.sh
```

### Q4: 后端服务无法启动

```bash
# 查看日志
pm2 logs admin-backend

# 重启服务
pm2 restart admin-backend

# 如果数据库有问题，重新初始化
rm src/admin/backend/data/admin.db
bash scripts/init-database.sh
```

---

## 🛡️ 安全建议

1. **修改管理员密码**
   - 首次登录后立即修改

2. **配置 SSH 密钥认证**
   - 禁用密码登录
   - 执行: `bash scripts/secure-ssh.sh`

3. **定期备份**
   - 已配置自动备份（每天凌晨 2 点）
   - 手动备份: `bash scripts/backup.sh`

4. **监控日志**
   - 定期检查: `tail -f logs/nginx/error.log`

5. **更新系统**
   ```bash
   apt-get update
   apt-get upgrade
   ```

---

## 📞 获取帮助

如果遇到问题：
1. 查看日志文件
2. 查看文档: `docs/troubleshooting.md`
3. 查看命令: `docs/quick-reference.md`

---

## ✅ 部署完成检查清单

- [ ] 服务器环境已初始化
- [ ] 域名 DNS 已配置
- [ ] SSL 证书已申请
- [ ] 网站可以访问（https://hi-veblen.com）
- [ ] 管理后台可以登录
- [ ] 后端 API 正常响应
- [ ] 已修改默认管理员密码
- [ ] GitHub Actions 已配置
- [ ] 通知已配置（Slack/邮件）

---

**祝部署顺利！** 🎉
