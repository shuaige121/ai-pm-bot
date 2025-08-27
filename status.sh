#!/bin/bash
# 查看服务状态

echo "📊 AI项目管理机器人状态"
echo "================================"

# 检查AI服务器
AI_PID=$(pgrep -f "node.*ai-server-claude.js")
if [ ! -z "$AI_PID" ]; then
    echo "✅ AI服务器: 运行中 (PID: $AI_PID)"
    # 测试连接
    curl -s http://localhost:3001/health > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "   连接状态: 正常"
    else
        echo "   连接状态: 异常"
    fi
else
    echo "❌ AI服务器: 未运行"
fi

# 检查Bot
BOT_PID=$(pgrep -f "node.*bot-with-ai-server.js")
if [ ! -z "$BOT_PID" ]; then
    echo "✅ Telegram Bot: 运行中 (PID: $BOT_PID)"
else
    echo "❌ Telegram Bot: 未运行"
fi

echo ""
echo "📁 最近日志:"
echo "--- Bot日志 ---"
tail -5 /tmp/bot.log 2>/dev/null || echo "无日志"
echo ""
echo "--- AI服务器日志 ---"
tail -5 /tmp/ai.log 2>/dev/null || echo "无日志"

echo ""
echo "💡 提示: 使用 tail -f /tmp/bot.log 查看实时日志"