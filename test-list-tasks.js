// test-list-tasks.js
// 测试列出待办任务功能

const { listPendingTasks } = require('./notion-service.js');
require('dotenv').config();

async function testListTasks() {
  console.log('🧪 测试列出待办任务功能');
  console.log('=' .repeat(60));
  
  try {
    console.log('\n📝 获取所有待办任务...\n');
    const tasks = await listPendingTasks();
    
    if (tasks.length === 0) {
      console.log('✅ 太棒了！当前没有待办任务');
    } else {
      console.log(`找到 ${tasks.length} 个待办任务:\n`);
      
      // 按优先级分组显示
      const overdueTasks = tasks.filter(t => t.isOverdue);
      const highPriorityTasks = tasks.filter(t => !t.isOverdue && t.priority === '高');
      const mediumPriorityTasks = tasks.filter(t => !t.isOverdue && t.priority === '中');
      const lowPriorityTasks = tasks.filter(t => !t.isOverdue && t.priority === '低');
      
      if (overdueTasks.length > 0) {
        console.log('🔴 过期任务:');
        overdueTasks.forEach((t, i) => {
          console.log(`  ${i+1}. ${t.title}`);
          console.log(`     状态: ${t.status}`);
          console.log(`     负责人: ${t.assignee || '未分配'}`);
          console.log(`     截止: ${t.dueDate || '无'}`);
          console.log(`     来源: ${t.source}`);
        });
        console.log();
      }
      
      if (highPriorityTasks.length > 0) {
        console.log('🟠 高优先级任务:');
        highPriorityTasks.forEach((t, i) => {
          console.log(`  ${i+1}. ${t.title}`);
          console.log(`     状态: ${t.status}`);
          console.log(`     负责人: ${t.assignee || '未分配'}`);
          console.log(`     截止: ${t.dueDate || '无'}`);
          console.log(`     来源: ${t.source}`);
        });
        console.log();
      }
      
      if (mediumPriorityTasks.length > 0) {
        console.log('🟡 中优先级任务:');
        mediumPriorityTasks.forEach((t, i) => {
          console.log(`  ${i+1}. ${t.title}`);
          console.log(`     状态: ${t.status}`);
          console.log(`     负责人: ${t.assignee || '未分配'}`);
          console.log(`     截止: ${t.dueDate || '无'}`);
          console.log(`     来源: ${t.source}`);
        });
        console.log();
      }
      
      if (lowPriorityTasks.length > 0) {
        console.log('🔵 低优先级任务:');
        lowPriorityTasks.forEach((t, i) => {
          console.log(`  ${i+1}. ${t.title}`);
          console.log(`     状态: ${t.status}`);
          console.log(`     负责人: ${t.assignee || '未分配'}`);
          console.log(`     截止: ${t.dueDate || '无'}`);
          console.log(`     来源: ${t.source}`);
        });
      }
    }
  } catch (error) {
    console.error('❌ 获取任务失败:', error.message);
    console.error('详细错误:', error);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ 测试完成！');
  console.log('\n💡 说明:');
  console.log('1. 会显示所有未完成的任务');
  console.log('2. 自动过滤测试数据 (包含TEST/DEMO的)');
  console.log('3. 按优先级排序：过期 > 紧急 > 普通');
  console.log('4. 在Telegram中说"有什么任务"或"有什么没做完的"即可触发');
}

testListTasks().catch(console.error);