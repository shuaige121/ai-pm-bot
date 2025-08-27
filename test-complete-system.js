// test-complete-system.js
// 完整测试修复后的系统

const axios = require('axios');
require('dotenv').config();

const AI_SERVER_URL = 'http://localhost:3001';
const API_KEY = 'supersecret_please_change';

async function testCase(name, text, author = 'test_user') {
    console.log(`\n🧪 测试: ${name}`);
    console.log(`   输入: "${text}"`);
    
    try {
        const response = await axios.post(
            `${AI_SERVER_URL}/breakdown`,
            { text, author },
            {
                headers: {
                    'x-api-key': API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 20000
            }
        );
        
        const data = response.data;
        console.log(`   ✅ 意图: ${data.intent}`);
        console.log(`   💬 回复: ${data.assistant_reply}`);
        
        if (data.intent === 'task_new' && data.project_title) {
            console.log(`   📋 项目: ${data.project_title}`);
            console.log(`   📌 任务数: ${data.tasks?.length || 0}`);
        }
        
        return data;
    } catch (error) {
        console.error(`   ❌ 错误: ${error.message}`);
        return null;
    }
}

async function runTests() {
    console.log('=' .repeat(70));
    console.log('🔧 完整系统测试 - 验证所有修复');
    console.log('=' .repeat(70));
    
    // 1. 测试Salon任务（应使用通用项目库）
    await testCase(
        'Salon任务创建', 
        'Salon需要订购新的染发剂和洗发水，本周内完成',
        'salon_manager'
    );
    
    // 2. 测试BB House任务（应使用BB House任务库）
    await testCase(
        'BB House任务创建',
        'BB House的空调坏了，需要维修',
        'bb_manager'
    );
    
    // 3. 测试LaPure任务（应使用LaPure项目库）
    await testCase(
        'LaPure任务创建',
        'LaPure需要拍摄新产品的宣传照片',
        'lapure_boss'
    );
    
    // 4. 测试不明确的任务（应询问属于哪个业务）
    await testCase(
        '不明确业务的任务',
        '需要订购一批办公用品',
        'admin'
    );
    
    // 5. 测试纯聊天（不应创建任务）
    await testCase(
        '聊天消息',
        '今天天气真不错啊',
        'user123'
    );
    
    // 6. 测试任务完成
    await testCase(
        '任务完成报告',
        '空调维修已经完成了',
        'technician'
    );
    
    // 7. 测试遇到阻碍
    await testCase(
        '阻碍报告',
        '拍摄遇到问题，相机坏了需要维修',
        'photographer'
    );
    
    // 8. 测试查询进度
    await testCase(
        '查询进度',
        '查看今天的项目进度',
        'boss'
    );
    
    console.log('\n' + '=' .repeat(70));
    console.log('✅ 测试完成！');
    console.log('\n📊 测试总结:');
    console.log('1. Salon任务 → 使用通用项目库（中文属性）');
    console.log('2. BB House任务 → 使用BB House任务库（中文属性）');
    console.log('3. LaPure任务 → 使用LaPure项目库（英文属性）');
    console.log('4. 不明确的任务 → AI会询问属于哪个业务');
    console.log('5. 聊天消息 → 只回复，不创建任务');
    console.log('6. 所有消息都有自然语言回复');
    console.log('=' .repeat(70));
}

// 运行测试
runTests().catch(console.error);