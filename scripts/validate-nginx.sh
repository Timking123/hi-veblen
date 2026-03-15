#!/bin/bash
# validate-nginx.sh - Nginx 配置验证脚本
# 用途：验证 Nginx 配置文件语法和完整性

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_info "验证 Nginx 配置..."

# 检查配置文件是否存在
if [ ! -f "nginx.conf" ]; then
    log_error "nginx.conf 文件不存在"
    exit 1
fi

# 使用 Docker 容器验证配置语法
log_info "检查配置语法..."
docker run --rm -v "$(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro" nginx:alpine nginx -t || {
    log_error "Nginx 配置语法错误"
    exit 1
}

log_info "✓ Nginx 配置验证通过"
