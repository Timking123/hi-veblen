#!/bin/bash
# deploy.sh - 一键部署脚本
# 用途：自动化部署流程

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 检查必需的命令
check_requirements() {
    log_step "1/7 检查部署环境..."
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        log_error "缺少必需的命令: docker"
        exit 1
    fi
    
    # 检查 Docker Compose（支持空格版本）
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose 不可用"
        exit 1
    fi
    
    # 检查 Node.js 和 npm
    local commands=("node" "npm")
    for cmd in "${commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "缺少必需的命令: $cmd"
            exit 1
        fi
    done
    
    log_info "✓ 环境检查通过"
}

# 备份当前版本
backup_current() {
    log_step "2/7 备份当前版本..."
    
    local backup_dir="./backups/deployments"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    
    mkdir -p "$backup_dir"
    
    # 备份数据库
    if [ -f "./src/admin/backend/data/admin.db" ]; then
        cp "./src/admin/backend/data/admin.db" "$backup_dir/admin_db_$timestamp.db"
        log_info "✓ 数据库已备份"
    fi
    
    # 记录当前 Git 版本
    git rev-parse HEAD > "$backup_dir/version_$timestamp.txt" 2>/dev/null || true
    log_info "✓ 版本信息已保存"
}

# 构建应用
build_app() {
    log_step "3/7 构建应用..."
    
    # 构建前端
    log_info "构建前端..."
    bash ./scripts/build-frontend.sh || {
        log_error "前端构建失败"
        exit 1
    }
    
    # 构建后端
    log_info "构建后端..."
    bash ./scripts/build-backend.sh || {
        log_error "后端构建失败"
        exit 1
    }
    
    log_info "✓ 应用构建完成"
}

# 构建 Docker 镜像
build_docker() {
    log_step "4/7 构建 Docker 镜像..."
    
    docker compose build || {
        log_error "Docker 镜像构建失败"
        exit 1
    }
    
    log_info "✓ Docker 镜像构建完成"
}

# 初始化数据库
init_database() {
    log_step "5/7 初始化数据库..."
    
    if [ ! -f "./src/admin/backend/data/admin.db" ]; then
        bash ./scripts/init-database.sh || {
            log_error "数据库初始化失败"
            exit 1
        }
    else
        log_info "数据库已存在，跳过初始化"
    fi
}

# 部署服务
deploy_services() {
    log_step "6/7 部署服务..."
    
    # 启动 Nginx 容器
    log_info "启动 Nginx 容器..."
    docker compose up -d || {
        log_error "Nginx 容器启动失败"
        exit 1
    }
    
    # 启动后端服务
    log_info "启动后端服务..."
    cd src/admin/backend
    
    # 检查 PM2 是否已安装
    if ! command -v pm2 &> /dev/null; then
        log_warn "PM2 未安装，使用 npm 安装..."
        npm install -g pm2
    fi
    
    # 启动或重启 PM2 进程
    pm2 restart ecosystem.config.js --env production 2>/dev/null || \
    pm2 start ecosystem.config.js --env production || {
        log_error "后端服务启动失败"
        cd ../..
        exit 1
    }
    
    pm2 save
    cd ../..
    
    log_info "✓ 服务部署完成"
}

# 健康检查
health_check() {
    log_step "7/7 执行健康检查..."
    
    sleep 5
    
    # 检查 Nginx
    if curl -f http://localhost/ > /dev/null 2>&1; then
        log_info "✓ Nginx 运行正常"
    else
        log_error "✗ Nginx 健康检查失败"
        return 1
    fi
    
    # 检查后端
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        log_info "✓ 后端服务运行正常"
    else
        log_warn "✗ 后端健康检查失败（可能需要等待服务启动）"
    fi
    
    log_info "✓ 健康检查完成"
}

# 主流程
main() {
    echo "========================================="
    echo "开始部署流程"
    echo "========================================="
    
    check_requirements
    backup_current
    build_app
    build_docker
    init_database
    deploy_services
    health_check
    
    echo "========================================="
    echo "✓ 部署完成！"
    echo "========================================="
    echo ""
    echo "访问地址:"
    echo "  - 主网站: http://localhost"
    echo "  - 管理后台: http://localhost/admin"
    echo "  - 后端 API: http://localhost:3001/api"
    echo ""
    echo "查看服务状态:"
    echo "  - Docker: docker compose ps"
    echo "  - PM2: pm2 status"
    echo ""
    echo "查看日志:"
    echo "  - Nginx: docker compose logs nginx"
    echo "  - 后端: pm2 logs admin-backend"
}

# 执行部署
main
