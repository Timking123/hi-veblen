#!/bin/bash
# backup.sh - 数据库备份脚本

set -e

DB_PATH="./src/admin/backend/data/admin.db"
BACKUP_DIR="./backups"
RETENTION_DAYS=30

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/admin_db_$TIMESTAMP.db"

log_info "开始备份数据库..."

if [ -f "$DB_PATH" ]; then
    cp "$DB_PATH" "$BACKUP_FILE"
    gzip "$BACKUP_FILE"
    log_info "✓ 备份完成: ${BACKUP_FILE}.gz"
    
    # 清理旧备份
    find "$BACKUP_DIR" -name "admin_db_*.db.gz" -mtime +$RETENTION_DAYS -delete
    log_info "✓ 已清理 $RETENTION_DAYS 天前的旧备份"
    
    # 显示备份列表
    echo ""
    echo "当前备份列表："
    ls -lh "$BACKUP_DIR"
else
    log_error "数据库文件不存在: $DB_PATH"
    exit 1
fi
