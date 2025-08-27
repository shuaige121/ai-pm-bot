// create-bbhouse-db.js
// Create BB House database in Notion

const axios = require('axios');
require('dotenv').config();

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_VERSION = process.env.NOTION_VERSION || '2022-06-28';
const BB_HOUSE_PAGE_ID = '247efdcd10f580f59516d6182706ed4f'.replace(/-/g, '');

async function createBBHouseDatabase() {
    console.log('🏠 Creating BB House Database...\n');
    
    try {
        const response = await axios.post(
            'https://api.notion.com/v1/databases',
            {
                parent: {
                    type: 'page_id',
                    page_id: BB_HOUSE_PAGE_ID
                },
                title: [
                    {
                        type: 'text',
                        text: {
                            content: 'BB House 任务管理'
                        }
                    }
                ],
                icon: {
                    type: 'emoji',
                    emoji: '🏠'
                },
                properties: {
                    '任务名称': {
                        title: {}
                    },
                    '状态': {
                        select: {
                            options: [
                                { name: '未完成', color: 'red' },
                                { name: '进行中', color: 'yellow' },
                                { name: '完成', color: 'green' },
                                { name: '需协助', color: 'orange' }
                            ]
                        }
                    },
                    '类型': {
                        select: {
                            options: [
                                { name: '项目', color: 'blue' },
                                { name: '任务', color: 'purple' },
                                { name: '维护', color: 'gray' },
                                { name: '租赁', color: 'pink' }
                            ]
                        }
                    },
                    '负责人': {
                        rich_text: {}
                    },
                    '优先级': {
                        select: {
                            options: [
                                { name: '高', color: 'red' },
                                { name: '中', color: 'yellow' },
                                { name: '低', color: 'green' }
                            ]
                        }
                    },
                    '截止日期': {
                        date: {}
                    },
                    '描述': {
                        rich_text: {}
                    },
                    '房间/区域': {
                        select: {
                            options: [
                                { name: '客厅', color: 'blue' },
                                { name: '卧室', color: 'purple' },
                                { name: '厨房', color: 'orange' },
                                { name: '浴室', color: 'pink' },
                                { name: '阳台', color: 'green' },
                                { name: '整体', color: 'gray' }
                            ]
                        }
                    },
                    '预算': {
                        number: {
                            format: 'singapore_dollar'
                        }
                    },
                    '实际花费': {
                        number: {
                            format: 'singapore_dollar'
                        }
                    },
                    '创建日期': {
                        created_time: {}
                    },
                    '更新日期': {
                        last_edited_time: {}
                    },
                    '标签': {
                        multi_select: {
                            options: [
                                { name: 'WiFi', color: 'blue' },
                                { name: '宽带', color: 'purple' },
                                { name: '维修', color: 'red' },
                                { name: '装修', color: 'orange' },
                                { name: '清洁', color: 'green' },
                                { name: '租赁', color: 'pink' },
                                { name: '账单', color: 'yellow' },
                                { name: '紧急', color: 'red' }
                            ]
                        }
                    }
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
        
        console.log('✅ BB House Database created successfully!');
        console.log('📊 Database ID:', response.data.id);
        console.log('🔗 URL:', response.data.url);
        
        console.log('\n📝 Please update your .env file:');
        console.log(`NOTION_DB_BBHOUSE=${response.data.id}`);
        
        // Create a sample task
        console.log('\n➕ Creating sample task...');
        await axios.post(
            'https://api.notion.com/v1/pages',
            {
                parent: { database_id: response.data.id },
                properties: {
                    '任务名称': {
                        title: [{ text: { content: '示例: WiFi安装' } }]
                    },
                    '状态': { select: { name: '未完成' } },
                    '类型': { select: { name: '维护' } },
                    '负责人': { rich_text: [{ text: { content: 'Admin' } }] },
                    '优先级': { select: { name: '高' } },
                    '房间/区域': { select: { name: '整体' } },
                    '描述': { rich_text: [{ text: { content: '联系电信公司安装宽带服务' } }] },
                    '标签': { multi_select: [{ name: 'WiFi' }, { name: '宽带' }] }
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
        console.log('✅ Sample task created!');
        
        return response.data.id;
        
    } catch (error) {
        console.error('❌ Error creating database:', error.response?.data || error.message);
    }
}

createBBHouseDatabase();