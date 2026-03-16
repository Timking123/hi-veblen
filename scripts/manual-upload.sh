#!/bin/bash

# 手动上传部署脚本
# 当服务器无法连接 GitHub 时使用

echo "=========================================="
echo "手动上传部署文件"
echo "=========================================="

# 使用 SCP 上传文件到服务器
# 用法: bash scripts/manual-upload.sh

SERVER_HOST="120.25.234.223"
SERVER_USER="root"
SERVER_PATH="/var/www/portfolio"

echo ""
echo "正在上传文件到服务器..."

# 上传部署脚本
scp scripts/fix-deployment.sh ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/scripts/

# 上传 package.json（包含 build:skip-check 脚本）
scp package.json ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/

# 上传 CI 配置（可选）
scp .github/workflows/ci.yml ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/.github/workflows/
scp .github/workflows/deploy-gh-pages.yml ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/.github/workflows/
scp .github/workflows/deploy.yml ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/.github/workflows/

echo ""
echo "✓ 文件上传完成！"
echo ""
echo "现在可以在服务器上执行："
echo "  cd /var/www/portfolio"
echo "  bash scripts/fix-deployment.sh"
echo ""
