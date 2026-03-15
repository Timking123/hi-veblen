#!/bin/bash
# init-server.sh - 服务器初始化脚本
# 用途：一键安装所有必需的依赖和配置

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_info "========================================="
log_info "开始服务器初始化"
log_info "========================================="

# 更新系统
log_info "更新系统包..."
sudo apt-get update

# 安装 Docker
if ! command -v docker &> /dev/null; then
    log_info "安装 Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
else
    log_info "✓ Docker 已安装"
fi

# 安装 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    log_info "安装 Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    log_info "✓ Docker Compose 已安装"
fi

# 安装 Node.js
if ! command -v node &> /dev/null; then
    log_info "安装 Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    log_info "✓ Node.js 已安装"
fi

# 安装 PM2
if ! command -v pm2 &> /dev/null; then
    log_info "安装 PM2..."
    sudo npm install -g pm2
    pm2 startup
else
    log_info "✓ PM2 已安装"
fi

# 安装 Certbot
if ! command -v certbot &> /dev/null; then
    log_info "安装 Certbot..."
    sudo apt-get install -y certbot
else
    log_info "✓ Certbot 已安装"
fi

# 安装其他工具
log_info "安装其他工具..."
sudo apt-get install -y git curl wget sqlite3 dnsutils

# 配置防火墙
log_info "配置防火墙..."
sudo apt-get install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# 创建目录结构
log_info "创建目录结构..."
mkdir -p logs/nginx
mkdir -p backups
mkdir -p src/admin/backend/data
mkdir -p src/admin/backend/logs

log_info "========================================="
log_info "✓ 服务器初始化完成！"
log_info "========================================="
log_warn "请注意："
log_warn "1. 如果是首次安装 Docker，请重新登录以使用户组生效"
log_warn "2. 请配置 SSH 密钥认证并禁用密码登录"
log_warn "3. 请配置域名 DNS 解析"
