#!/bin/bash

# ============================================
# 后台管理系统快速部署脚本
# ============================================
# 
# 功能：
# 1. 构建前端和后端
# 2. 部署到指定目录
# 3. 配置 Nginx
# 4. 启动服务
#
# 使用方法：
#   chmod +x deploy.sh
#   ./deploy.sh [选项]
#
# 选项：
#   --frontend-only  只部署前端
#   --backend-only   只部署后端
#   --nginx-only     只配置 Nginx
#   --help           显示帮助信息
# ============================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
FRONTEND_DIR="frontend"
BACKEND_DIR="backend"
DEPLOY_FRONTEND_DIR="/var/www/admin"
DEPLOY_BACKEND_DIR="/var/www/admin-backend"
NGINX_CONFIG_SOURCE="nginx.conf"
NGINX_CONFIG_DEST="/etc/nginx/sites-available/admin"
DOMAIN="admin.huangyanjie.com"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    cat << EOF
后台管理系统部署脚本

使用方法：
  ./deploy.sh [选项]

选项：
  --frontend-only    只部署前端
  --backend-only     只部署后端
  --nginx-only       只配置 Nginx
  --skip-build       跳过构建步骤（使用已有的构建产物）
  --domain DOMAIN    指定域名（默认：admin.huangyanjie.com）
  --help             显示此帮助信息

示例：
  ./deploy.sh                          # 完整部署
  ./deploy.sh --frontend-only          # 只部署前端
  ./deploy.sh --backend-only           # 只部署后端
  ./deploy.sh --domain admin.example.com  # 指定域名部署

EOF
}

# 检查是否为 root 用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用 sudo 运行此脚本"
        exit 1
    fi
}

# 检查必要的命令是否存在
check_dependencies() {
    log_info "检查依赖..."
    
    local missing_deps=()
    
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    if ! command -v nginx &> /dev/null; then
        missing_deps+=("nginx")
    fi
    
    if ! command -v pm2 &> /dev/null; then
        missing_deps+=("pm2")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "缺少以下依赖: ${missing_deps[*]}"
        log_info "请先安装缺少的依赖，参考 DEPLOYMENT.md"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 构建前端
build_frontend() {
    log_info "开始构建前端..."
    
    cd "$FRONTEND_DIR"
    
    # 安装依赖
    if [ ! -d "node_modules" ]; then
        log_info "安装前端依赖..."
        npm install
    fi
    
    # 构建
    log_info "构建前端..."
    npm run build
    
    if [ ! -d "dist" ]; then
        log_error "前端构建失败：dist 目录不存在"
        exit 1
    fi
    
    cd ..
    log_success "前端构建完成"
}

# 部署前端
deploy_frontend() {
    log_info "开始部署前端..."
    
    # 备份旧版本
    if [ -d "$DEPLOY_FRONTEND_DIR" ]; then
        local backup_dir="${DEPLOY_FRONTEND_DIR}.backup.$(date +%Y%m%d%H%M%S)"
        log_info "备份旧版本到 $backup_dir"
        mv "$DEPLOY_FRONTEND_DIR" "$backup_dir"
    fi
    
    # 创建部署目录
    mkdir -p "$DEPLOY_FRONTEND_DIR"
    
    # 复制文件
    log_info "复制前端文件..."
    cp -r "$FRONTEND_DIR/dist/"* "$DEPLOY_FRONTEND_DIR/"
    
    # 设置权限
    chown -R www-data:www-data "$DEPLOY_FRONTEND_DIR"
    chmod -R 755 "$DEPLOY_FRONTEND_DIR"
    
    log_success "前端部署完成"
}

# 构建后端
build_backend() {
    log_info "开始构建后端..."
    
    cd "$BACKEND_DIR"
    
    # 安装依赖
    if [ ! -d "node_modules" ]; then
        log_info "安装后端依赖..."
        npm install
    fi
    
    # 构建
    log_info "构建后端..."
    npm run build
    
    if [ ! -d "dist" ]; then
        log_error "后端构建失败：dist 目录不存在"
        exit 1
    fi
    
    cd ..
    log_success "后端构建完成"
}

# 部署后端
deploy_backend() {
    log_info "开始部署后端..."
    
    # 备份旧版本
    if [ -d "$DEPLOY_BACKEND_DIR" ]; then
        local backup_dir="${DEPLOY_BACKEND_DIR}.backup.$(date +%Y%m%d%H%M%S)"
        log_info "备份旧版本到 $backup_dir"
        cp -r "$DEPLOY_BACKEND_DIR" "$backup_dir"
    fi
    
    # 创建部署目录
    mkdir -p "$DEPLOY_BACKEND_DIR"
    mkdir -p "$DEPLOY_BACKEND_DIR/data"
    mkdir -p "$DEPLOY_BACKEND_DIR/logs"
    
    # 复制文件
    log_info "复制后端文件..."
    cp -r "$BACKEND_DIR/dist" "$DEPLOY_BACKEND_DIR/"
    cp -r "$BACKEND_DIR/node_modules" "$DEPLOY_BACKEND_DIR/"
    cp "$BACKEND_DIR/package.json" "$DEPLOY_BACKEND_DIR/"
    cp "$BACKEND_DIR/ecosystem.config.js" "$DEPLOY_BACKEND_DIR/"
    
    # 复制环境变量文件（如果存在）
    if [ -f "$BACKEND_DIR/.env" ]; then
        cp "$BACKEND_DIR/.env" "$DEPLOY_BACKEND_DIR/"
    else
        log_warning ".env 文件不存在，请手动创建"
    fi
    
    # 设置权限
    chown -R $SUDO_USER:$SUDO_USER "$DEPLOY_BACKEND_DIR"
    chmod -R 755 "$DEPLOY_BACKEND_DIR"
    
    log_success "后端部署完成"
}

# 初始化数据库
init_database() {
    log_info "检查数据库..."
    
    if [ ! -f "$DEPLOY_BACKEND_DIR/data/admin.db" ]; then
        log_info "初始化数据库..."
        cd "$DEPLOY_BACKEND_DIR"
        sudo -u $SUDO_USER node dist/database/init.js
        cd -
        log_success "数据库初始化完成"
    else
        log_info "数据库已存在，跳过初始化"
    fi
}

# 重启后端服务
restart_backend_service() {
    log_info "重启后端服务..."
    
    cd "$DEPLOY_BACKEND_DIR"
    
    # 检查服务是否已存在
    if sudo -u $SUDO_USER pm2 list | grep -q "admin-backend"; then
        log_info "重启现有服务..."
        sudo -u $SUDO_USER pm2 restart admin-backend
    else
        log_info "启动新服务..."
        sudo -u $SUDO_USER pm2 start ecosystem.config.js
        sudo -u $SUDO_USER pm2 save
    fi
    
    cd -
    
    # 等待服务启动
    sleep 3
    
    # 检查服务状态
    if sudo -u $SUDO_USER pm2 list | grep -q "online"; then
        log_success "后端服务启动成功"
    else
        log_error "后端服务启动失败"
        sudo -u $SUDO_USER pm2 logs admin-backend --lines 20
        exit 1
    fi
}

# 配置 Nginx
configure_nginx() {
    log_info "配置 Nginx..."
    
    # 检查配置文件是否存在
    if [ ! -f "$NGINX_CONFIG_SOURCE" ]; then
        log_error "Nginx 配置文件不存在: $NGINX_CONFIG_SOURCE"
        exit 1
    fi
    
    # 替换域名
    log_info "替换域名为: $DOMAIN"
    sed "s/admin\.huangyanjie\.com/$DOMAIN/g" "$NGINX_CONFIG_SOURCE" > /tmp/nginx_admin.conf
    
    # 复制配置文件
    cp /tmp/nginx_admin.conf "$NGINX_CONFIG_DEST"
    rm /tmp/nginx_admin.conf
    
    # 创建软链接
    if [ ! -L "/etc/nginx/sites-enabled/admin" ]; then
        ln -s "$NGINX_CONFIG_DEST" /etc/nginx/sites-enabled/admin
    fi
    
    # 测试配置
    log_info "测试 Nginx 配置..."
    if nginx -t; then
        log_success "Nginx 配置测试通过"
        
        # 重载 Nginx
        log_info "重载 Nginx..."
        systemctl reload nginx
        log_success "Nginx 重载完成"
    else
        log_error "Nginx 配置测试失败"
        exit 1
    fi
}

# 显示部署信息
show_deployment_info() {
    cat << EOF

${GREEN}============================================
部署完成！
============================================${NC}

${BLUE}访问地址：${NC}
  https://$DOMAIN

${BLUE}后端服务：${NC}
  状态：$(sudo -u $SUDO_USER pm2 list | grep admin-backend | awk '{print $10}')
  查看日志：sudo -u $SUDO_USER pm2 logs admin-backend

${BLUE}Nginx 配置：${NC}
  配置文件：$NGINX_CONFIG_DEST
  访问日志：/var/log/nginx/admin_access.log
  错误日志：/var/log/nginx/admin_error.log

${BLUE}数据库：${NC}
  位置：$DEPLOY_BACKEND_DIR/data/admin.db

${YELLOW}注意事项：${NC}
  1. 如果使用 HTTPS，请先申请 SSL 证书
  2. 首次登录请使用默认账户（参考文档）
  3. 登录后请立即修改密码
  4. 定期备份数据库文件

${BLUE}更多信息请查看：${NC}
  - DEPLOYMENT.md（详细部署文档）
  - README.md（项目说明）

EOF
}

# 主函数
main() {
    local deploy_frontend=true
    local deploy_backend=true
    local deploy_nginx=true
    local skip_build=false
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --frontend-only)
                deploy_backend=false
                deploy_nginx=false
                shift
                ;;
            --backend-only)
                deploy_frontend=false
                deploy_nginx=false
                shift
                ;;
            --nginx-only)
                deploy_frontend=false
                deploy_backend=false
                shift
                ;;
            --skip-build)
                skip_build=true
                shift
                ;;
            --domain)
                DOMAIN="$2"
                shift 2
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    log_info "开始部署后台管理系统..."
    log_info "域名: $DOMAIN"
    
    # 检查权限
    check_root
    
    # 检查依赖
    check_dependencies
    
    # 部署前端
    if [ "$deploy_frontend" = true ]; then
        if [ "$skip_build" = false ]; then
            build_frontend
        fi
        deploy_frontend
    fi
    
    # 部署后端
    if [ "$deploy_backend" = true ]; then
        if [ "$skip_build" = false ]; then
            build_backend
        fi
        deploy_backend
        init_database
        restart_backend_service
    fi
    
    # 配置 Nginx
    if [ "$deploy_nginx" = true ]; then
        configure_nginx
    fi
    
    # 显示部署信息
    show_deployment_info
}

# 执行主函数
main "$@"
