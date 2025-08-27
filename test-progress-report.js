// test-progress-report.js
// 测试进度报告功能

const { generateProgressReport } = require('./notion-service.js');
require('dotenv').config();

async function testProgressReport() {
  console.log('🔍 测试进度报告功能');
  console.log('=' .repeat(60));
  
  try {
    console.log('\n正在生成进度报告...\n');
    
    const report = await generateProgressReport();
    
    console.log('📊 进度报告结果：');
    console.log('-' .repeat(40));
    
    console.log('\n📁 项目统计:');
    console.log(`   进行中: ${report.projects.active} 个`);
    console.log(`   已完成: ${report.projects.completed} 个`);
    console.log(`   总计: ${report.projects.active + report.projects.completed} 个`);
    
    console.log('\n📝 任务统计:');
    console.log(`   待完成: ${report.tasks.pending} 个`);
    console.log(`   需协助: ${report.tasks.needHelp} 个`);
    console.log(`   已完成: ${report.tasks.completed} 个`);
    console.log(`   总计: ${report.tasks.pending + report.tasks.needHelp + report.tasks.completed} 个`);
    
    console.log('\n⚠️ 阻碍统计:');
    console.log(`   待解决: ${report.obstacles.open} 个`);
    
    console.log('\n' + '=' .repeat(60));
    
    // 分析结果
    if (report.projects.active + report.projects.completed === 0) {
      console.log('❌ 问题：没有找到任何项目');
      console.log('   可能原因：');
      console.log('   1. 查询的数据库不正确');
      console.log('   2. 数据库为空');
    } else {
      console.log('✅ 成功找到项目数据');
    }
    
    if (report.tasks.pending + report.tasks.needHelp + report.tasks.completed === 0) {
      console.log('❌ 问题：没有找到任何任务');
      console.log('   可能原因：');
      console.log('   1. 查询的数据库不正确');
      console.log('   2. 数据库为空');
    } else {
      console.log('✅ 成功找到任务数据');
    }
    
    console.log('\n💡 说明：');
    console.log('进度报告现在查询以下数据库：');
    console.log('- 项目：通用项目库 + LaPure项目库');
    console.log('- 任务：通用任务库 + BB House任务库');
    console.log('- 阻碍：阻碍表');
    
  } catch (error) {
    console.error('生成报告失败:', error);
  }
}

// 运行测试
testProgressReport();