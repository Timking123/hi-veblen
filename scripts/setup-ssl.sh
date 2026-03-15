#!/bin/bash
# setup-ssl.sh - SSL 证书申请脚本
# 用途：使用 Let's Encrypt 申请免费 SSL 证书

set -e

DOMAIN="hi-veblen.com"
EMAIL="1243222867@qq.com"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_info "开始申请 SSL 证书..."
log_info "域名: $DOMAIN"
log_info "邮箱: $EMAIL"

# 检查 Certbot 是否已安装
if ! command -v certbot &> /dev/null; then
    log_info "安装 Certbot..."
    sudo apt-get update
    sudo apt-get install -y certbot
fi

# 停止 Nginx 容器（如果正在运行）
log_info "停止 Nginx 容器..."
docker-compose down 2>/dev/null || true

# 申请证书（standalone 模式）
log_info "申请 SSL 证书..."
sudo certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" || {
    log_error "SSL 证书申请失败"
    log_warn "系统将继续以 HTTP 模式运行"
    exit 1
}

log_info "✓ SSL 证书申请成功"
log_info "证书路径: /etc/letsencrypt/live/$DOMAIN/"

# 配置证书自动续期
log_info "配置证书自动续期..."
(crontab -l 2>/dev/null || true; echo "0 2 * * * certbot renew --quiet --post-hook 'docker-compose restart nginx'") | crontab -

log_info "✓ 证书自动续期已配置（每天凌晨 2 点检查）"
