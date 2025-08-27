#!/bin/bash
# AI项目管理机器人启动脚本

echo "🚀 AI项目管理机器人启动脚本"
echo "================================"

# 检查环境
check_env() {
    echo "📋 检查环境配置..."
    
    if [ ! -f .env ]; then
        echo "❌ 缺少 .env 配置文件"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo "❌ 未安装 Node.js"
        exit 1
    fi
    
    if ! command -v whisper-cli &> /dev/null; then
        echo "⚠️ 未安装 Whisper (语音识别将不可用)"
        echo "  安装: brew install whisper-cpp"
    fi
    
    echo "✅ 环境检查通过"
}

# 停止旧进程
stop_services() {
    echo "🛑 停止旧进程..."
    pkill -f "node.*bot-with-ai-server.js" 2>/dev/null
    pkill -f "node.*ai-server-claude.js" 2>/dev/null
    sleep 2
}

# 启动AI服务器
start_ai_server() {
    echo "🧠 启动AI服务器..."
    nohup node ai-server-claude.js > /tmp/ai.log 2>&1 &
    AI_PID=$!
    sleep 3
    
    if ps -p $AI_PID > /dev/null; then
        echo "✅ AI服务器已启动 (PID: $AI_PID)"
    else
        echo "❌ AI服务器启动失败"
        tail -20 /tmp/ai.log
        exit 1
    fi
}

# 启动Bot
start_bot() {
    echo "🤖 启动Telegram Bot..."
    nohup node bot-with-ai-server.js > /tmp/bot.log 2>&1 &
    BOT_PID=$!
    sleep 3
    
    if ps -p $BOT_PID > /dev/null; then
        echo "✅ Bot已启动 (PID: $BOT_PID)"
    else
        echo "❌ Bot启动失败"
        tail -20 /tmp/bot.log
        exit 1
    fi
}

# 显示状态
show_status() {
    echo ""
    echo "================================"
    echo "✅ 系统启动成功！"
    echo ""
    echo "📊 服务状态:"
    echo "  • AI服务器: PID $AI_PID (端口 3001)"
    echo "  • Telegram Bot: PID $BOT_PID"
    echo ""
    echo "📁 日志文件:"
    echo "  • AI服务器: /tmp/ai.log"
    echo "  • Bot: /tmp/bot.log"
    echo ""
    echo "🎤 功能特性:"
    echo "  • 语音识别: Whisper本地模型（免费）"
    echo "  • 语音合成: Google TTS（免费）"
    echo "  • 语音回复: 文字+语音同时发送"
    echo "  • 任务确认: 2分钟超时机制"
    echo "  • 定时任务: 支持每天/每周/每月"
    echo ""
    echo "💡 使用提示:"
    echo "  • 在Telegram群组中@lapureleonardchow_bot"
    echo "  • 或直接在主题中发送消息"
    echo "  • 说'确定'来保存任务到Notion"
    echo ""
    echo "🔧 管理命令:"
    echo "  • 查看日志: tail -f /tmp/bot.log"
    echo "  • 停止服务: ./stop.sh"
    echo "  • 重启服务: ./restart.sh"
}

# 主流程
main() {
    check_env
    stop_services
    start_ai_server
    start_bot
    show_status
}

main