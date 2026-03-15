#!/bin/bash
# build-backend.sh - 后端构建脚本
# 用途：编译 TypeScript 后端代码

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

# 主流程
main() {
    log_info "========================================="
    log_info "开始构建后端服务"
    log_info "========================================="
    
    # 检查后端目录是否存在
    if [ ! -d "src/admin/backend" ]; then
        log_error "后端目录不存在: src/admin/backend"
        exit 1
    fi
    
    cd src/admin/backend
    
    # 检查 package.json 是否存在
    if [ ! -f "package.json" ]; then
        log_error "未找到 package.json 文件"
        exit 1
    fi
    
    # 检查 tsconfig.json 是否存在
    if [ ! -f "tsconfig.json" ]; then
        log_error "未找到 tsconfig.json 文件"
        exit 1
    fi
    
    # 安装依赖
    log_info "安装依赖..."
    npm ci || {
        log_error "依赖安装失败"
        exit 1
    }
    
    # 编译 TypeScript
    log_info "编译 TypeScript 代码..."
    npm run build 2>&1 | tee ../../../build-backend.log || {
        log_error "TypeScript 编译失败，查看详细日志："
        tail -n 50 ../../../build-backend.log
        exit 1
    }
    
    # 验证构建产物
    log_info "验证构建产物..."
    
    if [ ! -d "dist" ]; then
        log_error "构建产物目录不存在: dist"
        exit 1
    fi
    
    # 检查是否有 JS 文件
    js_count=$(find dist -name "*.js" 2>/dev/null | wc -l)
    if [ "$js_count" -eq 0 ]; then
        log_error "未找到编译后的 JavaScript 文件"
        exit 1
    fi
    
    log_info "✓ 后端构建产物验证通过"
    log_info "  - JavaScript 文件: $js_count 个"
    log_info "  - 构建产物路径: src/admin/backend/dist/"
    
    cd ../../..
    
    log_info "========================================="
    log_info "✓ 后端构建完成！"
    log_info "========================================="
}

# 执行主流程
main
