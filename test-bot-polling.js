// test-bot-polling.js
// 简单测试Bot轮询是否正常

const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROUP_ID = process.env.TELEGRAM_GROUP_ID;

console.log('🧪 测试Bot轮询功能');
console.log('Token:', TOKEN.substring(0, 10) + '...');
console.log('Group ID:', GROUP_ID);

// 创建bot实例
const bot = new TelegramBot(TOKEN, { 
    polling: true,
    request: {
        agentOptions: {
            keepAlive: true,
            family: 4
        }
    }
});

// 监听所有消息
bot.on('message', (msg) => {
    console.log('📨 收到消息:');
    console.log('  来自:', msg.from.username || msg.from.first_name);
    console.log('  内容:', msg.text);
    console.log('  群组:', msg.chat.id);
    console.log('  时间:', new Date(msg.date * 1000).toLocaleString());
    
    // 自动回复
    if (msg.text && !msg.from.is_bot) {
        bot.sendMessage(msg.chat.id, `收到消息: ${msg.text}`);
    }
});

// 监听轮询错误
bot.on('polling_error', (error) => {
    console.error('❌ 轮询错误:', error.message);
});

console.log('✅ Bot已启动，等待消息...');
console.log('请在Telegram群组中发送消息测试');

// 发送测试消息
setTimeout(() => {
    console.log('\n发送测试消息...');
    bot.sendMessage(GROUP_ID, '🧪 轮询测试：Bot已启动，请发送任意消息测试')
        .then(() => console.log('✅ 测试消息已发送'))
        .catch(err => console.error('❌ 发送失败:', err.message));
}, 2000);