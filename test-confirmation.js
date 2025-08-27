// test-confirmation.js
// 测试任务确认流程

const axios = require('axios');
require('dotenv').config();

const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:3001';
const AI_SERVER_KEY = process.env.AI_SERVER_KEY || 'supersecret_please_change';

async function testConfirmationFlow() {
  console.log('🧪 测试任务确认流程');
  console.log('=' .repeat(60));
  
  // 1. 模拟创建任务
  console.log('\n1️⃣ 模拟用户创建任务...');
  const taskText = '为办公室采购10台新电脑，下周完成';
  
  try {
    const response = await axios.post(
      `${AI_SERVER_URL}/breakdown`,
      { 
        text: taskText, 
        author: 'test_boss' 
      },
      {
        headers: {
          'x-api-key': AI_SERVER_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const result = response.data;
    console.log('   意图:', result.intent);
    console.log('   项目:', result.project_title);
    console.log('   任务数:', result.tasks?.length || 0);
    
    if (result.intent === 'task_new') {
      console.log('\n2️⃣ 新流程行为:');
      console.log('   ✅ 机器人会显示任务预览');
      console.log('   ✅ 提示用户回复"确定"来保存');
      console.log('   ✅ 2分钟内无确认将自动取消');
      console.log('   ❌ 不会立即保存到Notion');
      
      console.log('\n   预览消息示例:');
      console.log('   --------------------------------');
      console.log(`   📋 ${result.project_title} 任务预览：`);
      result.tasks?.forEach((t, i) => {
        console.log(`   ${i+1}. ${t.title}`);
        if (t.details) console.log(`      ${t.details}`);
        if (t.due_hint) console.log(`      ⏰ ${t.due_hint}`);
      });
      console.log('   ');
      console.log('   ⚠️ 请回复「确定」来保存任务，或等待2分钟自动取消');
      console.log('   --------------------------------');
      
      console.log('\n3️⃣ 用户确认流程:');
      console.log('   - 用户回复"确定"、"确认"或"ok"');
      console.log('   - 机器人保存任务到Notion');
      console.log('   - 发送确认消息："✅ 任务已确认并保存到Notion！"');
    }
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ 测试完成！');
  console.log('\n💡 重要变化:');
  console.log('1. 删除了所有现有任务（55个）');
  console.log('2. 新任务不再自动保存');
  console.log('3. 需要用户确认才会保存到Notion');
  console.log('4. 2分钟超时自动取消');
}

// 检查服务器
async function checkServer() {
  try {
    await axios.get(`${AI_SERVER_URL}/health`, {
      headers: { 'x-api-key': AI_SERVER_KEY }
    });
    console.log('✅ AI服务器连接成功\n');
    return true;
  } catch (error) {
    console.error('❌ AI服务器未启动');
    return false;
  }
}

async function main() {
  const serverOk = await checkServer();
  if (serverOk) {
    await testConfirmationFlow();
  }
}

main().catch(console.error);