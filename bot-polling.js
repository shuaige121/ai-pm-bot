// bot-polling.js
// 轮询模式版本的机器人（用于本地测试，无需Webhook）

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cron = require('node-cron');
require('dotenv').config();

// 配置
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const BOT_USERNAME = '@lapureleonardchow_bot';
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID || '-4976924235';

// Notion API 配置
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_VERSION = process.env.NOTION_VERSION || '2022-06-28';
const NOTION_BASE_URL = 'https://api.notion.com/v1';

// Notion Database IDs
const NOTION_PROJECT_DB_ID = process.env.NOTION_PROJECT_DB_ID;
const NOTION_TASK_DB_ID = process.env.NOTION_TASK_DB_ID;
const NOTION_OBSTACLE_DB_ID = process.env.NOTION_OBSTACLE_DB_ID;

// Notion API headers
const notionHeaders = {
    'Authorization': `Bearer ${NOTION_API_KEY}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION
};

// 初始化机器人（轮询模式）
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

console.log('🤖 机器人已启动（轮询模式）');
console.log(`📱 Bot用户名: ${BOT_USERNAME}`);
console.log(`💬 群组ID: ${TELEGRAM_GROUP_ID}`);

// Notion API 函数
async function getNotionProjects() {
    try {
        const response = await axios.post(
            `${NOTION_BASE_URL}/databases/${NOTION_PROJECT_DB_ID}/query`,
            {},
            { headers: notionHeaders }
        );
        return response.data.results;
    } catch (error) {
        console.error('获取项目失败:', error.message);
        return [];
    }
}

async function getNotionTasks() {
    try {
        const response = await axios.post(
            `${NOTION_BASE_URL}/databases/${NOTION_TASK_DB_ID}/query`,
            {},
            { headers: notionHeaders }
        );
        return response.data.results;
    } catch (error) {
        console.error('获取任务失败:', error.message);
        return [];
    }
}

async function getNotionObstacles() {
    try {
        const response = await axios.post(
            `${NOTION_BASE_URL}/databases/${NOTION_OBSTACLE_DB_ID}/query`,
            {
                filter: {
                    property: '状态',
                    select: {
                        equals: '未解决'
                    }
                }
            },
            { headers: notionHeaders }
        );
        return response.data.results;
    } catch (error) {
        console.error('获取阻碍失败:', error.message);
        return [];
    }
}

async function createNotionTask(taskName, assignee) {
    try {
        const response = await axios.post(
            `${NOTION_BASE_URL}/pages`,
            {
                parent: { database_id: NOTION_TASK_DB_ID },
                properties: {
                    '任务名称': {
                        title: [{
                            text: { content: taskName }
                        }]
                    },
                    '负责人': {
                        rich_text: [{
                            text: { content: assignee || '' }
                        }]
                    },
                    '状态': {
                        select: { name: '未完成' }
                    }
                }
            },
            { headers: notionHeaders }
        );
        return response.data;
    } catch (error) {
        console.error('创建任务失败:', error.message);
        return null;
    }
}

// 生成报告
async function generateReport() {
    try {
        const [projects, tasks, obstacles] = await Promise.all([
            getNotionProjects(),
            getNotionTasks(),
            getNotionObstacles()
        ]);

        const totalProjects = projects.length;
        const completedProjects = projects.filter(p => 
            p.properties['状态']?.select?.name === '完成'
        ).length;
        
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => 
            t.properties['状态']?.select?.name === '完成'
        ).length;
        
        const activeObstacles = obstacles.length;

        const report = `📊 *项目进度报告*\n` +
            `日期: ${new Date().toLocaleDateString('zh-CN')}\n\n` +
            `*项目概况:*\n` +
            `• 总项目数: ${totalProjects}\n` +
            `• 已完成: ${completedProjects}\n` +
            `• 完成率: ${totalProjects > 0 ? Math.round(completedProjects/totalProjects*100) : 0}%\n\n` +
            `*任务进度:*\n` +
            `• 总任务数: ${totalTasks}\n` +
            `• 已完成: ${completedTasks}\n` +
            `• 完成率: ${totalTasks > 0 ? Math.round(completedTasks/totalTasks*100) : 0}%\n\n` +
            `*当前阻碍:* ${activeObstacles} 个\n\n` +
            `---\n` +
            `生成时间: ${new Date().toLocaleTimeString('zh-CN')}`;

        return report;
    } catch (error) {
        console.error('生成报告失败:', error);
        return '❌ 生成报告时出错';
    }
}

// 命令处理
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, 
        `👋 你好！我是AI项目管理助手。\n\n` +
        `我可以帮您：\n` +
        `• 管理项目和任务\n` +
        `• 跟踪进度和阻碍\n` +
        `• 生成报告\n` +
        `• 回答项目相关问题\n\n` +
        `使用 /help 查看所有命令`
    );
});

bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, 
        `📋 可用命令：\n\n` +
        `/projects - 查看所有项目\n` +
        `/tasks - 查看所有任务\n` +
        `/obstacles - 查看当前阻碍\n` +
        `/newtask <任务名> - 创建新任务\n` +
        `/report - 生成项目报告\n` +
        `/status - 检查机器人状态`
    );
});

bot.onText(/\/projects/, async (msg) => {
    const chatId = msg.chat.id;
    const projects = await getNotionProjects();
    
    if (projects.length === 0) {
        await bot.sendMessage(chatId, '📂 暂无项目');
    } else {
        let projectList = '📁 *项目列表：*\n\n';
        projects.forEach((project, index) => {
            const title = project.properties['项目名称']?.title[0]?.text?.content || '未命名';
            const status = project.properties['状态']?.select?.name || '未设置';
            const statusEmoji = status === '完成' ? '✅' : status === '需协助' ? '⚠️' : '🔄';
            projectList += `${index + 1}. ${title} ${statusEmoji} ${status}\n`;
        });
        await bot.sendMessage(chatId, projectList, { parse_mode: 'Markdown' });
    }
});

bot.onText(/\/tasks/, async (msg) => {
    const chatId = msg.chat.id;
    const tasks = await getNotionTasks();
    
    if (tasks.length === 0) {
        await bot.sendMessage(chatId, '✅ 暂无任务');
    } else {
        let taskList = '📝 *任务列表：*\n\n';
        const unfinishedTasks = tasks.filter(task => 
            task.properties['状态']?.select?.name !== '完成'
        );
        
        if (unfinishedTasks.length === 0) {
            await bot.sendMessage(chatId, '🎉 所有任务已完成！');
        } else {
            unfinishedTasks.forEach((task, index) => {
                const title = task.properties['任务名称']?.title[0]?.text?.content || '未命名';
                const status = task.properties['状态']?.select?.name || '未设置';
                const assignee = task.properties['负责人']?.rich_text[0]?.text?.content || '未分配';
                taskList += `${index + 1}. *${title}*\n   状态: ${status} | 负责人: ${assignee}\n\n`;
            });
            await bot.sendMessage(chatId, taskList, { parse_mode: 'Markdown' });
        }
    }
});

bot.onText(/\/obstacles/, async (msg) => {
    const chatId = msg.chat.id;
    const obstacles = await getNotionObstacles();
    
    if (obstacles.length === 0) {
        await bot.sendMessage(chatId, '✨ 当前没有阻碍！');
    } else {
        let obstacleList = '⚠️ *当前阻碍：*\n\n';
        obstacles.forEach((obstacle, index) => {
            const desc = obstacle.properties['阻碍描述']?.title[0]?.text?.content || '未描述';
            const assignee = obstacle.properties['负责人']?.rich_text[0]?.text?.content || '未分配';
            obstacleList += `${index + 1}. *${desc}*\n   负责人: ${assignee}\n\n`;
        });
        await bot.sendMessage(chatId, obstacleList, { parse_mode: 'Markdown' });
    }
});

bot.onText(/\/newtask (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const taskName = match[1];
    const username = msg.from.username || msg.from.first_name;
    
    const task = await createNotionTask(taskName, username);
    if (task) {
        await bot.sendMessage(chatId, `✅ 任务 "${taskName}" 已创建！`);
    } else {
        await bot.sendMessage(chatId, '❌ 创建任务失败，请重试');
    }
});

bot.onText(/\/report/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, '📊 正在生成报告...');
    const report = await generateReport();
    await bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
});

bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const status = `🟢 *机器人状态*\n\n` +
        `运行模式: 轮询\n` +
        `Notion连接: ${NOTION_API_KEY ? '✅ 已配置' : '❌ 未配置'}\n` +
        `群组ID: ${TELEGRAM_GROUP_ID}\n` +
        `启动时间: ${new Date().toLocaleString('zh-CN')}`;
    
    await bot.sendMessage(chatId, status, { parse_mode: 'Markdown' });
});

// 处理非命令消息
bot.on('message', async (msg) => {
    // 如果是命令，由上面的处理器处理
    if (msg.text && msg.text.startsWith('/')) {
        return;
    }
    
    // 忽略机器人自己的消息
    if (msg.from.username === BOT_USERNAME.replace('@', '')) {
        return;
    }
    
    const chatId = msg.chat.id;
    const text = msg.text;
    
    // 简单的关键词响应
    if (text && text.includes('进度')) {
        const report = await generateReport();
        await bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
    } else if (text && (text.includes('你好') || text.includes('hi'))) {
        await bot.sendMessage(chatId, '👋 你好！有什么可以帮助您的吗？使用 /help 查看可用命令。');
    }
});

// 定时任务 - 每天早上9点发送日报
cron.schedule('0 9 * * *', async () => {
    console.log('⏰ 发送日报...');
    if (TELEGRAM_GROUP_ID) {
        const report = await generateReport();
        await bot.sendMessage(TELEGRAM_GROUP_ID, report, { parse_mode: 'Markdown' });
    }
});

// 定时任务 - 每周一早上9点发送周报提醒
cron.schedule('0 9 * * 1', async () => {
    console.log('⏰ 发送周报提醒...');
    if (TELEGRAM_GROUP_ID) {
        await bot.sendMessage(TELEGRAM_GROUP_ID, 
            '📅 *周报提醒*\n新的一周开始了，让我们回顾上周进展并规划本周任务！', 
            { parse_mode: 'Markdown' }
        );
        const report = await generateReport();
        await bot.sendMessage(TELEGRAM_GROUP_ID, report, { parse_mode: 'Markdown' });
    }
});

// 错误处理
bot.on('polling_error', (error) => {
    console.error('轮询错误:', error);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n👋 正在关闭机器人...');
    bot.stopPolling();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 正在关闭机器人...');
    bot.stopPolling();
    process.exit(0);
});

console.log('✅ 机器人初始化完成，等待消息...');