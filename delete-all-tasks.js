// delete-all-tasks.js
// 删除所有现有任务（慎用！）

const { Client } = require('@notionhq/client');
require('dotenv').config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function deleteAllTasks() {
  console.log('⚠️  警告：即将删除所有任务！');
  console.log('=' .repeat(60));
  
  // 任务数据库列表
  const taskDbs = [
    { id: process.env.NOTION_TASK_DB_ID, name: '通用任务库' },
    { id: process.env.NOTION_DB_BBHOUSE, name: 'BB House任务库' }
  ].filter(db => db.id && db.id !== 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  
  let totalDeleted = 0;
  
  for (const db of taskDbs) {
    console.log(`\n📋 处理 ${db.name}...`);
    
    try {
      // 查询所有任务
      const response = await notion.databases.query({
        database_id: db.id
      });
      
      const tasks = response.results;
      console.log(`   找到 ${tasks.length} 个任务`);
      
      // 删除每个任务（实际上是归档）
      for (const task of tasks) {
        try {
          await notion.pages.update({
            page_id: task.id,
            archived: true
          });
          
          const title = task.properties['任务名称']?.title?.[0]?.plain_text || '无标题';
          console.log(`   ✅ 已删除: ${title}`);
          totalDeleted++;
        } catch (error) {
          console.error(`   ❌ 删除失败:`, error.message);
        }
      }
    } catch (error) {
      console.error(`❌ 查询 ${db.name} 失败:`, error.message);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log(`✅ 完成！共删除 ${totalDeleted} 个任务`);
}

// 确认提示
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('\n⚠️  确定要删除所有任务吗？(yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    deleteAllTasks()
      .then(() => {
        console.log('\n任务已清空，现在可以重新开始了！');
        process.exit(0);
      })
      .catch(error => {
        console.error('错误:', error);
        process.exit(1);
      });
  } else {
    console.log('已取消操作');
    process.exit(0);
  }
});