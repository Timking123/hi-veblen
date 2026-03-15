# 自动部署配置指南

## 概述

本文档介绍两种服务器自动更新方案，帮助你在推送代码到 GitHub 后自动部署到服务器。

## 方案对比

| 特性 | Webhook（推荐） | 定时拉取 |
|------|----------------|---------|
| 更新速度 | 实时（秒级） | 延迟（分钟级） |
| 服务器资源 | 低（事件驱动） | 中（定时轮询） |
| 配置复杂度 | 中 | 低 |
| GitHub 配置 | 需要 | 不需要 |
| 网络要求 | 需要公网 IP | 仅需出站 |
| 可靠性 | 高 | 中 |
| 适用场景 | 生产环境 | 开发/测试环境 |

## 方案 1：GitHub Webhook（推荐）

### 工作原理

```
你的电脑 → GitHub → Webhook 通知 → 服务器 → 自动部署
   (推送)              (实时)         (拉取+重启)
```

### 优点
- ✅ 实时更新（推送后几秒内完成）
- ✅ 资源占用低（事件驱动）
- ✅ 可以看到部署状态（GitHub 显示）
- ✅ 支持部署失败通知

### 缺点
- ❌ 需要配置 GitHub Webhook
- ❌ 需要开放服务器端口（9000）
- ❌ 需要公网 IP

### 配置步骤

#### 1. 在服务器上运行设置脚本

```bash
cd /var/www/portfolio
bash scripts/setup-webhook.sh
```

脚本会自动：
- 生成安全密钥
- 配置防火墙
- 启动 Webhook 服务器
- 显示配置信息

#### 2. 在 GitHub 配置 Webhook

1. 访问仓库：https://github.com/Timking123/hi-veblen
2. 点击 **Settings** → **Webhooks** → **Add webhook**
3. 填写配置：
   - **Payload URL**: `http://120.25.234.223:9000/webhook`
   - **Content type**: `application/json`
   - **Secret**: （脚本生成的密钥）
   - **Which events**: `Just the push event`
   - **Active**: ✓
4. 点击 **Add webhook**

#### 3. 测试 Webhook

推送一次代码测试：

```powershell
# 在本地 Windows 电脑
.\scripts\auto-push.ps1 "测试 Webhook 自动部署"
```

然后检查：
- GitHub Webhook 页面显示绿色 ✓
- 服务器日志：`pm2 logs webhook`
- 代码已更新：`cd /var/www/portfolio && git log -1`

### 管理命令

```bash
# 查看 Webhook 服务状态
pm2 status webhook

# 查看实时日志
pm2 logs webhook

# 重启服务
pm2 restart webhook

# 停止服务
pm2 stop webhook

# 查看历史日志
tail -f /var/www/portfolio/logs/webhook.log
```

---

## 方案 2：定时拉取（简单）

### 工作原理

```
服务器 → 定时检查 GitHub → 发现更新 → 自动拉取 → 重启服务
        (每 5 分钟)
```

### 优点
- ✅ 配置简单（一条命令）
- ✅ 不需要公网 IP
- ✅ 不需要配置 GitHub
- ✅ 不需要开放端口

### 缺点
- ❌ 有延迟（最多 5 分钟）
- ❌ 定时轮询消耗资源
- ❌ 无法获取部署状态

### 配置步骤

#### 1. 在服务器上运行设置脚本

```bash
cd /var/www/portfolio
bash scripts/setup-auto-pull.sh
```

脚本会自动：
- 配置 cron 定时任务
- 每 5 分钟检查一次更新
- 如有更新自动部署

#### 2. 测试自动拉取

推送代码后等待 5 分钟，或手动触发：

```bash
bash scripts/auto-pull.sh
```

#### 3. 查看日志

```bash
# 实时查看日志
tail -f logs/auto-pull.log

# 查看最近 20 行
tail -20 logs/auto-pull.log
```

### 管理命令

```bash
# 查看 cron 任务
crontab -l

# 编辑 cron 任务
crontab -e

# 手动触发更新
bash scripts/auto-pull.sh

# 修改检查频率（编辑 crontab）
# 每 1 分钟: */1 * * * *
# 每 5 分钟: */5 * * * *
# 每 10 分钟: */10 * * * *
```

---

## 推荐配置

### 生产环境（推荐 Webhook）

```bash
# 1. 配置 Webhook
bash scripts/setup-webhook.sh

# 2. 在 GitHub 配置 Webhook

# 3. 测试
.\scripts\auto-push.ps1 "测试自动部署"
```

### 开发/测试环境（推荐定时拉取）

```bash
# 1. 配置定时拉取
bash scripts/setup-auto-pull.sh

# 2. 推送代码后等待 5 分钟
```

### 双保险配置（最稳定）

同时配置两种方案：
- Webhook 作为主要方式（实时）
- 定时拉取作为备份（防止 Webhook 失败）

```bash
# 1. 配置 Webhook
bash scripts/setup-webhook.sh

# 2. 配置定时拉取（频率设为 30 分钟）
bash scripts/setup-auto-pull.sh
# 然后编辑 crontab，将 */5 改为 */30
```

---

## 部署流程说明

### 自动部署会做什么？

1. **拉取最新代码**
   ```bash
   git pull origin main
   ```

2. **检查依赖变化**
   - 如果 `package.json` 有变化
   - 自动运行 `npm install --production`

3. **重启后端服务**
   ```bash
   pm2 restart admin-backend
   ```

4. **记录日志**
   - Webhook: `/var/www/portfolio/logs/webhook.log`
   - 定时拉取: `/var/www/portfolio/logs/auto-pull.log`

### 不会自动做什么？

以下操作需要手动执行：

- ❌ 前端构建（需要在本地构建后上传）
- ❌ 数据库迁移
- ❌ Nginx 配置更新
- ❌ 环境变量修改

---

## 故障排查

### Webhook 无响应

**检查步骤：**

1. 检查服务是否运行
   ```bash
   pm2 status webhook
   ```

2. 检查端口是否开放
   ```bash
   netstat -tulpn | grep 9000
   ```

3. 检查防火墙
   ```bash
   sudo ufw status
   ```

4. 查看日志
   ```bash
   pm2 logs webhook --lines 50
   ```

5. 测试健康检查
   ```bash
   curl http://localhost:9000/health
   ```

### 定时拉取不工作

**检查步骤：**

1. 检查 cron 任务
   ```bash
   crontab -l | grep auto-pull
   ```

2. 检查脚本权限
   ```bash
   ls -l scripts/auto-pull.sh
   ```

3. 手动运行测试
   ```bash
   bash scripts/auto-pull.sh
   ```

4. 查看日志
   ```bash
   tail -f logs/auto-pull.log
   ```

5. 检查 cron 服务
   ```bash
   systemctl status cron
   ```

### GitHub Webhook 显示错误

**常见错误：**

1. **签名验证失败**
   - 检查密钥是否正确
   - 重新运行 `setup-webhook.sh`

2. **连接超时**
   - 检查服务器防火墙
   - 检查阿里云安全组规则

3. **500 错误**
   - 查看服务器日志
   - 检查部署脚本是否有错误

---

## 安全建议

### Webhook 安全

1. ✅ 使用强密钥（脚本自动生成）
2. ✅ 验证 GitHub 签名
3. ✅ 只处理 main 分支推送
4. ✅ 记录所有请求日志
5. ⚠️ 考虑使用 HTTPS（需要配置反向代理）

### 定时拉取安全

1. ✅ 使用 SSH 密钥认证（不要用密码）
2. ✅ 限制 Git 用户权限
3. ✅ 定期检查日志
4. ✅ 设置日志轮转

---

## 性能优化

### Webhook 优化

```javascript
// 在 webhook-server.js 中可以添加：

// 1. 防抖动（避免频繁部署）
let deployTimeout;
function debounceDeploy() {
  clearTimeout(deployTimeout);
  deployTimeout = setTimeout(deploy, 30000); // 30 秒后部署
}

// 2. 队列机制（避免并发部署）
const deployQueue = [];
let isDeploying = false;

// 3. 缓存检查（避免重复部署）
let lastDeployedCommit = '';
```

### 定时拉取优化

```bash
# 在 auto-pull.sh 中可以添加：

# 1. 只在工作时间检查（节省资源）
HOUR=$(date +%H)
if [ $HOUR -lt 8 ] || [ $HOUR -gt 22 ]; then
    exit 0
fi

# 2. 检查网络状态
if ! ping -c 1 github.com &> /dev/null; then
    log_to_file "网络不可达，跳过检查"
    exit 0
fi
```

---

## 监控和告警

### 添加钉钉通知

```bash
# 在部署脚本中添加：
DINGTALK_WEBHOOK="https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN"

curl -X POST "$DINGTALK_WEBHOOK" \
  -H 'Content-Type: application/json' \
  -d "{
    \"msgtype\": \"text\",
    \"text\": {
      \"content\": \"服务器已自动更新到最新版本\"
    }
  }"
```

### 添加邮件通知

```bash
# 安装 mailutils
sudo apt-get install mailutils

# 发送邮件
echo "服务器已自动更新" | mail -s "部署通知" your-email@example.com
```

---

## 相关文档

- [自动上传脚本使用说明](../scripts/README-AUTO-PUSH.md)
- [部署指南](./deployment-guide.md)
- [故障排查指南](./troubleshooting.md)

---

## 快速参考

### 本地推送代码

```powershell
# Windows
.\scripts\auto-push.ps1 "更新说明"
```

### 服务器查看状态

```bash
# Webhook 方式
pm2 status webhook
pm2 logs webhook

# 定时拉取方式
tail -f logs/auto-pull.log
crontab -l
```

### 手动触发更新

```bash
# 方式 1：直接拉取
cd /var/www/portfolio
git pull origin main
pm2 restart admin-backend

# 方式 2：运行自动拉取脚本
bash scripts/auto-pull.sh
```
