// create-demo-data.js
// 为每个业务创建演示数据，展示完整的数据分布

const { createProjectWithTasks } = require('./notion-service.js');
const { pickAssignee } = require('./role-router.js');

async function createDemoData() {
  console.log('🚀 创建演示数据，展示各业务的项目分布');
  console.log('=' .repeat(70));
  
  const demoProjects = [
    {
      title: 'DEMO-Salon染发剂采购',
      sourceText: 'Salon需要采购染发剂和洗发水',
      expectedLocation: 'Salon → 通用项目库 + 通用任务库',
      tasks: [
        { title: '联系染发剂供应商', details: '获取报价' },
        { title: '对比产品质量', details: '选择合适品牌' },
        { title: '下单采购', details: '批量订购' }
      ]
    },
    {
      title: 'DEMO-BB House空调维修',
      sourceText: 'BB House的空调需要维修',
      expectedLocation: 'BB House → 通用项目库 + BB House任务库',
      tasks: [
        { title: '联系维修服务商', details: '寻找专业维修' },
        { title: '安排维修时间', details: '协调租客时间' },
        { title: '完成维修验收', details: '测试空调功能' }
      ]
    },
    {
      title: 'DEMO-LaPure办公用品采购',
      sourceText: '订购一批办公用品和咖啡',
      expectedLocation: 'LaPure → LaPure项目库 + 通用任务库',
      tasks: [
        { title: '列出采购清单', details: '统计需求' },
        { title: '询价对比', details: '选择供应商' },
        { title: '下单并跟踪', details: '确保及时送达' }
      ]
    }
  ];
  
  const createdProjects = [];
  
  for (const demo of demoProjects) {
    console.log(`\n📌 创建: ${demo.title}`);
    console.log(`   预期位置: ${demo.expectedLocation}`);
    
    try {
      // 为任务分配负责人
      const tasksWithAssignee = demo.tasks.map(t => ({
        ...t,
        assigneeRole: pickAssignee(t.title + ' ' + t.details),
        due_hint: '3天内'
      }));
      
      const projectId = await createProjectWithTasks({
        projectTitle: demo.title,
        bossName: 'Demo User',
        tasks: tasksWithAssignee,
        sourceText: demo.sourceText
      });
      
      if (projectId) {
        console.log(`   ✅ 创建成功: ${projectId}`);
        createdProjects.push({
          id: projectId,
          title: demo.title,
          location: demo.expectedLocation
        });
      }
    } catch (error) {
      console.log(`   ❌ 创建失败: ${error.message}`);
    }
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('📊 创建结果总结');
  console.log('-' .repeat(40));
  
  if (createdProjects.length > 0) {
    console.log(`\n成功创建 ${createdProjects.length} 个演示项目：\n`);
    for (const p of createdProjects) {
      console.log(`✅ ${p.title}`);
      console.log(`   位置: ${p.location}`);
      console.log(`   ID: ${p.id}\n`);
    }
    
    console.log('💡 现在您可以在Notion中查看：');
    console.log('1. 通用项目库 - 应该有Salon和BB House的项目');
    console.log('2. 通用任务库 - 应该有Salon和LaPure的任务');
    console.log('3. BB House任务库 - 应该有BB House的任务');
    console.log('4. LaPure项目库 - 应该有LaPure的项目');
    
    console.log('\n⚠️ 注意：这些是演示数据，可以在Notion中手动删除或归档');
  }
}

// 运行
createDemoData().catch(console.error);