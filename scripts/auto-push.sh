#!/bin/bash
# 自动提交并推送到 GitHub
# 用途：阶段性更新时自动上传代码

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

echo "========================================"
echo "       自动提交并推送到 GitHub"
echo "========================================"
echo ""

# 1. 检查是否有未提交的更改
log_step "1. 检查工作区状态..."
if git diff-index --quiet HEAD --; then
    log_warn "没有需要提交的更改"
    exit 0
fi

# 2. 显示更改的文件
log_step "2. 显示更改的文件..."
git status --short
echo ""

# 3. 添加所有更改
log_step "3. 添加所有更改到暂存区..."
git add .
log_info "✓ 已添加所有更改"
echo ""

# 4. 生成提交信息
log_step "4. 生成提交信息..."
COMMIT_MSG="${1:-阶段性更新 - $(date '+%Y-%m-%d %H:%M:%S')}"
log_info "提交信息: $COMMIT_MSG"
echo ""

# 5. 提交更改
log_step "5. 提交更改..."
git commit -m "$COMMIT_MSG"
log_info "✓ 提交成功"
echo ""

# 6. 推送到 GitHub
log_step "6. 推送到 GitHub..."
git push origin main
log_info "✓ 推送成功"
echo ""

echo "========================================"
echo "       自动上传完成！"
echo "========================================"
echo ""
log_info "查看提交历史: git log --oneline -5"
