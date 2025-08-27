// setWebhook.js
// 用于设置Telegram Bot的Webhook

const axios = require('axios');
require('dotenv').config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://your-domain.com/webhook';

async function setWebhook() {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook`;
        const response = await axios.post(url, {
            url: WEBHOOK_URL,
            allowed_updates: ['message', 'edited_message', 'channel_post', 'edited_channel_post']
        });
        
        if (response.data.ok) {
            console.log('✅ Webhook设置成功！');
            console.log('Webhook URL:', WEBHOOK_URL);
        } else {
            console.error('❌ Webhook设置失败:', response.data.description);
        }
        
        // 获取Webhook信息
        const infoUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getWebhookInfo`;
        const info = await axios.get(infoUrl);
        console.log('\n📊 Webhook信息:');
        console.log('URL:', info.data.result.url);
        console.log('待处理更新数:', info.data.result.pending_update_count);
        console.log('最后错误时间:', info.data.result.last_error_date ? new Date(info.data.result.last_error_date * 1000) : '无');
        console.log('最后错误消息:', info.data.result.last_error_message || '无');
        
    } catch (error) {
        console.error('设置Webhook时出错:', error.message);
    }
}

// 删除Webhook（用于测试轮询模式）
async function deleteWebhook() {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/deleteWebhook`;
        const response = await axios.post(url);
        
        if (response.data.ok) {
            console.log('✅ Webhook已删除！');
        } else {
            console.error('❌ 删除Webhook失败:', response.data.description);
        }
    } catch (error) {
        console.error('删除Webhook时出错:', error.message);
    }
}

// 根据命令行参数决定操作
const command = process.argv[2];
if (command === 'delete') {
    deleteWebhook();
} else {
    setWebhook();
}