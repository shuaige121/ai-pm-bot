// check-notion-data.js
// 检查各个Notion数据库中的实际数据

const axios = require('axios');
require('dotenv').config();

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_VERSION = process.env.NOTION_VERSION || '2022-06-28';

const databases = {
  '通用项目库': process.env.NOTION_PROJECT_DB_ID,
  '通用任务库': process.env.NOTION_TASK_DB_ID,
  'BB House任务库': process.env.NOTION_DB_BBHOUSE,
  'LaPure项目库': process.env.NOTION_DB_LAPURE
};

async function queryDatabase(name, dbId) {
  if (!dbId || dbId === 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
    console.log(`\n${name}: 未配置`);
    return;
  }
  
  try {
    // 获取数据库信息
    const dbResponse = await axios.get(
      `https://api.notion.com/v1/databases/${dbId}`,
      {
        headers: {
          'Authorization': `Bearer ${NOTION_API_KEY}`,
          'Notion-Version': NOTION_VERSION
        }
      }
    );
    
    const dbTitle = dbResponse.data.title[0]?.plain_text || '无标题';
    
    // 查询数据库中的页面
    const response = await axios.post(
      `https://api.notion.com/v1/databases/${dbId}/query`,
      {
        page_size: 20,
        sorts: [
          {
            timestamp: 'created_time',
            direction: 'descending'
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${NOTION_API_KEY}`,
          'Notion-Version': NOTION_VERSION
        }
      }
    );
    
    const pages = response.data.results;
    
    console.log(`\n📁 ${name} (${dbTitle})`);
    console.log(`   数据库ID: ${dbId}`);
    console.log(`   未归档项目/任务数: ${pages.length}`);
    
    if (pages.length > 0) {
      console.log(`   最近创建的项目/任务:`);
      
      for (const page of pages.slice(0, 5)) {
        // 获取标题（可能是不同的属性名）
        let title = '无标题';
        const props = page.properties;
        
        // 尝试不同的标题属性名
        if (props['项目名称']?.title?.[0]?.plain_text) {
          title = props['项目名称'].title[0].plain_text;
        } else if (props['任务名称']?.title?.[0]?.plain_text) {
          title = props['任务名称'].title[0].plain_text;
        } else if (props['Project name']?.title?.[0]?.plain_text) {
          title = props['Project name'].title[0].plain_text;
        } else if (props['Outlet']?.title?.[0]?.plain_text) {
          title = props['Outlet'].title[0].plain_text;
        }
        
        // 获取状态
        let status = '未知';
        if (props['状态']?.select?.name) {
          status = props['状态'].select.name;
        } else if (props['Status']?.status?.name) {
          status = props['Status'].status.name;
        } else if (props['Status']?.select?.name) {
          status = props['Status'].select.name;
        }
        
        // 获取创建时间
        const createdTime = new Date(page.created_time).toLocaleString('zh-CN');
        
        console.log(`      - ${title} [${status}] (创建于: ${createdTime})`);
      }
    } else {
      console.log(`   (空)`);
    }
    
  } catch (error) {
    console.log(`\n${name}: 查询失败 - ${error.response?.data?.message || error.message}`);
  }
}

async function checkAllData() {
  console.log('=' .repeat(70));
  console.log('📊 Notion数据库实际数据检查');
  console.log('=' .repeat(70));
  
  for (const [name, dbId] of Object.entries(databases)) {
    await queryDatabase(name, dbId);
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('\n💡 说明:');
  console.log('- 通用项目库: Salon业务的项目在这里');
  console.log('- 通用任务库: Salon和LaPure业务的任务在这里');
  console.log('- BB House任务库: BB House业务的任务在这里');
  console.log('- LaPure项目库: LaPure业务的项目在这里');
}

checkAllData().catch(console.error);