// test-recurring.js
// 测试定时任务功能

const axios = require('axios');
const { 
  addRecurringTask, 
  getAllRecurringTasks,
  markRecurringTaskComplete,
  initializeRecurringTasks 
} = require('./recurring-tasks.js');
require('dotenv').config();

const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:3001';
const AI_SERVER_KEY = process.env.AI_SERVER_KEY || 'supersecret_please_change';

async function testRecurring() {
  console.log('🧪 测试定时任务功能');
  console.log('=' .repeat(60));
  
  // 1. 测试AI识别定时任务
  console.log('\n1️⃣ 测试AI识别定时任务意图...\n');
  
  const testCases = [
    '每周五提交周报',
    '每天检查邮件',
    '每月整理财务报表'
  ];
  
  for (const text of testCases) {
    try {
      const response = await axios.post(
        `${AI_SERVER_URL}/breakdown`,
        { text, author: 'test_user' },
        {
          headers: {
            'x-api-key': AI_SERVER_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const result = response.data;
      console.log(`📝 "${text}"`);
      console.log(`   意图: ${result.intent}`);
      if (result.recurring) {
        console.log(`   任务: ${result.recurring.title}`);
        console.log(`   频率: ${result.recurring.frequency}`);
        console.log(`   时间: ${result.recurring.time || '09:00'}`);
      }
      console.log();
    } catch (error) {
      console.error(`   ❌ 错误: ${error.message}`);
    }
  }
  
  // 2. 测试创建定时任务
  console.log('2️⃣ 测试创建定时任务...\n');
  
  const testTask = await addRecurringTask({
    title: '测试周报',
    description: '每周五下午5点提交周报',
    frequency: 'weekly',
    dayOfWeek: 5,
    timeOfDay: '17:00',
    assignee: 'test_user',
    createdBy: 'test_boss',
    groupId: '-1002985202794'
  });
  
  console.log('   ✅ 定时任务已创建:');
  console.log(`   ID: ${testTask.id}`);
  console.log(`   标题: ${testTask.title}`);
  console.log(`   频率: 每周${testTask.dayOfWeek} ${testTask.timeOfDay}`);
  
  // 3. 测试查看所有定时任务
  console.log('\n3️⃣ 测试查看定时任务...\n');
  
  const allTasks = getAllRecurringTasks();
  console.log(`   找到 ${allTasks.length} 个定时任务`);
  allTasks.forEach((task, i) => {
    console.log(`   ${i+1}. ${task.title} (${task.frequency})`);
  });
  
  // 4. 测试标记完成
  console.log('\n4️⃣ 测试标记任务完成...\n');
  
  const completed = await markRecurringTaskComplete('测试周报');
  if (completed) {
    console.log(`   ✅ 任务"${completed.title}"已标记为本周完成`);
    console.log(`   状态: completedThisWeek = ${completed.completedThisWeek}`);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ 测试完成！');
  console.log('\n💡 功能说明:');
  console.log('1. 说"每周五提交周报"会创建定时任务');
  console.log('2. 机器人会在指定时间发送提醒');
  console.log('3. 回复"周报完成"会标记本周已完成');
  console.log('4. 下周会自动重置状态继续提醒');
  console.log('5. 使用 /recurring 命令查看所有定时任务');
}

// 检查AI服务器
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
    await testRecurring();
  }
}

main().catch(console.error);