#!/bin/bash
# 自动拉取 GitHub 最新代码
# 用途：定时检查并拉取更新，如有更新则重新部署

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

PROJECT_DIR="/var/www/portfolio"
LOG_FILE="$PROJECT_DIR/logs/auto-pull.log"

# 创建日志目录
mkdir -p "$PROJECT_DIR/logs"

# 记录日志
log_to_file() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log_to_file "========== 开始检查更新 =========="

cd "$PROJECT_DIR"

# 获取当前提交 hash
BEFORE=$(git rev-parse HEAD)
log_to_file "当前版本: $BEFORE"

# 拉取最新代码
log_to_file "正在拉取最新代码..."
git fetch origin main

# 获取远程提交 hash
AFTER=$(git rev-parse origin/main)
log_to_file "远程版本: $AFTER"

# 检查是否有更新
if [ "$BEFORE" != "$AFTER" ]; then
    log_to_file "检测到更新，开始部署..."
    
    # 拉取代码
    git pull origin main
    log_to_file "✓ 代码已更新"
    
    # 安装依赖（如果 package.json 有变化）
    if git diff --name-only $BEFORE $AFTER | grep -q "package.json"; then
        log_to_file "检测到依赖变化，正在安装..."
        npm install --production
        log_to_file "✓ 依赖已更新"
    fi
    
    # 重启后端服务
    log_to_file "正在重启后端服务..."
    cd src/admin/backend
    pm2 restart admin-backend
    log_to_file "✓ 后端服务已重启"
    
    log_to_file "========== 部署完成！ =========="
    
    # 发送通知（可选）
    # curl -X POST "https://your-notification-service.com/notify" \
    #   -d "message=服务器已自动更新到最新版本"
    
else
    log_to_file "没有更新，跳过部署"
    log_to_file "========== 检查完成 =========="
fi
