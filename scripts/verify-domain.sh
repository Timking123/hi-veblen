#!/bin/bash
# verify-domain.sh - 域名验证脚本
# 用途：验证域名格式和 DNS 解析

DOMAIN="${1:-hi-veblen.com}"
SERVER_IP="${2:-120.25.234.223}"

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

log_info "验证域名: $DOMAIN"

# 验证域名格式
if [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
    log_error "域名格式无效: $DOMAIN"
    exit 1
fi

log_info "✓ 域名格式有效"

# 检查 DNS 解析
log_info "检查 DNS 解析..."

if ! command -v dig &> /dev/null; then
    log_warn "dig 命令未安装，跳过 DNS 解析检查"
    log_info "安装方法: sudo apt-get install dnsutils"
    exit 0
fi

RESOLVED_IP=$(dig +short "$DOMAIN" | tail -n1)

if [ -z "$RESOLVED_IP" ]; then
    log_error "域名未解析或解析失败"
    log_info "请在域名服务商控制台配置 A 记录："
    log_info "  类型: A"
    log_info "  主机记录: @"
    log_info "  记录值: $SERVER_IP"
    exit 1
fi

log_info "域名解析结果: $RESOLVED_IP"

if [ "$SERVER_IP" != "请替换为你的服务器IP" ] && [ "$RESOLVED_IP" != "$SERVER_IP" ]; then
    log_warn "域名解析 IP 与服务器 IP 不匹配"
    log_info "  解析 IP: $RESOLVED_IP"
    log_info "  服务器 IP: $SERVER_IP"
else
    log_info "✓ 域名解析正确"
fi
