#!/bin/bash
# 启动所有服务

echo "🚀 启动项目管理机器人系统..."
echo "================================"

# 停止旧进程
echo "1. 停止旧进程..."
pkill -f "node ai-server-claude.js" 2>/dev/null
pkill -f "node bot-with-ai-server.js" 2>/dev/null
sleep 2

# 启动AI服务器
echo "2. 启动AI服务器..."
node ai-server-claude.js &
AI_PID=$!
sleep 3

# 检查AI服务器
if curl -s -H "x-api-key: ${AI_SERVER_KEY:-supersecret_please_change}" http://localhost:3001/health > /dev/null; then
    echo "   ✅ AI服务器启动成功 (PID: $AI_PID)"
else
    echo "   ❌ AI服务器启动失败"
    exit 1
fi

# 启动机器人
echo "3. 启动Telegram机器人..."
node bot-with-ai-server.js &
BOT_PID=$!
sleep 2

echo "   ✅ 机器人启动成功 (PID: $BOT_PID)"

echo ""
echo "================================"
echo "✅ 系统启动完成！"
echo ""
echo "进程信息:"
echo "  AI服务器 PID: $AI_PID"
echo "  机器人 PID: $BOT_PID"
echo ""
echo "停止所有服务: pkill -f 'node (ai-server|bot-with)'"
echo ""
echo "现在可以在Telegram群里测试："
echo "  - 说'有什么任务' → 列出所有待办任务"
echo "  - 说'查看进度' → 显示统计数字"
echo ""

# 保持脚本运行
wait