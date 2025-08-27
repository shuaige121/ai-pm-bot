// test-bot.js
// 测试脚本，用于验证机器人配置

const axios = require('axios');
require('dotenv').config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID || '-4976924235';

console.log('🧪 开始测试机器人配置...\n');

// 测试Telegram Bot
async function testTelegram() {
    console.log('📱 测试Telegram Bot...');
    try {
        const response = await axios.get(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getMe`);
        if (response.data.ok) {
            const bot = response.data.result;
            console.log(`✅ Telegram Bot连接成功`);
            console.log(`   Bot名称: ${bot.first_name}`);
            console.log(`   用户名: @${bot.username}`);
            console.log(`   ID: ${bot.id}`);
            return true;
        }
    } catch (error) {
        console.error('❌ Telegram Bot连接失败:', error.message);
        return false;
    }
}

// 测试Notion API
async function testNotion() {
    console.log('\n📚 测试Notion API...');
    if (!NOTION_API_KEY) {
        console.error('❌ Notion API密钥未配置');
        return false;
    }
    
    try {
        const response = await axios.get('https://api.notion.com/v1/users/me', {
            headers: {
                'Authorization': `Bearer ${NOTION_API_KEY}`,
                'Notion-Version': '2022-06-28'
            }
        });
        
        if (response.data) {
            console.log(`✅ Notion API连接成功`);
            console.log(`   工作区: ${response.data.bot?.workspace_name || '未知'}`);
            console.log(`   类型: ${response.data.type}`);
            return true;
        }
    } catch (error) {
        console.error('❌ Notion API连接失败:', error.message);
        return false;
    }
}

// 测试群组消息发送
async function testGroupMessage() {
    console.log('\n💬 测试群组消息发送...');
    try {
        const message = `🧪 测试消息\n时间: ${new Date().toLocaleString('zh-CN')}\n这是一条来自机器人的测试消息。`;
        
        const response = await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
            {
                chat_id: TELEGRAM_GROUP_ID,
                text: message,
                parse_mode: 'Markdown'
            }
        );
        
        if (response.data.ok) {
            console.log(`✅ 消息发送成功`);
            console.log(`   群组ID: ${TELEGRAM_GROUP_ID}`);
            console.log(`   消息ID: ${response.data.result.message_id}`);
            return true;
        }
    } catch (error) {
        console.error('❌ 消息发送失败:', error.message);
        console.log('   请确保机器人已加入群组并有发送权限');
        return false;
    }
}

// 检查Claude CLI
async function testClaude() {
    console.log('\n🤖 检查Claude CLI...');
    const { spawn } = require('child_process');
    
    return new Promise((resolve) => {
        try {
            const claude = spawn('claude', ['--version']);
            
            claude.stdout.on('data', (data) => {
                console.log(`✅ Claude CLI已安装`);
                console.log(`   版本: ${data.toString().trim()}`);
                resolve(true);
            });
            
            claude.stderr.on('data', (data) => {
                console.error(`❌ Claude CLI错误: ${data.toString()}`);
                resolve(false);
            });
            
            claude.on('error', (error) => {
                console.error('❌ Claude CLI未安装或不可用');
                console.log('   请访问 https://claude.ai/download 下载安装');
                resolve(false);
            });
            
            claude.on('close', (code) => {
                if (code !== 0) {
                    console.error('❌ Claude CLI退出码:', code);
                    resolve(false);
                }
            });
        } catch (error) {
            console.error('❌ 无法运行Claude CLI:', error.message);
            resolve(false);
        }
    });
}

// 运行所有测试
async function runTests() {
    console.log('环境配置:');
    console.log(`  TELEGRAM_BOT_TOKEN: ${TELEGRAM_TOKEN ? '已设置' : '未设置'}`);
    console.log(`  NOTION_API_KEY: ${NOTION_API_KEY ? '已设置' : '未设置'}`);
    console.log(`  TELEGRAM_GROUP_ID: ${TELEGRAM_GROUP_ID}`);
    console.log(`  BOSS_ID: ${process.env.BOSS_ID || '未设置'}`);
    console.log('');
    
    const results = {
        telegram: await testTelegram(),
        notion: await testNotion(),
        message: await testGroupMessage(),
        claude: await testClaude()
    };
    
    console.log('\n📊 测试结果汇总:');
    console.log('================');
    console.log(`Telegram Bot: ${results.telegram ? '✅ 通过' : '❌ 失败'}`);
    console.log(`Notion API: ${results.notion ? '✅ 通过' : '❌ 失败'}`);
    console.log(`群组消息: ${results.message ? '✅ 通过' : '❌ 失败'}`);
    console.log(`Claude CLI: ${results.claude ? '✅ 通过' : '❌ 失败'}`);
    
    const allPassed = Object.values(results).every(r => r === true);
    
    if (allPassed) {
        console.log('\n🎉 所有测试通过！机器人已准备就绪。');
        console.log('运行 npm run start:claude 启动机器人');
    } else {
        console.log('\n⚠️ 部分测试失败，请检查配置。');
        if (!results.claude) {
            console.log('\n提示: Claude CLI不是必需的，可以运行 npm run start:polling 使用基础功能');
        }
    }
}

// 执行测试
runTests().catch(console.error);