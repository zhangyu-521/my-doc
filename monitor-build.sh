#!/bin/bash

echo "开始监控构建过程的系统资源使用情况..."
echo "========================================"

# 创建日志文件
LOG_FILE="build-monitor.log"
echo "时间,CPU使用率(%),内存使用率(%),可用内存(MB)" > $LOG_FILE

# 后台监控函数
monitor_resources() {
    while true; do
        # 获取当前时间
        TIMESTAMP=$(date '+%H:%M:%S')
        
        # 获取CPU使用率 (Windows)
        if command -v wmic &> /dev/null; then
            CPU_USAGE=$(wmic cpu get loadpercentage /value | grep -o '[0-9]*' | head -1)
        else
            # Linux/Mac 备用方案
            CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
        fi
        
        # 获取内存使用情况 (Windows)
        if command -v wmic &> /dev/null; then
            TOTAL_MEM=$(wmic computersystem get TotalPhysicalMemory /value | grep -o '[0-9]*' | head -1)
            AVAIL_MEM=$(wmic OS get AvailablePhysicalMemory /value | grep -o '[0-9]*' | head -1)
            if [ ! -z "$TOTAL_MEM" ] && [ ! -z "$AVAIL_MEM" ]; then
                TOTAL_MEM_MB=$((TOTAL_MEM / 1024 / 1024))
                AVAIL_MEM_MB=$((AVAIL_MEM / 1024))
                USED_MEM_MB=$((TOTAL_MEM_MB - AVAIL_MEM_MB))
                MEM_USAGE=$((USED_MEM_MB * 100 / TOTAL_MEM_MB))
            else
                MEM_USAGE="N/A"
                AVAIL_MEM_MB="N/A"
            fi
        else
            # Linux/Mac 备用方案
            MEM_USAGE=$(free | grep Mem | awk '{printf("%.1f", $3/$2 * 100.0)}')
            AVAIL_MEM_MB=$(free -m | grep Mem | awk '{print $7}')
        fi
        
        # 记录到日志文件
        echo "$TIMESTAMP,$CPU_USAGE,$MEM_USAGE,$AVAIL_MEM_MB" >> $LOG_FILE
        
        # 在控制台显示
        printf "\r[%s] CPU: %s%% | 内存: %s%% | 可用内存: %sMB" "$TIMESTAMP" "$CPU_USAGE" "$MEM_USAGE" "$AVAIL_MEM_MB"
        
        sleep 2
    done
}

# 启动后台监控
monitor_resources &
MONITOR_PID=$!

echo "开始构建..."
echo ""

# 记录构建开始时间
BUILD_START=$(date '+%H:%M:%S')
echo "构建开始时间: $BUILD_START"

# 执行构建
npm run docs:build

# 记录构建结束时间
BUILD_END=$(date '+%H:%M:%S')
echo ""
echo "构建结束时间: $BUILD_END"

# 停止监控
kill $MONITOR_PID 2>/dev/null

echo ""
echo "构建完成！资源使用情况已保存到 $LOG_FILE"
echo ""

# 分析结果
if [ -f "$LOG_FILE" ]; then
    echo "资源使用统计:"
    echo "============="
    
    # 计算平均CPU使用率
    AVG_CPU=$(awk -F',' 'NR>1 && $2!="N/A" {sum+=$2; count++} END {if(count>0) printf("%.1f", sum/count); else print "N/A"}' $LOG_FILE)
    
    # 计算最大CPU使用率
    MAX_CPU=$(awk -F',' 'NR>1 && $2!="N/A" {if($2>max) max=$2} END {print max+0}' $LOG_FILE)
    
    # 计算平均内存使用率
    AVG_MEM=$(awk -F',' 'NR>1 && $3!="N/A" {sum+=$3; count++} END {if(count>0) printf("%.1f", sum/count); else print "N/A"}' $LOG_FILE)
    
    echo "平均 CPU 使用率: ${AVG_CPU}%"
    echo "最大 CPU 使用率: ${MAX_CPU}%"
    echo "平均内存使用率: ${AVG_MEM}%"
    
    echo ""
    echo "详细日志请查看: $LOG_FILE"
fi
