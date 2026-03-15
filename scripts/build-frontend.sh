#!/bin/bash
# build-frontend.sh - 前端构建脚本
# 用途：构建主网站和管理后台前端应用

set -e  # 任何命令失败立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 验证构建产物完整性
validate_build() {
    local dist_path="$1"
    local app_name="$2"
    
    log_info "验证 $app_name 构建产物..."
    
    # 检查 dist 目录是否存在
    if [ ! -d "$dist_path" ]; then
        log_error "构建产物目录不存在: $dist_path"
        return 1
    fi
    
    # 检查 index.html 是否存在
    if [ ! -f "$dist_path/index.html" ]; then
        log_error "缺少 index.html 文件"
        return 1
    fi
    
    # 检查 assets 目录是否存在
    if [ ! -d "$dist_path/assets" ]; then
        log_error "缺少 assets 目录"
        return 1
    fi
    
    # 检查是否有 JS 文件
    js_count=$(find "$dist_path/assets" -name "*.js" 2>/dev/null | wc -l)
    if [ "$js_count" -eq 0 ]; then
        log_error "未找到 JavaScript 文件"
        return 1
    fi
    
    # 检查是否有 CSS 文件
    css_count=$(find "$dist_path/assets" -name "*.css" 2>/dev/null | wc -l)
    if [ "$css_count" -eq 0 ]; then
        log_warn "未找到 CSS 文件（可能正常）"
    fi
    
    log_info "✓ $app_name 构建产物验证通过"
    log_info "  - HTML 文件: 存在"
    log_info "  - JavaScript 文件: $js_count 个"
    log_info "  - CSS 文件: $css_count 个"
    
    return 0
}

# 主流程
main() {
    log_info "========================================="
    log_info "开始构建前端应用"
    log_info "========================================="
    
    # 构建主网站前端
    log_info "步骤 1/2: 构建主网站前端..."
    
    if [ ! -f "package.json" ]; then
        log_error "未找到 package.json 文件，请确保在项目根目录执行此脚本"
        exit 1
    fi
    
    log_info "安装依赖..."
    npm ci || {
        log_error "依赖安装失败"
        exit 1
    }
    
    log_info "执行构建..."
    npm run build 2>&1 | tee build-main.log || {
        log_error "主网站构建失败，查看详细日志："
        tail -n 50 build-main.log
        exit 1
    }
    
    # 验证主网站构建产物
    validate_build "dist" "主网站" || exit 1
    
    # 构建管理后台前端（如果存在）
    if [ -d "src/admin/frontend" ]; then
        log_info "步骤 2/2: 构建管理后台前端..."
        
        cd src/admin/frontend
        
        if [ ! -f "package.json" ]; then
            log_warn "管理后台前端未找到 package.json，跳过构建"
            cd ../../..
        else
            log_info "安装依赖..."
            npm ci || {
                log_error "管理后台依赖安装失败"
                cd ../../..
                exit 1
            }
            
            log_info "执行构建..."
            npm run build 2>&1 | tee ../../../build-admin.log || {
                log_error "管理后台构建失败，查看详细日志："
                tail -n 50 ../../../build-admin.log
                cd ../../..
                exit 1
            }
            
            # 验证管理后台构建产物
            validate_build "dist" "管理后台" || {
                cd ../../..
                exit 1
            }
            
            cd ../../..
            log_info "✓ 管理后台前端构建完成"
        fi
    else
        log_info "步骤 2/2: 跳过（管理后台前端目录不存在）"
    fi
    
    log_info "========================================="
    log_info "✓ 前端构建完成！"
    log_info "========================================="
    log_info "主网站构建产物: dist/"
    if [ -d "src/admin/frontend/dist" ]; then
        log_info "管理后台构建产物: src/admin/frontend/dist/"
    fi
}

# 执行主流程
main
