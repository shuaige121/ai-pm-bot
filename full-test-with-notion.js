// full-test-with-notion.js
// 完整测试：业务路由 + 实际Notion数据创建

const axios = require('axios');
const { createProjectWithTasks, notion } = require('./notion-service.js');
const { pickBizDBIds } = require('./biz-router.js');
require('dotenv').config();

const AI_SERVER_URL = 'http://localhost:3001';
const API_KEY = 'supersecret_please_change';

// 测试用例
const testCases = [
  {
    name: '办公用品采购（应归LaPure）',
    text: '需要订购一批办公用品，包括打印纸和文具',
    expectedBiz: 'LaPure'
  },
  {
    name: '买咖啡机（应归LaPure）',
    text: '买一台新的咖啡机',
    expectedBiz: 'LaPure'
  },
  {
    name: '订购饮料（应归LaPure）',
    text: '订购一些饮料和零食',
    expectedBiz: 'LaPure'
  },
  {
    name: 'Salon染发剂（应归Salon）',
    text: 'Salon需要订购新的染发剂',
    expectedBiz: 'Salon'
  },
  {
    name: '给租客买家具（应归BB House）',
    text: '给租客买一套新家具',
    expectedBiz: 'BB House'
  },
  {
    name: 'BB House维修（应归BB House）',
    text: 'BB House的空调需要维修',
    expectedBiz: 'BB House'
  },
  {
    name: 'LaPure产品拍摄（应归LaPure）',
    text: 'LaPure需要拍摄新产品照片',
    expectedBiz: 'LaPure'
  },
  {
    name: '通用采购（应归LaPure）',
    text: '采购一批新设备',
    expectedBiz: 'LaPure'
  }
];

// 测试业务路由
function testBizRouting(text, expectedBiz) {
  const { projectDb, taskDb } = pickBizDBIds(text);
  
  let actualBiz;
  if (projectDb === process.env.NOTION_DB_LAPURE) {
    actualBiz = 'LaPure';
  } else if (taskDb === process.env.NOTION_DB_BBHOUSE) {
    actualBiz = 'BB House';
  } else if (projectDb === process.env.NOTION_PROJECT_DB_ID && 
             taskDb === process.env.NOTION_TASK_DB_ID) {
    actualBiz = 'Salon';
  } else {
    actualBiz = 'Unknown';
  }
  
  const isCorrect = actualBiz === expectedBiz;
  return { actualBiz, isCorrect, projectDb, taskDb };
}

// 调用AI服务器
async function callAI(text) {
  try {
    const response = await axios.post(
      `${AI_SERVER_URL}/breakdown`,
      { text, author: 'test_user' },
      {
        headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
        timeout: 20000
      }
    );
    return response.data;
  } catch (error) {
    console.error('AI调用失败:', error.message);
    return null;
  }
}

// 在Notion创建测试数据
async function createTestInNotion(projectTitle, tasks, sourceText) {
  try {
    const projectId = await createProjectWithTasks({
      projectTitle,
      bossName: 'test_user',
      tasks: tasks.map(t => ({
        ...t,
        assigneeRole: 'admin'
      })),
      sourceText
    });
    return projectId;
  } catch (error) {
    console.error('Notion创建失败:', error.message);
    return null;
  }
}

// 删除Notion中的测试数据
async function deleteFromNotion(pageId) {
  try {
    await axios.patch(
      `https://api.notion.com/v1/pages/${pageId}`,
      { archived: true },
      {
        headers: {
          'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
          'Notion-Version': process.env.NOTION_VERSION || '2022-06-28'
        }
      }
    );
    return true;
  } catch (error) {
    console.error('删除失败:', error.message);
    return false;
  }
}

// 主测试函数
async function runFullTest() {
  console.log('🚀 完整系统测试（含Notion实际操作）');
  console.log('=' .repeat(70));
  
  const results = [];
  const createdIds = [];
  
  // 1. 测试业务路由
  console.log('\n📍 第一步：测试业务路由逻辑');
  console.log('-' .repeat(40));
  
  for (const testCase of testCases) {
    const routing = testBizRouting(testCase.text, testCase.expectedBiz);
    console.log(`\n✅ ${testCase.name}`);
    console.log(`   文本: "${testCase.text}"`);
    console.log(`   期望: ${testCase.expectedBiz}`);
    console.log(`   实际: ${routing.actualBiz} ${routing.isCorrect ? '✓' : '✗'}`);
    
    results.push({
      ...testCase,
      ...routing
    });
  }
  
  // 2. 测试AI服务器
  console.log('\n\n📤 第二步：测试AI服务器响应');
  console.log('-' .repeat(40));
  
  for (const testCase of testCases.slice(0, 3)) { // 只测试前3个避免太多
    console.log(`\n🤖 测试: ${testCase.name}`);
    const aiResponse = await callAI(testCase.text);
    if (aiResponse) {
      console.log(`   意图: ${aiResponse.intent}`);
      console.log(`   回复: ${aiResponse.assistant_reply.substring(0, 50)}...`);
      console.log(`   项目: ${aiResponse.project_title || '无'}`);
      console.log(`   任务数: ${aiResponse.tasks?.length || 0}`);
    }
  }
  
  // 3. 在Notion中创建和删除测试数据
  console.log('\n\n📝 第三步：Notion实际数据操作测试');
  console.log('-' .repeat(40));
  
  // 测试三个不同业务的数据创建
  const notionTests = [
    {
      title: 'TEST-办公用品采购',
      tasks: [
        { title: '测试任务1', details: '采购清单' },
        { title: '测试任务2', details: '询价对比' }
      ],
      sourceText: '订购办公用品'
    },
    {
      title: 'TEST-Salon采购',
      tasks: [
        { title: '测试任务A', details: '染发剂采购' },
        { title: '测试任务B', details: '供应商联系' }
      ],
      sourceText: 'Salon需要染发剂'
    },
    {
      title: 'TEST-BB House维修',
      tasks: [
        { title: '测试维修1', details: '空调检查' },
        { title: '测试维修2', details: '维修安排' }
      ],
      sourceText: 'BB House空调维修'
    }
  ];
  
  for (const test of notionTests) {
    console.log(`\n📌 创建: ${test.title}`);
    const { projectDb, taskDb } = pickBizDBIds(test.sourceText);
    console.log(`   项目库: ${projectDb.substring(0, 8)}...`);
    console.log(`   任务库: ${taskDb.substring(0, 8)}...`);
    
    const projectId = await createTestInNotion(test.title, test.tasks, test.sourceText);
    if (projectId) {
      console.log(`   ✅ 创建成功: ${projectId}`);
      createdIds.push(projectId);
    } else {
      console.log(`   ❌ 创建失败`);
    }
  }
  
  // 4. 清理测试数据
  if (createdIds.length > 0) {
    console.log('\n\n🗑️ 第四步：清理测试数据');
    console.log('-' .repeat(40));
    
    for (const id of createdIds) {
      const deleted = await deleteFromNotion(id);
      console.log(`${deleted ? '✅' : '❌'} 删除: ${id}`);
    }
  }
  
  // 5. 总结
  console.log('\n\n' + '=' .repeat(70));
  console.log('📊 测试总结');
  console.log('-' .repeat(40));
  
  const correctCount = results.filter(r => r.isCorrect).length;
  console.log(`\n业务路由测试: ${correctCount}/${results.length} 正确`);
  console.log(`Notion操作: ${createdIds.length} 个项目创建并删除`);
  
  console.log('\n🎯 关键配置:');
  console.log('- 办公室采购（无特定对象）→ LaPure');
  console.log('- Salon明确提及 → Salon业务（通用库）');
  console.log('- BB House/租客 → BB House业务');
  console.log('- 其他默认 → LaPure');
  
  console.log('\n✅ 测试完成！');
}

// 运行测试
runFullTest().catch(console.error);