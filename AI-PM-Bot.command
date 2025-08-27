#!/bin/bash
# AI PM Bot Mac App Launcher

cd "$(dirname "$0")"

# 设置终端标题
echo -e "\033]0;AI项目管理机器人\007"
clear

# 显示Logo
cat << "EOF"
    ╔═══════════════════════════════════════╗
    ║     AI 项目管理机器人 Mac 版         ║
    ║        Telegram + Notion              ║
    ╚═══════════════════════════════════════╝
EOF

# 主菜单
show_menu() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  请选择操作："
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  1) 🚀 启动机器人"
    echo "  2) 🛑 停止机器人"
    echo "  3) 🔄 重启机器人"
    echo "  4) 📊 查看状态"
    echo "  5) 📜 查看实时日志"
    echo "  6) 🔧 配置设置"
    echo "  7) 🧪 测试功能"
    echo "  8) 📖 使用帮助"
    echo "  9) 🚪 退出"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -n "  选择 [1-9]: "
}

# 启动服务
start_services() {
    echo ""
    echo "🚀 正在启动服务..."
    ./start.sh
    echo ""
    echo "按回车键返回主菜单..."
    read
}

# 停止服务
stop_services() {
    echo ""
    echo "🛑 正在停止服务..."
    ./stop.sh
    echo ""
    echo "按回车键返回主菜单..."
    read
}

# 重启服务
restart_services() {
    echo ""
    echo "🔄 正在重启服务..."
    ./restart.sh
    echo ""
    echo "按回车键返回主菜单..."
    read
}

# 查看状态
check_status() {
    echo ""
    ./status.sh
    echo ""
    echo "按回车键返回主菜单..."
    read
}

# 查看日志
view_logs() {
    echo ""
    echo "📜 选择日志类型："
    echo "  1) Bot日志"
    echo "  2) AI服务器日志"
    echo "  3) 返回"
    echo -n "选择: "
    read log_choice
    
    case $log_choice in
        1)
            echo "查看Bot日志 (按Ctrl+C退出)..."
            tail -f /tmp/bot.log
            ;;
        2)
            echo "查看AI服务器日志 (按Ctrl+C退出)..."
            tail -f /tmp/ai.log
            ;;
        *)
            return
            ;;
    esac
}

# 配置设置
configure() {
    echo ""
    echo "🔧 配置管理："
    echo "  1) 查看当前配置"
    echo "  2) 编辑配置文件"
    echo "  3) 测试Telegram连接"
    echo "  4) 测试Notion连接"
    echo "  5) 返回"
    echo -n "选择: "
    read config_choice
    
    case $config_choice in
        1)
            echo ""
            echo "当前配置："
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            grep -E "^[^#]" .env | head -10
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            ;;
        2)
            nano .env
            ;;
        3)
            echo "测试Telegram连接..."
            node -e "
            require('dotenv').config();
            const TelegramBot = require('node-telegram-bot-api');
            const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {polling: false});
            bot.getMe().then(info => {
                console.log('✅ Telegram连接成功');
                console.log('Bot用户名:', info.username);
            }).catch(err => {
                console.log('❌ Telegram连接失败:', err.message);
            });
            "
            ;;
        4)
            echo "测试Notion连接..."
            node -e "
            require('dotenv').config();
            const { Client } = require('@notionhq/client');
            const notion = new Client({ auth: process.env.NOTION_API_KEY });
            notion.databases.retrieve({ database_id: process.env.NOTION_PROJECT_DB_ID })
                .then(() => console.log('✅ Notion连接成功'))
                .catch(err => console.log('❌ Notion连接失败:', err.message));
            "
            ;;
    esac
    
    echo ""
    echo "按回车键返回主菜单..."
    read
}

# 测试功能
test_features() {
    echo ""
    echo "🧪 功能测试："
    echo "  1) 测试所有功能"
    echo "  2) 测试语音功能"
    echo "  3) 发送测试消息"
    echo "  4) 返回"
    echo -n "选择: "
    read test_choice
    
    case $test_choice in
        1)
            node test-all-features.js
            ;;
        2)
            echo "测试语音合成..."
            node -e "
            const { textToSpeechLocal } = require('./voice-service-local.js');
            textToSpeechLocal('测试语音功能').then(path => {
                console.log('✅ 语音生成成功:', path);
            }).catch(err => {
                console.log('❌ 语音生成失败:', err.message);
            });
            "
            ;;
        3)
            echo "发送测试消息到Telegram..."
            node -e "
            require('dotenv').config();
            const TelegramBot = require('node-telegram-bot-api');
            const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {polling: false});
            bot.sendMessage(process.env.TELEGRAM_GROUP_ID, '🧪 测试消息：系统运行正常')
                .then(() => console.log('✅ 消息发送成功'))
                .catch(err => console.log('❌ 发送失败:', err.message));
            "
            ;;
    esac
    
    echo ""
    echo "按回车键返回主菜单..."
    read
}

# 显示帮助
show_help() {
    clear
    cat << "EOF"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         AI项目管理机器人 使用帮助
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 功能介绍：
  • 智能对话理解（Claude AI）
  • 语音消息识别（Whisper）
  • 语音回复合成（gTTS）
  • 自动任务管理（Notion）
  • 定时任务提醒

💬 使用方法：
  1. 在Telegram群组中@机器人
  2. 发送文字或语音消息
  3. 机器人会回复文字+语音
  4. 说"确定"保存任务

📝 示例命令：
  • "为办公室买打印机" - 创建任务
  • "有什么任务" - 查看任务列表
  • "打印机买好了" - 完成任务
  • "每周五提交周报" - 定时任务

⚙️ 配置要求：
  • macOS 10.15+
  • Node.js 16+
  • Claude CLI (已登录)
  • Whisper (可选)

🔧 故障排除：
  • Bot不回复：检查群组权限
  • 语音失败：检查网络连接
  • AI错误：重新登录Claude

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
    echo ""
    echo "按回车键返回主菜单..."
    read
}

# 主循环
while true; do
    clear
    show_menu
    read choice
    
    case $choice in
        1) start_services ;;
        2) stop_services ;;
        3) restart_services ;;
        4) check_status ;;
        5) view_logs ;;
        6) configure ;;
        7) test_features ;;
        8) show_help ;;
        9) 
            echo ""
            echo "👋 再见！"
            exit 0
            ;;
        *)
            echo "无效选择，请重试"
            sleep 1
            ;;
    esac
done