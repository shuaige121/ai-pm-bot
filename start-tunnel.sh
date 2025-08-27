#!/bin/bash
# start-tunnel.sh
# 启动Cloudflare Tunnel并设置Telegram Webhook

echo "🚀 启动Cloudflare Tunnel..."

# 启动tunnel并捕获输出
cloudflared tunnel --url http://localhost:3000 2>&1 | tee tunnel.log &
TUNNEL_PID=$!

echo "⏳ 等待tunnel连接..."
sleep 5

# 从日志中提取URL
TUNNEL_URL=$(grep -o 'https://.*\.trycloudflare.com' tunnel.log | head -1)

if [ -z "$TUNNEL_URL" ]; then
    echo "❌ 无法获取tunnel URL"
    kill $TUNNEL_PID
    exit 1
fi

echo "✅ Tunnel URL: $TUNNEL_URL"

# 保存URL到文件
echo "TUNNEL_URL=$TUNNEL_URL" > .tunnel-url
echo "WEBHOOK_URL=$TUNNEL_URL/webhook" >> .tunnel-url

# 设置Telegram Webhook
BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-"YOUR_BOT_TOKEN_HERE"}
WEBHOOK_URL="$TUNNEL_URL/webhook"

echo "🔗 设置Telegram Webhook: $WEBHOOK_URL"

# 设置webhook
curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"$WEBHOOK_URL\"}" | python3 -m json.tool

echo ""
echo "📊 Webhook信息:"
curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo" | python3 -m json.tool | grep -E '"url"|"pending_update_count"|"last_error_message"'

echo ""
echo "✅ Tunnel已启动，PID: $TUNNEL_PID"
echo "💡 使用 'kill $TUNNEL_PID' 停止tunnel"
echo ""
echo "现在可以在另一个终端运行:"
echo "  npm start           # Webhook模式"
echo "  npm run start:claude # Claude AI模式"

# 保持tunnel运行
wait $TUNNEL_PID