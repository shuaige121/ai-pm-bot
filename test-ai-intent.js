// test-ai-intent.js
// 测试AI服务器的意图识别

const axios = require('axios');
require('dotenv').config();

const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:3001';
const AI_SERVER_KEY = process.env.AI_SERVER_KEY || 'supersecret_please_change';

async function testIntent(text, expectedIntent) {
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
    const passed = result.intent === expectedIntent;
    
    console.log(`${passed ? '✅' : '❌'} "${text}"`);
    console.log(`   期望: ${expectedIntent}, 实际: ${result.intent}`);
    if (result.assistant_reply) {
      console.log(`   回复: ${result.assistant_reply}`);
    }
    console.log();
    
    return passed;
  } catch (error) {
    console.error(`❌ 测试失败: "${text}"`);
    console.error(`   错误: ${error.message}`);
    console.log();
    return false;
  }
}

async function runTests() {
  console.log('🧪 测试AI意图识别');
  console.log('=' .repeat(60));
  console.log();
  
  const tests = [
    // list_tasks 意图（列出具体任务）
    { text: '有什么任务', expected: 'list_tasks' },
    { text: '有什么没做完的', expected: 'list_tasks' },
    { text: '还有什么事', expected: 'list_tasks' },
    { text: '待办事项', expected: 'list_tasks' },
    { text: '什么需要做', expected: 'list_tasks' },
    { text: '任务列表', expected: 'list_tasks' },
    
    // task_query 意图（查看统计）
    { text: '查看进度', expected: 'task_query' },
    { text: '项目进度', expected: 'task_query' },
    { text: '今日总结', expected: 'task_query' },
    { text: '进度报告', expected: 'task_query' },
    
    // list_projects 意图
    { text: '列出所有项目', expected: 'list_projects' },
    { text: '项目列表', expected: 'list_projects' },
    
    // chat 意图
    { text: '你好', expected: 'chat' },
    { text: '今天天气不错', expected: 'chat' }
  ];
  
  let passed = 0;
  let failed = 0;
  
  console.log('📝 测试不同查询的意图识别:\n');
  
  for (const test of tests) {
    const result = await testIntent(test.text, test.expected);
    if (result) passed++;
    else failed++;
  }
  
  console.log('=' .repeat(60));
  console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败`);
  
  if (failed === 0) {
    console.log('✅ 所有测试通过！');
  } else {
    console.log('⚠️ 部分测试失败，请检查AI提示词');
  }
}

// 先检查AI服务器
async function checkServer() {
  try {
    const response = await axios.get(`${AI_SERVER_URL}/health`, {
      headers: { 'x-api-key': AI_SERVER_KEY }
    });
    console.log('✅ AI服务器连接成功\n');
    return true;
  } catch (error) {
    console.error('❌ AI服务器未启动或密钥错误');
    console.error('请先运行: node ai-server-claude.js');
    return false;
  }
}

async function main() {
  const serverOk = await checkServer();
  if (serverOk) {
    await runTests();
  }
}

main().catch(console.error);