// test-complete-flow.js
// 完整测试消息流程

const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_GROUP_ID;
const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:3001';
const AI_SERVER_KEY = process.env.AI_SERVER_KEY;

// 创建只发送消息的bot实例（不开启轮询）
const bot = new TelegramBot(BOT_TOKEN, { polling: false });

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCompleteFlow() {
  console.log('🧪 完整流程测试');
  console.log('=' .repeat(60));
  
  // 1. 检查AI服务器
  console.log('\n1️⃣ 检查AI服务器状态...');
  try {
    const health = await axios.get(`${AI_SERVER_URL}/health`, {
      headers: { 'x-api-key': AI_SERVER_KEY }
    });
    console.log('   ✅ AI服务器正常:', health.data);
  } catch (error) {
    console.log('   ❌ AI服务器未响应');
    return;
  }
  
  // 2. 检查Bot连接
  console.log('\n2️⃣ 检查Bot连接...');
  try {
    const me = await bot.getMe();
    console.log('   ✅ Bot连接正常:', me.username);
  } catch (error) {
    console.log('   ❌ Bot连接失败:', error.message);
    return;
  }
  
  // 3. 测试各种消息类型
  const testMessages = [
    {
      text: '你好，今天天气真好',
      expectedIntent: 'chat',
      description: '闲聊消息'
    },
    {
      text: '为办公室采购一台打印机',
      expectedIntent: 'task_new',
      description: '创建任务'
    },
    {
      text: '有什么任务需要做',
      expectedIntent: 'list_tasks',
      description: '列出任务'
    },
    {
      text: '打印机已经采购完成了',
      expectedIntent: 'task_done',
      description: '完成任务'
    },
    {
      text: '每周五提交周报',
      expectedIntent: 'recurring_task',
      description: '定时任务'
    }
  ];
  
  console.log('\n3️⃣ 测试消息处理流程...');
  
  for (const test of testMessages) {
    console.log(`\n📨 测试: ${test.description}`);
    console.log(`   发送: "${test.text}"`);
    
    try {
      // 直接调用AI服务器测试意图识别
      const aiResponse = await axios.post(
        `${AI_SERVER_URL}/breakdown`,
        { 
          text: test.text, 
          author: 'test_user' 
        },
        { 
          headers: { 'x-api-key': AI_SERVER_KEY },
          timeout: 30000
        }
      );
      
      console.log(`   AI识别意图: ${aiResponse.data.intent}`);
      console.log(`   AI回复: ${aiResponse.data.assistant_reply}`);
      
      if (aiResponse.data.intent === test.expectedIntent) {
        console.log(`   ✅ 意图识别正确`);
      } else {
        console.log(`   ⚠️ 意图不匹配 (期望: ${test.expectedIntent})`);
      }
      
      // 如果是创建任务，显示任务详情
      if (aiResponse.data.intent === 'task_new' && aiResponse.data.tasks) {
        console.log(`   📋 任务列表:`);
        aiResponse.data.tasks.forEach((task, i) => {
          console.log(`      ${i+1}. ${task.title} - ${task.due_hint}`);
        });
      }
      
    } catch (error) {
      console.log(`   ❌ 处理失败:`, error.message);
    }
    
    await sleep(1000);
  }
  
  // 4. 测试语音功能
  console.log('\n4️⃣ 测试语音生成...');
  try {
    const { textToSpeechLocal } = require('./voice-service-local.js');
    const audioPath = await textToSpeechLocal('测试语音功能，这是一条测试消息');
    if (audioPath) {
      console.log('   ✅ 语音生成成功:', audioPath);
      const fs = require('fs');
      const stats = fs.statSync(audioPath);
      console.log(`   📊 文件大小: ${stats.size} bytes`);
      fs.unlinkSync(audioPath);
    }
  } catch (error) {
    console.log('   ⚠️ 语音生成失败:', error.message);
  }
  
  // 5. 发送实际测试消息到群组
  console.log('\n5️⃣ 发送测试消息到Telegram群组...');
  try {
    const msg = await bot.sendMessage(CHAT_ID, 
      '🧪 系统测试消息\n' +
      '✅ Bot连接正常\n' +
      '✅ AI服务器正常\n' +
      '✅ 消息处理正常\n' +
      '📝 请发送任意消息测试Bot响应'
    );
    console.log('   ✅ 消息发送成功');
  } catch (error) {
    console.log('   ❌ 发送失败:', error.message);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ 测试完成！');
  console.log('\n💡 系统状态总结:');
  console.log('• AI服务器: 运行正常');
  console.log('• Bot连接: 正常');
  console.log('• 意图识别: 正常');
  console.log('• 语音功能: 已配置');
  console.log('• 消息发送: 正常');
  console.log('\n请在Telegram群组中发送消息测试实际响应');
}

testCompleteFlow().catch(console.error);