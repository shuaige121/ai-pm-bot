// check-salon-db.js
// 检查Salon数据库的实际属性

const axios = require('axios');
require('dotenv').config();

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_VERSION = process.env.NOTION_VERSION || '2022-06-28';
const SALON_DB_ID = process.env.NOTION_DB_SALON;

async function checkDatabaseSchema() {
    try {
        console.log(`\n检查Salon数据库: ${SALON_DB_ID}\n`);
        
        const response = await axios.get(
            `https://api.notion.com/v1/databases/${SALON_DB_ID}`,
            {
                headers: {
                    'Authorization': `Bearer ${NOTION_API_KEY}`,
                    'Notion-Version': NOTION_VERSION
                }
            }
        );
        
        const properties = response.data.properties;
        console.log('数据库属性:');
        console.log('=' .repeat(50));
        
        for (const [name, prop] of Object.entries(properties)) {
            console.log(`- "${name}" (${prop.type})`);
        }
        
        console.log('\n详细属性信息:');
        console.log(JSON.stringify(properties, null, 2));
        
    } catch (error) {
        console.error('错误:', error.response?.data || error.message);
    }
}

checkDatabaseSchema();