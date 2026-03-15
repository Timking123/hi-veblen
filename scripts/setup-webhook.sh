#!/bin/bash
# 设置 GitHub Webhook 自动部署
# 用途：配置服务器接收 GitHub 推送通知并自动更新

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "========================================"
echo "    设置 GitHub Webhook 自动部署"
echo "========================================"
echo ""

# 1. 生成随机密钥
log_step "1. 生成 Webhook 密钥..."
WEBHOOK_SECRET=$(openssl rand -hex 32)
log_info "密钥已生成: $WEBHOOK_SECRET"
log_warn "请保存此密钥，稍后需要在 GitHub 中配置"
echo ""

# 2. 创建日志目录
log_step "2. 创建日志目录..."
mkdir -p logs
log_info "✓ 日志目录已创建"
echo ""

# 3. 更新 webhook 服务器配置
log_step "3. 更新 webhook 服务器配置..."
sed -i "s/your-webhook-secret-here/$WEBHOOK_SECRET/g" scripts/webhook-server.js
log_info "✓ 配置已更新"
echo ""

# 4. 配置防火墙（开放 9000 端口）
log_step "4. 配置防火墙..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 9000/tcp
    log_info "✓ 防火墙已配置（端口 9000）"
else
    log_warn "未检测到 ufw，请手动开放端口 9000"
fi
echo ""

# 5. 使用 PM2 启动 webhook 服务器
log_step "5. 启动 Webhook 服务器..."
pm2 start scripts/webhook-server.js --name webhook
pm2 save
log_info "✓ Webhook 服务器已启动"
echo ""

# 6. 检查服务状态
log_step "6. 检查服务状态..."
sleep 2
pm2 status webhook
echo ""

# 7. 测试健康检查
log_step "7. 测试健康检查..."
curl -s http://localhost:9000/health | jq '.' || curl -s http://localhost:9000/health
echo ""

# 8. 获取服务器公网 IP
log_step "8. 获取服务器公网 IP..."
SERVER_IP=$(curl -s ifconfig.me)
log_info "服务器 IP: $SERVER_IP"
echo ""

echo "========================================"
echo "    Webhook 服务器配置完成！"
echo "========================================"
echo ""
log_info "下一步：在 GitHub 仓库中配置 Webhook"
echo ""
echo "配置步骤："
echo "1. 访问 GitHub 仓库: https://github.com/Timking123/hi-veblen"
echo "2. 点击 Settings -> Webhooks -> Add webhook"
echo "3. 填写以下信息："
echo "   - Payload URL: http://$SERVER_IP:9000/webhook"
echo "   - Content type: application/json"
echo "   - Secret: $WEBHOOK_SECRET"
echo "   - Which events: Just the push event"
echo "   - Active: ✓"
echo "4. 点击 Add webhook"
echo ""
log_info "配置完成后，每次推送代码到 main 分支，服务器会自动更新！"
echo ""
log_info "查看日志: pm2 logs webhook"
log_info "重启服务: pm2 restart webhook"
log_info "停止服务: pm2 stop webhook"
