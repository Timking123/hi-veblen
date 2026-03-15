#!/bin/bash
# verify-deployment.sh - 部署验证脚本

DOMAIN="${1:-localhost}"
PASSED=0
FAILED=0

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

test_case() {
    local name="$1"
    local command="$2"
    
    echo -n "测试: $name ... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 通过${NC}"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ 失败${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo "========================================="
echo "开始部署验证"
echo "========================================="

# 验证测试
test_case "前端页面加载" "curl -f -s http://$DOMAIN/ | grep -q '<title>'"
test_case "后端健康检查" "curl -f -s http://$DOMAIN:3001/api/health | grep -q '\"status\":\"ok\"'"
test_case "Docker 容器运行" "docker ps | grep -q portfolio-nginx"
test_case "PM2 进程运行" "pm2 list | grep -q admin-backend"

echo "========================================="
echo "验证完成"
echo "通过: $PASSED, 失败: $FAILED"
echo "========================================="

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过${NC}"
    exit 0
else
    echo -e "${RED}✗ 部分测试失败${NC}"
    exit 1
fi
