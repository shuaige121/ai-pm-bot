// test-new-features.js
// 测试新功能：过滤测试数据和列出项目

const { generateProgressReport, listAllProjects } = require('./notion-service.js');
require('dotenv').config();

async function testNewFeatures() {
  console.log('🧪 测试新功能');
  console.log('=' .repeat(60));
  
  // 1. 测试过滤后的进度报告
  console.log('\n📊 测试1：过滤测试数据后的进度报告');
  console.log('-' .repeat(40));
  
  try {
    const report = await generateProgressReport();
    console.log('项目统计（不含TEST/DEMO）:');
    console.log(`  进行中: ${report.projects.active} 个`);
    console.log(`  已完成: ${report.projects.completed} 个`);
    console.log('任务统计（不含TEST/DEMO）:');
    console.log(`  待完成: ${report.tasks.pending} 个`);
    console.log(`  需协助: ${report.tasks.needHelp} 个`);
    console.log(`  已完成: ${report.tasks.completed} 个`);
  } catch (error) {
    console.error('生成报告失败:', error.message);
  }
  
  // 2. 测试列出所有项目
  console.log('\n\n📋 测试2：列出所有项目（不含测试数据）');
  console.log('-' .repeat(40));
  
  try {
    const projects = await listAllProjects();
    
    if (projects.length === 0) {
      console.log('没有找到项目（已过滤测试数据）');
    } else {
      console.log(`找到 ${projects.length} 个真实项目:\n`);
      
      // 按状态分组
      const active = projects.filter(p => 
        p.status !== '完成' && p.status !== 'Done' && p.status !== 'Complete'
      );
      const completed = projects.filter(p => 
        p.status === '完成' || p.status === 'Done' || p.status === 'Complete'
      );
      
      if (active.length > 0) {
        console.log('🔵 进行中的项目:');
        active.forEach((p, i) => {
          console.log(`  ${i+1}. ${p.title}`);
          console.log(`     状态: ${p.status}`);
          console.log(`     来源: ${p.source}`);
          console.log(`     创建: ${p.createdDate}`);
        });
      }
      
      if (completed.length > 0) {
        console.log('\n✅ 已完成的项目:');
        completed.forEach((p, i) => {
          console.log(`  ${i+1}. ${p.title}`);
          console.log(`     创建: ${p.createdDate}`);
        });
      }
    }
  } catch (error) {
    console.error('列出项目失败:', error.message);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ 测试完成！');
  console.log('\n💡 说明:');
  console.log('1. 进度报告现在会过滤掉包含TEST/DEMO的测试数据');
  console.log('2. "列出所有项目"功能可以显示所有真实项目的详情');
  console.log('3. 在Telegram中说"列出所有项目"即可查看项目列表');
}

testNewFeatures().catch(console.error);