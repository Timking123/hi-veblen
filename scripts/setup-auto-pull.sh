#!/bin/bash
# 设置定时自动拉取
# 用途：配置 cron 定时任务，每 5 分钟检查一次更新

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

echo "========================================"
echo "    设置定时自动拉取"
echo "========================================"
echo ""

# 1. 赋予脚本执行权限
log_step "1. 赋予脚本执行权限..."
chmod +x scripts/auto-pull.sh
log_info "✓ 权限已设置"
echo ""

# 2. 测试脚本
log_step "2. 测试脚本..."
bash scripts/auto-pull.sh
log_info "✓ 脚本测试成功"
echo ""

# 3. 配置 cron 定时任务
log_step "3. 配置 cron 定时任务..."

# 获取项目路径
PROJECT_DIR=$(pwd)

# 创建 cron 任务
CRON_JOB="*/5 * * * * cd $PROJECT_DIR && bash scripts/auto-pull.sh"

# 检查是否已存在
if crontab -l 2>/dev/null | grep -q "auto-pull.sh"; then
    log_warn "定时任务已存在，跳过添加"
else
    # 添加到 crontab
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    log_info "✓ 定时任务已添加"
fi
echo ""

# 4. 显示当前 cron 任务
log_step "4. 当前 cron 任务列表..."
crontab -l | grep "auto-pull.sh" || log_warn "未找到相关任务"
echo ""

echo "========================================"
echo "    定时自动拉取配置完成！"
echo "========================================"
echo ""
log_info "配置说明："
echo "- 检查频率: 每 5 分钟"
echo "- 日志文件: $PROJECT_DIR/logs/auto-pull.log"
echo "- 如有更新: 自动拉取并重启后端服务"
echo ""
log_info "管理命令："
echo "- 查看日志: tail -f logs/auto-pull.log"
echo "- 编辑任务: crontab -e"
echo "- 查看任务: crontab -l"
echo "- 删除任务: crontab -e (删除对应行)"
echo ""
log_info "修改检查频率："
echo "- 每 1 分钟: */1 * * * *"
echo "- 每 5 分钟: */5 * * * * (当前)"
echo "- 每 10 分钟: */10 * * * *"
echo "- 每小时: 0 * * * *"
