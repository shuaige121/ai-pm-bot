#!/bin/bash
# pm2-start.sh
# 使用PM2启动和管理机器人

echo "🚀 启动AI项目管理机器人..."

# 创建日志目录
mkdir -p logs

# 检查PM2是否已安装
if ! command -v pm2 &> /dev/null; then
    echo "PM2未安装，使用本地版本..."
    alias pm2='npx pm2'
fi

# 停止现有进程（如果有）
npx pm2 stop ai-pm-bot 2>/dev/null
npx pm2 delete ai-pm-bot 2>/dev/null

# 启动机器人
echo "📦 启动机器人进程..."
npx pm2 start ecosystem.config.js --only ai-pm-bot

# 显示状态
echo ""
echo "📊 进程状态:"
npx pm2 status

# 显示日志
echo ""
echo "📝 查看日志:"
echo "  npx pm2 logs ai-pm-bot"
echo "  npx pm2 logs ai-pm-bot --lines 100"

echo ""
echo "🛠️ 常用PM2命令:"
echo "  npx pm2 status          # 查看状态"
echo "  npx pm2 restart ai-pm-bot  # 重启"
echo "  npx pm2 stop ai-pm-bot     # 停止"
echo "  npx pm2 logs ai-pm-bot     # 查看日志"
echo "  npx pm2 monit           # 监控面板"

echo ""
echo "✅ 机器人已启动！"