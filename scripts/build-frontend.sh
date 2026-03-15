#!/bin/bash
# build-frontend.sh - 构建前端应用
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

log_info "开始构建前端..."

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    log_info "安装前端依赖..."
    npm install
fi

# 构建前端
log_info "执行前端构建..."
npm run build

log_info "✓ 前端构建完成"
