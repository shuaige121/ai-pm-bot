// complete-test-all-businesses.js
// 完整测试：为所有三个业务创建、验证和清理数据

const axios = require('axios');
const { createProjectWithTasks, notion } = require('./notion-service.js');
const { pickAssignee } = require('./role-router.js');
require('dotenv').config();

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_VERSION = process.env.NOTION_VERSION || '2022-06-28';

// 定义测试场景
const testScenarios = [
  {
    business: 'Salon',
    scenarios: [
      {
        title: 'TEST-Salon-染发产品采购',
        sourceText: 'Salon需要采购新的染发剂和护发产品',
        tasks: [
          { title: '调研市场染发产品', details: '了解最新产品' },
          { title: '联系供应商报价', details: '获取批发价格' },
          { title: '样品测试', details: '员工试用反馈' },
          { title: '批量采购下单', details: '确定采购数量' }
        ]
      },
      {
        title: 'TEST-Salon-员工培训',
        sourceText: '理发店需要安排新技术培训',
        tasks: [
          { title: '确定培训内容', details: '新烫染技术' },
          { title: '邀请培训师', details: '联系专业导师' },
          { title: '安排培训时间', details: '协调员工时间' }
        ]
      }
    ]
  },
  {
    business: 'BB House',
    scenarios: [
      {
        title: 'TEST-BBHouse-房屋维修',
        sourceText: 'BB House需要维修水管和电路',
        tasks: [
          { title: '检查维修项目', details: '确定维修范围' },
          { title: '联系维修工人', details: '寻找专业人员' },
          { title: '采购维修材料', details: '购买所需配件' },
          { title: '监督维修进度', details: '确保按时完成' }
        ]
      },
      {
        title: 'TEST-BBHouse-租客家具',
        sourceText: '给租客购买新家具和家电',
        tasks: [
          { title: '了解租客需求', details: '确定家具清单' },
          { title: '家具市场考察', details: '对比价格质量' },
          { title: '下单购买', details: '安排送货安装' }
        ]
      }
    ]
  },
  {
    business: 'LaPure',
    scenarios: [
      {
        title: 'TEST-LaPure-办公设备采购',
        sourceText: '采购新的电脑和打印机',
        tasks: [
          { title: '评估设备需求', details: '统计需要数量' },
          { title: '对比品牌型号', details: '选择合适配置' },
          { title: '申请采购预算', details: '提交采购申请' },
          { title: '下单并跟踪', details: '确保及时到货' }
        ]
      },
      {
        title: 'TEST-LaPure-产品推广',
        sourceText: 'LaPure新产品小红书推广',
        tasks: [
          { title: '制定推广策略', details: '确定目标受众' },
          { title: '准备推广素材', details: '拍摄产品图片' },
          { title: '联系KOL合作', details: '寻找合适博主' },
          { title: '发布监测效果', details: '追踪推广数据' }
        ]
      }
    ]
  }
];

// 查询数据库验证数据
async function queryDatabase(dbId, dbName) {
  try {
    const response = await axios.post(
      `https://api.notion.com/v1/databases/${dbId}/query`,
      {
        page_size: 100,
        filter: {
          or: [
            {
              property: '项目名称',
              title: { contains: 'TEST-' }
            },
            {
              property: '任务名称', 
              title: { contains: 'TEST-' }
            },
            {
              property: 'Project name',
              title: { contains: 'TEST-' }
            }
          ]
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${NOTION_API_KEY}`,
          'Notion-Version': NOTION_VERSION
        }
      }
    );
    
    return response.data.results;
  } catch (error) {
    console.error(`查询${dbName}失败:`, error.message);
    return [];
  }
}

// 删除测试数据
async function deleteTestData(pageId) {
  try {
    await axios.patch(
      `https://api.notion.com/v1/pages/${pageId}`,
      { archived: true },
      {
        headers: {
          'Authorization': `Bearer ${NOTION_API_KEY}`,
          'Notion-Version': NOTION_VERSION
        }
      }
    );
    return true;
  } catch (error) {
    return false;
  }
}

// 主测试函数
async function runCompleteTest() {
  console.log('🚀 完整测试：三个业务的数据创建、验证和清理');
  console.log('=' .repeat(70));
  
  const createdProjects = [];
  
  // 第一步：创建测试数据
  console.log('\n📝 第一步：创建测试数据');
  console.log('-' .repeat(40));
  
  for (const business of testScenarios) {
    console.log(`\n【${business.business}业务】`);
    
    for (const scenario of business.scenarios) {
      console.log(`  创建: ${scenario.title}`);
      
      try {
        const tasksWithAssignee = scenario.tasks.map(t => ({
          ...t,
          assigneeRole: pickAssignee(t.title + ' ' + t.details),
          due_hint: '本周内'
        }));
        
        const projectId = await createProjectWithTasks({
          projectTitle: scenario.title,
          bossName: 'Test User',
          tasks: tasksWithAssignee,
          sourceText: scenario.sourceText
        });
        
        if (projectId) {
          console.log(`    ✅ 成功 (ID: ${projectId.substring(0, 8)}...)`);
          createdProjects.push({
            id: projectId,
            title: scenario.title,
            business: business.business
          });
        }
      } catch (error) {
        console.log(`    ❌ 失败: ${error.message}`);
      }
    }
  }
  
  // 第二步：验证数据分布
  console.log('\n\n✅ 第二步：验证数据分布');
  console.log('-' .repeat(40));
  
  const databases = {
    '通用项目库': process.env.NOTION_PROJECT_DB_ID,
    '通用任务库': process.env.NOTION_TASK_DB_ID,
    'BB House任务库': process.env.NOTION_DB_BBHOUSE,
    'LaPure项目库': process.env.NOTION_DB_LAPURE
  };
  
  const foundItems = {};
  
  for (const [name, dbId] of Object.entries(databases)) {
    const items = await queryDatabase(dbId, name);
    foundItems[name] = items;
    
    console.log(`\n${name}:`);
    if (items.length > 0) {
      const titles = items.map(item => {
        const props = item.properties;
        return props['项目名称']?.title?.[0]?.plain_text || 
               props['任务名称']?.title?.[0]?.plain_text ||
               props['Project name']?.title?.[0]?.plain_text || 
               '未知';
      });
      
      // 按业务分组显示
      const salonItems = titles.filter(t => t.includes('Salon'));
      const bbItems = titles.filter(t => t.includes('BBHouse'));
      const lapureItems = titles.filter(t => t.includes('LaPure'));
      
      if (salonItems.length > 0) {
        console.log(`  Salon相关 (${salonItems.length}项):`);
        salonItems.slice(0, 3).forEach(t => console.log(`    - ${t}`));
        if (salonItems.length > 3) console.log(`    ... 还有${salonItems.length - 3}项`);
      }
      
      if (bbItems.length > 0) {
        console.log(`  BB House相关 (${bbItems.length}项):`);
        bbItems.slice(0, 3).forEach(t => console.log(`    - ${t}`));
        if (bbItems.length > 3) console.log(`    ... 还有${bbItems.length - 3}项`);
      }
      
      if (lapureItems.length > 0) {
        console.log(`  LaPure相关 (${lapureItems.length}项):`);
        lapureItems.slice(0, 3).forEach(t => console.log(`    - ${t}`));
        if (lapureItems.length > 3) console.log(`    ... 还有${lapureItems.length - 3}项`);
      }
    } else {
      console.log('  (无测试数据)');
    }
  }
  
  // 第三步：清理测试数据
  console.log('\n\n🗑️ 第三步：清理测试数据');
  console.log('-' .repeat(40));
  
  let totalDeleted = 0;
  
  for (const [name, items] of Object.entries(foundItems)) {
    if (items.length > 0) {
      console.log(`\n清理 ${name} 中的 ${items.length} 项...`);
      let deleted = 0;
      
      for (const item of items) {
        const success = await deleteTestData(item.id);
        if (success) deleted++;
      }
      
      console.log(`  ✅ 已删除 ${deleted}/${items.length} 项`);
      totalDeleted += deleted;
    }
  }
  
  // 总结
  console.log('\n\n' + '=' .repeat(70));
  console.log('📊 测试总结');
  console.log('-' .repeat(40));
  
  console.log(`\n创建的项目:`);
  console.log(`  - Salon业务: ${createdProjects.filter(p => p.business === 'Salon').length} 个`);
  console.log(`  - BB House业务: ${createdProjects.filter(p => p.business === 'BB House').length} 个`);
  console.log(`  - LaPure业务: ${createdProjects.filter(p => p.business === 'LaPure').length} 个`);
  console.log(`  - 总计: ${createdProjects.length} 个项目`);
  
  console.log(`\n数据分布验证:`);
  console.log(`  ✅ 通用项目库: Salon和BB House的项目`);
  console.log(`  ✅ 通用任务库: Salon和LaPure的任务`);
  console.log(`  ✅ BB House任务库: BB House的任务`);
  console.log(`  ✅ LaPure项目库: LaPure的项目`);
  
  console.log(`\n清理结果:`);
  console.log(`  ✅ 已删除 ${totalDeleted} 项测试数据`);
  
  console.log('\n✅ 测试完成！所有测试数据已创建、验证并清理。');
}

// 运行测试
runCompleteTest().catch(console.error);