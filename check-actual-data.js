// check-actual-data.js
// 详细检查数据库中的实际内容

const axios = require('axios');
require('dotenv').config();

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_VERSION = process.env.NOTION_VERSION || '2022-06-28';

async function queryDatabaseDetails(dbId, dbName) {
  try {
    const response = await axios.post(
      `https://api.notion.com/v1/databases/${dbId}/query`,
      {
        page_size: 100
      },
      {
        headers: {
          'Authorization': `Bearer ${NOTION_API_KEY}`,
          'Notion-Version': NOTION_VERSION
        }
      }
    );
    
    const pages = response.data.results;
    console.log(`\n📁 ${dbName}`);
    console.log(`   数据库ID: ${dbId}`);
    console.log(`   总记录数: ${pages.length}`);
    
    if (pages.length > 0) {
      console.log(`   内容列表:`);
      
      // 只显示前20条
      const displayCount = Math.min(pages.length, 20);
      
      for (let i = 0; i < displayCount; i++) {
        const page = pages[i];
        const props = page.properties;
        
        // 获取标题
        let title = '无标题';
        if (props['项目名称']?.title?.[0]?.plain_text) {
          title = props['项目名称'].title[0].plain_text;
        } else if (props['任务名称']?.title?.[0]?.plain_text) {
          title = props['任务名称'].title[0].plain_text;
        } else if (props['Project name']?.title?.[0]?.plain_text) {
          title = props['Project name'].title[0].plain_text;
        } else if (props['Name']?.title?.[0]?.plain_text) {
          title = props['Name'].title[0].plain_text;
        }
        
        // 获取创建时间
        const createdTime = new Date(page.created_time).toLocaleDateString('zh-CN');
        
        // 检查是否是机器人创建的（通常包含TEST、DEMO或特定格式）
        const isBotCreated = title.includes('TEST') || 
                            title.includes('DEMO') || 
                            title.includes('采购') ||
                            title.includes('维修');
        
        console.log(`      ${i+1}. ${title} (${createdTime}) ${isBotCreated ? '🤖' : ''}`);
      }
      
      if (pages.length > displayCount) {
        console.log(`      ... 还有 ${pages.length - displayCount} 条记录`);
      }
      
      // 统计分析
      const testCount = pages.filter(p => {
        const props = p.properties;
        const title = props['项目名称']?.title?.[0]?.plain_text || 
                     props['任务名称']?.title?.[0]?.plain_text ||
                     props['Project name']?.title?.[0]?.plain_text || '';
        return title.includes('TEST') || title.includes('DEMO');
      }).length;
      
      const recentCount = pages.filter(p => {
        const created = new Date(p.created_time);
        const today = new Date();
        const daysDiff = (today - created) / (1000 * 60 * 60 * 24);
        return daysDiff <= 1;
      }).length;
      
      console.log(`\n   统计分析:`);
      console.log(`      - 测试数据: ${testCount} 条`);
      console.log(`      - 今天创建: ${recentCount} 条`);
      console.log(`      - 其他数据: ${pages.length - testCount} 条`);
    }
    
    return pages.length;
  } catch (error) {
    console.log(`\n❌ ${dbName}: 查询失败 - ${error.message}`);
    return 0;
  }
}

async function checkAllDatabases() {
  console.log('=' .repeat(70));
  console.log('📊 详细检查所有数据库内容');
  console.log('=' .repeat(70));
  
  const databases = [
    { name: '通用项目库', id: process.env.NOTION_PROJECT_DB_ID },
    { name: '通用任务库', id: process.env.NOTION_TASK_DB_ID },
    { name: 'BB House任务库', id: process.env.NOTION_DB_BBHOUSE },
    { name: 'LaPure项目库', id: process.env.NOTION_DB_LAPURE }
  ];
  
  let totalCount = 0;
  
  for (const db of databases) {
    if (db.id && db.id !== 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
      const count = await queryDatabaseDetails(db.id, db.name);
      totalCount += count;
    }
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log(`📌 总结：`);
  console.log(`   所有数据库共有 ${totalCount} 条记录`);
  console.log(`   🤖 = 机器人创建的数据`);
  console.log(`\n💡 如果有很多不相关的旧数据，这就是为什么统计数字很大的原因`);
}

checkAllDatabases().catch(console.error);