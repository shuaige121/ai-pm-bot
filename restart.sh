#!/bin/bash
# 重启AI项目管理机器人

echo "🔄 重启AI项目管理机器人..."
echo ""

# 先停止
./stop.sh

echo ""
sleep 2

# 再启动
./start.sh