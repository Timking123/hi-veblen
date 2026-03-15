#!/bin/bash
# build-backend.sh - 构建后端应用
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

log_info "开始构建后端..."

cd src/admin/backend

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    log_info "安装后端依赖..."
    npm install
fi

# 构建后端
log_info "执行后端构建..."
npm run build

cd ../../..

log_info "✓ 后端构建完成"
