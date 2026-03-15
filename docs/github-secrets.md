# GitHub Secrets 配置指南

## 概述

GitHub Actions 需要配置以下 Secrets 才能自动部署到服务器。

## 配置步骤

### 1. 进入 GitHub 仓库设置

1. 打开你的 GitHub 仓库
2. 点击 "Settings"（设置）
3. 在左侧菜单选择 "Secrets and variables" -> "Actions"
4. 点击 "New repository secret"

### 2. 配置必需的 Secrets

#### SERVER_HOST（服务器地址）

- **Name**: `SERVER_HOST`
- **Value**: 你的服务器公网 IP 地址
- **示例**: `123.456.789.012`

#### SERVER_USER（SSH 用户名）

- **Name**: `SERVER_USER`
- **Value**: SSH 登录用户名
- **示例**: `root` 或 `ubuntu`

#### SERVER_SSH_KEY（SSH 私钥）

- **Name**: `SERVER_SSH_KEY`
- **Value**: SSH 私钥内容

**获取 SSH 私钥**：

```bash
# 在本地查看私钥
cat ~/.ssh/id_rsa

# 复制完整内容，包括：
# -----BEGIN OPENSSH PRIVATE KEY-----
# ...
# -----END OPENSSH PRIVATE KEY-----
```

**注意**：
- 复制完整的私钥内容（包括开始和结束标记）
- 不要泄露私钥给任何人
- 确保对应的公钥已添加到服务器

## 验证配置

配置完成后，推送代码到 main 分支：

```bash
git add .
git commit -m "配置 CI/CD"
git push origin main
```

然后在 GitHub 仓库的 "Actions" 标签页查看部署进度。

## 可选 Secrets

### SLACK_WEBHOOK（Slack 通知）

如果需要 Slack 通知，配置：

- **Name**: `SLACK_WEBHOOK`
- **Value**: Slack Webhook URL

### DOMAIN（域名）

- **Name**: `DOMAIN`
- **Value**: `hi-veblen.com`

## 故障排查

### 问题 1: SSH 连接失败

**错误信息**: `Permission denied (publickey)`

**解决方法**：
1. 确认 SSH 私钥格式正确
2. 确认公钥已添加到服务器：
   ```bash
   ssh root@your-server-ip
   cat ~/.ssh/authorized_keys
   ```

### 问题 2: 部署脚本执行失败

**解决方法**：
1. 检查服务器上的脚本权限
2. 手动 SSH 到服务器测试脚本：
   ```bash
   ssh root@your-server-ip
   cd /var/www/portfolio
   bash scripts/deploy.sh
   ```

### 问题 3: Docker 镜像加载失败

**解决方法**：
1. 检查服务器磁盘空间：`df -h`
2. 清理旧镜像：`docker system prune -a`

## 安全建议

1. **定期轮换密钥**: 每 3-6 个月更换 SSH 密钥
2. **最小权限原则**: 使用专门的部署用户，而不是 root
3. **审计日志**: 定期检查 GitHub Actions 日志
4. **限制分支**: 仅在 main 分支触发部署

## 参考资料

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [GitHub Secrets 文档](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
