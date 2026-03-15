#!/bin/bash
# 一键修复部署问题

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

echo "========================================"
echo "       一键修复部署问题"
echo "========================================"
echo ""

# 1. 停止后端服务
log_info "1. 停止后端服务..."
pm2 stop admin-backend || log_warn "后端服务未运行"
pm2 delete admin-backend || log_warn "后端服务不存在"
echo ""

# 2. 删除旧数据库和初始化脚本
log_info "2. 清理旧数据库..."
rm -f src/admin/backend/data/admin.db
rm -f scripts/init-database.sh
log_info "✓ 旧数据库已删除"
echo ""

# 3. 确保数据目录存在
log_info "3. 创建数据目录..."
mkdir -p src/admin/backend/data
mkdir -p src/admin/backend/logs
log_info "✓ 数据目录已创建"
echo ""

# 4. 重新启动后端服务（会自动初始化数据库）
log_info "4. 启动后端服务..."
cd src/admin/backend
pm2 start ecosystem.config.js
cd ../..
echo ""

# 5. 等待后端启动
log_info "5. 等待后端启动..."
sleep 5
echo ""

# 6. 检查后端状态
log_info "6. 检查后端状态..."
pm2 status admin-backend
echo ""

# 7. 测试后端 API
log_info "7. 测试后端 API..."
for i in {1..5}; do
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        log_info "✓ 后端 API 正常"
        curl http://localhost:3001/api/health
        echo ""
        break
    else
        log_warn "等待后端启动... ($i/5)"
        sleep 2
    fi
done
echo ""

# 8. 检查数据库
log_info "8. 检查数据库..."
if [ -f "src/admin/backend/data/admin.db" ]; then
    log_info "✓ 数据库已创建"
    ls -lh src/admin/backend/data/admin.db
else
    log_error "✗ 数据库创建失败"
fi
echo ""

# 9. 检查前端文件
log_info "9. 检查前端部署..."
if [ -d "/var/www/html" ] && [ "$(ls -A /var/www/html)" ]; then
    log_info "✓ 前端文件已部署"
    ls -lh /var/www/html/ | head -5
else
    log_warn "前端文件未部署"
    echo "   请在本地运行 npm run build:prod 后上传 dist/ 文件夹"
fi
echo ""

# 10. 测试网站访问
log_info "10. 测试网站访问..."
curl -I http://localhost/ 2>&1 | head -5
echo ""

echo "========================================"
echo "       修复完成！"
echo "========================================"
echo ""
log_info "后续步骤："
echo "1. 在本地 Windows 电脑运行: npm run build:prod"
echo "2. 将 dist/ 文件夹上传到服务器"
echo "3. 在服务器运行: cp -r dist/* /var/www/html/"
echo "4. 访问 https://hi-veblen.com 测试"
echo ""
