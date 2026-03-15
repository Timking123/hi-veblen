#!/bin/bash
# 诊断和修复部署问题

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

echo "========================================"
echo "       部署问题诊断和修复"
echo "========================================"
echo ""

# 1. 检查后端服务状态
log_info "1. 检查后端服务状态..."
pm2 status admin-backend || log_warn "后端服务未运行"
echo ""

# 2. 检查数据库文件
log_info "2. 检查数据库文件..."
if [ -f "src/admin/backend/data/admin.db" ]; then
    log_info "数据库文件存在"
    ls -lh src/admin/backend/data/admin.db
else
    log_warn "数据库文件不存在"
fi
echo ""

# 3. 检查前端构建产物
log_info "3. 检查前端构建产物..."
if [ -d "dist" ]; then
    log_info "前端构建产物存在"
    ls -lh dist/ | head -10
else
    log_error "前端构建产物不存在"
fi
echo ""

# 4. 检查 Nginx 状态
log_info "4. 检查 Nginx 状态..."
systemctl status nginx --no-pager | head -10
echo ""

# 5. 测试后端 API
log_info "5. 测试后端 API..."
curl -s http://localhost:3001/api/health || log_error "后端 API 无响应"
echo ""

# 6. 提供修复建议
echo "========================================"
echo "       修复建议"
echo "========================================"
echo ""

if [ ! -d "dist" ]; then
    log_warn "前端构建产物缺失"
    echo "   解决方案："
    echo "   1. 在本地 Windows 电脑运行: npm run build:prod"
    echo "   2. 将 dist/ 文件夹上传到服务器"
    echo "   3. 运行: cp -r dist/* /var/www/html/"
    echo ""
fi

if [ -f "src/admin/backend/data/admin.db" ]; then
    log_warn "数据库可能有 schema 问题"
    echo "   解决方案："
    echo "   1. 停止后端: pm2 stop admin-backend"
    echo "   2. 删除旧数据库: rm -f src/admin/backend/data/admin.db"
    echo "   3. 删除旧脚本: rm -f scripts/init-database.sh"
    echo "   4. 重启后端: cd src/admin/backend && pm2 start ecosystem.config.js"
    echo "   5. 后端会自动创建正确的数据库"
    echo ""
fi

log_info "诊断完成！"
