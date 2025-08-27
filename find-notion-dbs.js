// find-notion-dbs.js
// Script to find all Notion databases and their IDs

const axios = require('axios');
require('dotenv').config();

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_VERSION = process.env.NOTION_VERSION || '2022-06-28';

async function searchDatabases() {
    console.log('🔍 Searching for all Notion databases...\n');
    
    try {
        // Search for all databases
        const response = await axios.post(
            'https://api.notion.com/v1/search',
            {
                filter: {
                    property: 'object',
                    value: 'database'
                },
                sort: {
                    direction: 'descending',
                    timestamp: 'last_edited_time'
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${NOTION_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': NOTION_VERSION
                }
            }
        );
        
        const databases = response.data.results;
        
        console.log(`Found ${databases.length} databases:\n`);
        console.log('='.repeat(80));
        
        databases.forEach((db, index) => {
            const title = db.title[0]?.plain_text || 'Untitled';
            const id = db.id;
            const created = new Date(db.created_time).toLocaleDateString('zh-CN');
            const lastEdited = new Date(db.last_edited_time).toLocaleDateString('zh-CN');
            
            console.log(`${index + 1}. ${title}`);
            console.log(`   ID: ${id}`);
            console.log(`   Created: ${created} | Last edited: ${lastEdited}`);
            
            // Try to identify database type based on name
            const lowerTitle = title.toLowerCase();
            if (lowerTitle.includes('项目') || lowerTitle.includes('project')) {
                console.log(`   → 可能是: 项目数据库 (NOTION_PROJECT_DB_ID)`);
            }
            if (lowerTitle.includes('任务') || lowerTitle.includes('task')) {
                console.log(`   → 可能是: 任务数据库 (NOTION_TASK_DB_ID)`);
            }
            if (lowerTitle.includes('阻碍') || lowerTitle.includes('obstacle') || lowerTitle.includes('block')) {
                console.log(`   → 可能是: 阻碍数据库 (NOTION_OBSTACLE_DB_ID)`);
            }
            if (lowerTitle.includes('salon') || lowerTitle.includes('理发') || lowerTitle.includes('美发')) {
                console.log(`   → 可能是: Salon数据库 (NOTION_DB_SALON)`);
            }
            if (lowerTitle.includes('bb') || lowerTitle.includes('house') || lowerTitle.includes('房屋') || lowerTitle.includes('租赁')) {
                console.log(`   → 可能是: BB House数据库 (NOTION_DB_BBHOUSE)`);
            }
            if (lowerTitle.includes('lapure') || lowerTitle.includes('护肤') || lowerTitle.includes('护发')) {
                console.log(`   → 可能是: LaPure数据库 (NOTION_DB_LAPURE)`);
            }
            
            // Show properties
            const properties = Object.keys(db.properties || {});
            if (properties.length > 0) {
                console.log(`   Properties: ${properties.join(', ')}`);
            }
            
            console.log('-'.repeat(80));
        });
        
        console.log('\n📝 建议的 .env 配置:\n');
        console.log('# 请根据上面的分析，更新以下数据库ID');
        console.log('NOTION_PROJECT_DB_ID=<项目数据库的ID>');
        console.log('NOTION_TASK_DB_ID=<任务数据库的ID>');
        console.log('NOTION_OBSTACLE_DB_ID=<阻碍数据库的ID>');
        console.log('NOTION_DB_SALON=<Salon相关数据库的ID>');
        console.log('NOTION_DB_BBHOUSE=<BB House相关数据库的ID>');
        console.log('NOTION_DB_LAPURE=<LaPure相关数据库的ID>');
        
    } catch (error) {
        console.error('❌ 查询失败:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            console.error('请检查 NOTION_API_KEY 是否正确');
        }
    }
}

// Run the search
searchDatabases();