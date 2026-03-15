#!/bin/bash
# monitor.sh - 服务监控脚本

HEALTH_URL="http://localhost:3001/api/health"
LOG_FILE="./logs/monitor.log"
ALERT_THRESHOLD=3

check_health() {
    response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null)
    if [ "$response" = "200" ]; then
        return 0
    else
        return 1
    fi
}

mkdir -p ./logs

FAIL_COUNT=0
while true; do
    if check_health; then
        echo "[$(date)] ✓ 服务正常" >> "$LOG_FILE"
        FAIL_COUNT=0
    else
        FAIL_COUNT=$((FAIL_COUNT + 1))
        echo "[$(date)] ✗ 服务异常 (失败次数: $FAIL_COUNT)" >> "$LOG_FILE"
        
        if [ $FAIL_COUNT -ge $ALERT_THRESHOLD ]; then
            echo "[$(date)] ⚠ 告警：服务连续失败 $FAIL_COUNT 次" >> "$LOG_FILE"
        fi
    fi
    
    sleep 30
done
