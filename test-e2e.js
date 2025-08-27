// test-e2e.js
// 端到端测试：模拟用户消息，验证机器人响应

const axios = require('axios');
require('dotenv').config();

const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:3001';
const AI_SERVER_KEY = process.env.AI_SERVER_KEY || 'supersecret_please_change';

async function simulateUserMessage(text, author = 'test_user') {
  console.log(`\n📤 模拟用户消息: "${text}"`);
  console.log('-'.repeat(50));
  
  try {
    // 1. 调用AI服务器
    console.log('1️⃣ 调用AI服务器...');
    const aiResponse = await axios.post(
      `${AI_SERVER_URL}/breakdown`,
      { text, author },
      {
        headers: {
          'x-api-key': AI_SERVER_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const aiResult = aiResponse.data;
    console.log(`   意图: ${aiResult.intent}`);
    console.log(`   AI回复: ${aiResult.assistant_reply}`);
    
    // 2. 根据意图模拟机器人行为
    console.log('\n2️⃣ 机器人处理:');
    
    switch(aiResult.intent) {
      case 'list_tasks':
        console.log('   ✅ 识别为list_tasks - 应该列出所有待办任务');
        console.log('   机器人会调用 listPendingTasks() 并显示任务列表');
        
        // 实际调用来验证
        const { listPendingTasks } = require('./notion-service.js');
        const tasks = await listPendingTasks();
        console.log(`   找到 ${tasks.length} 个待办任务`);
        if (tasks.length > 0) {
          console.log('   前3个任务:');
          tasks.slice(0, 3).forEach((t, i) => {
            console.log(`     ${i+1}. ${t.title} (${t.assignee || '未分配'})`);
          });
        }
        break;
        
      case 'task_query':
        console.log('   ⚠️ 识别为task_query - 只会显示统计数字');
        console.log('   机器人会调用 generateProgressReport() 显示数量');
        break;
        
      case 'list_projects':
        console.log('   ✅ 识别为list_projects - 会列出所有项目');
        break;
        
      case 'chat':
        console.log('   💬 识别为聊天 - 只回复文字，不查询数据库');
        break;
        
      default:
        console.log(`   ❓ 未知意图: ${aiResult.intent}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ 错误:', error.message);
    if (error.response) {
      console.error('   响应:', error.response.data);
    }
    return false;
  }
}

async function runTests() {
  console.log('🧪 端到端测试');
  console.log('=' .repeat(60));
  
  // 检查服务器
  try {
    await axios.get(`${AI_SERVER_URL}/health`, {
      headers: { 'x-api-key': AI_SERVER_KEY }
    });
    console.log('✅ AI服务器连接成功');
  } catch (error) {
    console.error('❌ AI服务器未启动');
    console.error('请运行: node ai-server-claude.js');
    return;
  }
  
  // 测试不同场景
  const testCases = [
    '有什么任务',
    '有什么没做完的',
    '查看进度',
    '列出所有项目'
  ];
  
  for (const testCase of testCases) {
    await simulateUserMessage(testCase);
    await new Promise(resolve => setTimeout(resolve, 1000)); // 延迟避免过快
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ 测试完成！');
  console.log('\n重要提醒:');
  console.log('- "有什么任务" 应该触发 list_tasks（列出具体任务）');
  console.log('- "查看进度" 应该触发 task_query（显示统计数字）');
  console.log('- 如果意图识别正确但机器人不回复，检查机器人代码');
}

runTests().catch(console.error);