#!/bin/bash
# 启动服务脚本

echo "🚀 启动项目管理机器人服务..."

# 先停止旧服务
pkill -f "node ai-server-claude.js" 2>/dev/null
pkill -f "node bot-with-ai-server.js" 2>/dev/null
sleep 1

# 启动AI服务器
echo "启动AI服务器..."
node ai-server-claude.js &
AI_PID=$!
sleep 2

# 检查AI服务器
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ AI服务器启动成功 (PID: $AI_PID)"
else
    echo "❌ AI服务器启动失败"
    exit 1
fi

# 启动机器人
echo "启动Telegram机器人..."
node bot-with-ai-server.js &
BOT_PID=$!
sleep 2

echo "✅ 所有服务已启动"
echo "   AI服务器 PID: $AI_PID"
echo "   机器人 PID: $BOT_PID"
echo ""
echo "📋 使用说明："
echo "   - 在Telegram群组中发送消息即可"
echo "   - 说'Salon'相关任务会使用通用项目库"
echo "   - 说'BB House'相关任务会使用BB House任务库"
echo "   - 说'LaPure'相关任务会使用LaPure项目库"
echo "   - 不明确的任务会询问属于哪个业务"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待中断信号
trap "echo '停止服务...'; kill $AI_PID $BOT_PID 2>/dev/null; exit" INT
wait