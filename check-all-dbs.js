// check-all-dbs.js
// 检查所有数据库的schema

const axios = require('axios');
require('dotenv').config();

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_VERSION = process.env.NOTION_VERSION || '2022-06-28';

const databases = {
    'Project DB': process.env.NOTION_PROJECT_DB_ID,
    'Task DB': process.env.NOTION_TASK_DB_ID,
    'Obstacle DB': process.env.NOTION_OBSTACLE_DB_ID,
    'Salon DB': process.env.NOTION_DB_SALON,
    'BB House DB': process.env.NOTION_DB_BBHOUSE,
    'LaPure DB': process.env.NOTION_DB_LAPURE
};

async function checkDatabase(name, dbId) {
    if (!dbId || dbId === 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
        console.log(`\n${name}: 未配置`);
        return;
    }
    
    try {
        const response = await axios.get(
            `https://api.notion.com/v1/databases/${dbId}`,
            {
                headers: {
                    'Authorization': `Bearer ${NOTION_API_KEY}`,
                    'Notion-Version': NOTION_VERSION
                }
            }
        );
        
        const properties = response.data.properties;
        console.log(`\n${name} (${dbId}):`);
        console.log('  标题: ' + (response.data.title[0]?.plain_text || '无标题'));
        console.log('  属性:');
        
        for (const [propName, prop] of Object.entries(properties)) {
            console.log(`    - "${propName}" (${prop.type})`);
        }
        
    } catch (error) {
        console.log(`\n${name} (${dbId}): 错误 - ${error.response?.data?.message || error.message}`);
    }
}

async function checkAllDatabases() {
    console.log('检查所有数据库配置:');
    console.log('=' .repeat(60));
    
    for (const [name, dbId] of Object.entries(databases)) {
        await checkDatabase(name, dbId);
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('建议: 需要为Salon/BB House/LaPure创建专门的项目和任务数据库');
}

checkAllDatabases();