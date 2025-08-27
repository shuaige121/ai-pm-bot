// send-test-message.js
// 模拟发送消息给bot

const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_GROUP_ID;

async function sendTestMessage() {
  const bot = new TelegramBot(BOT_TOKEN, { polling: false });
  
  try {
    console.log('发送测试消息...');
    const msg = await bot.sendMessage(CHAT_ID, '为办公室购买一台新电脑，预算1万元');
    console.log('✅ 消息发送成功');
    
    // 等待5秒看是否有响应
    console.log('等待Bot响应...');
    setTimeout(async () => {
      console.log('\n再发送一条列表查询:');
      await bot.sendMessage(CHAT_ID, '有什么任务');
      console.log('✅ 查询发送成功');
      
      setTimeout(() => {
        console.log('\n请检查Telegram群组中的Bot响应');
        process.exit(0);
      }, 5000);
    }, 5000);
    
  } catch (error) {
    console.error('❌ 发送失败:', error.message);
  }
}

sendTestMessage();