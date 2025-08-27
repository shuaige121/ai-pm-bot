// test-unified-system.js
// 测试统一的聊天+任务系统

const axios = require('axios');

const AI_SERVER_URL = 'http://localhost:3001';
const API_KEY = 'supersecret_please_change';

async function testIntent(text, author = 'test_user') {
    console.log(`\n📝 测试: "${text}"`);
    console.log('   作者:', author);
    
    try {
        const response = await axios.post(
            `${AI_SERVER_URL}/breakdown`,
            { text, author },
            {
                headers: {
                    'x-api-key': API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        
        const data = response.data;
        console.log('   ✅ 意图:', data.intent);
        console.log('   💬 回复:', data.assistant_reply);
        
        if (data.intent === 'task_new') {
            console.log('   📋 项目:', data.project_title);
            console.log('   📌 任务数:', data.tasks.length);
            data.tasks.forEach((t, i) => {
                console.log(`      ${i+1}. ${t.title} (${t.due_hint || '无期限'})`);
            });
        } else if (data.intent === 'task_done' && data.status_update) {
            console.log('   ✔️ 完成任务:', data.status_update.task_hint);
        } else if (data.intent === 'task_blocked' && data.obstacle) {
            console.log('   ⚠️ 阻碍:', data.obstacle.desc);
            console.log('   🆘 需要:', data.obstacle.need);
        }
        
        return data;
    } catch (error) {
        console.error('   ❌ 错误:', error.message);
        return null;
    }
}

async function runTests() {
    console.log('🧪 开始测试统一的聊天+任务系统\n');
    console.log('=' .repeat(60));
    
    // 测试各种意图
    const tests = [
        // 聊天意图
        { text: '今天天气真好', author: 'user1' },
        { text: '你好，最近怎么样？', author: 'user2' },
        
        // 创建任务意图
        { text: 'Salon需要更新菜单设计，本周完成', author: 'boss' },
        { text: 'BB House的空调需要维修', author: 'manager' },
        { text: 'LaPure需要拍摄新的产品照片', author: 'boss' },
        
        // 完成任务意图
        { text: '菜单设计已经完成了', author: 'designer' },
        { text: '空调维修done', author: 'technician' },
        
        // 阻碍意图
        { text: '拍摄遇到问题，相机坏了需要维修', author: 'photographer' },
        { text: '菜单印刷需要老板批准预算', author: 'admin' },
        
        // 查询意图
        { text: '查看今天的进度', author: 'boss' },
        { text: '汇报一下项目状态', author: 'manager' }
    ];
    
    for (const test of tests) {
        await testIntent(test.text, test.author);
        // 等待一下，避免过快请求
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ 测试完成！');
    console.log('\n系统工作流程:');
    console.log('1. 所有消息都会得到自然语言回复（assistant_reply）');
    console.log('2. 只有任务相关的意图才会写入Notion数据库');
    console.log('3. 聊天意图只返回友好回复，不执行数据库操作');
    console.log('4. 任务会根据关键词自动分配给合适的负责人');
    console.log('5. 业务会根据关键词自动分区到对应数据库');
}

// 运行测试
runTests().catch(console.error);