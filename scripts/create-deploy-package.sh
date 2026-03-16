#!/bin/bash

# 创建部署包脚本
# 将所有需要的文件打包，用于手动上传到服务器

echo "=========================================="
echo "创建部署包"
echo "=========================================="

PACKAGE_NAME="deploy-package-$(date +%Y%m%d-%H%M%S).tar.gz"

echo ""
echo "正在打包文件..."

# 创建临时目录
mkdir -p .deploy-temp

# 复制需要的文件
echo "复制源代码..."
rsync -av --exclude='node_modules' \
          --exclude='dist' \
          --exclude='.git' \
          --exclude='.deploy-temp' \
          --exclude='*.tar.gz' \
          . .deploy-temp/

# 打包
echo ""
echo "压缩文件..."
tar -czf "$PACKAGE_NAME" -C .deploy-temp .

# 清理临时目录
rm -rf .deploy-temp

echo ""
echo "✓ 部署包创建完成: $PACKAGE_NAME"
echo ""
echo "文件大小: $(du -h $PACKAGE_NAME | cut -f1)"
echo ""
echo "=========================================="
echo "上传到服务器"
echo "=========================================="
echo ""
echo "方法 1: 使用 SCP 上传"
echo "  scp $PACKAGE_NAME root@120.25.234.223:/tmp/"
echo ""
echo "方法 2: 使用 FTP 工具上传"
echo "  将 $PACKAGE_NAME 上传到服务器 /tmp/ 目录"
echo ""
echo "上传后，在服务器上执行："
echo "  cd /var/www/portfolio"
echo "  tar -xzf /tmp/$PACKAGE_NAME"
echo "  bash scripts/fix-deployment.sh"
echo ""
