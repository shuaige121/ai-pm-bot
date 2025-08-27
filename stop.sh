#!/bin/bash
# 停止AI项目管理机器人

echo "🛑 停止AI项目管理机器人..."

# 停止Bot
BOT_PID=$(pgrep -f "node.*bot-with-ai-server.js")
if [ ! -z "$BOT_PID" ]; then
    kill $BOT_PID
    echo "✅ Bot已停止 (PID: $BOT_PID)"
else
    echo "⚠️ Bot未运行"
fi

# 停止AI服务器
AI_PID=$(pgrep -f "node.*ai-server-claude.js")
if [ ! -z "$AI_PID" ]; then
    kill $AI_PID
    echo "✅ AI服务器已停止 (PID: $AI_PID)"
else
    echo "⚠️ AI服务器未运行"
fi

echo "✅ 所有服务已停止"