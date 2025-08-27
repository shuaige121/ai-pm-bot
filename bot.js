// bot.js

const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const { spawn } = require('child_process');
const cron = require('node-cron');
const axios = require('axios');
require('dotenv').config();

// 从环境变量加载配置
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7809164403:AAFSNjGqrOUSXlQS_0xolVWFkirNud2ojaE';
const PORT = process.env.PORT || 3000;
const BOT_USERNAME = '@lapureleonardchow_bot';
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID || '-4976924235';
const BOSS_ID = process.env.BOSS_ID || 7624953278; // 可以从getUpdates中获取

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

// 初始化 Express 应用
const app = express();
app.use(bodyParser.json());

// 初始化 Telegram Bot（webhook模式）
const bot = new TelegramBot(TELEGRAM_TOKEN);

// Express 路由：处理 Telegram Webhook
app.post('/webhook', (req, res) => {
    res.sendStatus(200);
    const update = req.body;
    bot.processUpdate(update);
});

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({ status: 'running', bot: BOT_USERNAME });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🤖 服务器已启动，监听端口 ${PORT}`);
    console.log(`📡 Webhook 端点: /webhook`);
    console.log(`💚 健康检查: http://localhost:${PORT}/health`);
});

// Notion API 辅助函数
async function getNotionProjects() {
    try {
        const response = await axios.post(
            `${NOTION_BASE_URL}/databases/${NOTION_PROJECT_DB_ID}/query`,
            {},
            { headers: notionHeaders }
        );
        return response.data.results;
    } catch (error) {
        console.error('Error fetching projects:', error);
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
        console.error('Error fetching tasks:', error);
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
        console.error('Error fetching obstacles:', error);
        return [];
    }
}

async function createNotionTask(taskName, projectId, assignee, dueDate) {
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
                    },
                    '截止日期': dueDate ? {
                        date: { start: dueDate }
                    } : undefined
                }
            },
            { headers: notionHeaders }
        );
        return response.data;
    } catch (error) {
        console.error('Error creating task:', error);
        return null;
    }
}

// 调用 Claude AI 的函数
async function callClaudeAI(prompt) {
    try {
        // 这里使用 child_process 调用 Claude CLI
        // 假设您已安装 Claude CLI 并配置好
        return new Promise((resolve, reject) => {
            const claude = spawn('claude', ['--no-markdown']);
            let output = '';
            let error = '';

            claude.stdout.on('data', (data) => {
                output += data.toString();
            });

            claude.stderr.on('data', (data) => {
                error += data.toString();
            });

            claude.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Claude process exited with code ${code}: ${error}`));
                } else {
                    resolve(output.trim());
                }
            });

            // 发送 prompt 到 Claude
            claude.stdin.write(prompt);
            claude.stdin.end();
        });
    } catch (error) {
        console.error('Error calling Claude:', error);
        // 如果 Claude CLI 不可用，返回备用响应
        return `我正在处理您的请求: "${prompt}"。请稍后再试。`;
    }
}

// 处理文本消息
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name;
    
    // 忽略机器人自己的消息
    if (msg.from.username === BOT_USERNAME.replace('@', '')) {
        return;
    }

    console.log(`📩 收到消息: ${text} (来自: ${username})`);

    // 命令处理
    if (text && text.startsWith('/')) {
        const command = text.split(' ')[0];
        const args = text.substring(command.length).trim();

        switch (command) {
            case '/start':
                await bot.sendMessage(chatId, 
                    `👋 你好！我是AI项目管理助手。\n\n` +
                    `我可以帮您：\n` +
                    `• 管理项目和任务\n` +
                    `• 跟踪进度和阻碍\n` +
                    `• 生成报告\n` +
                    `• 回答项目相关问题\n\n` +
                    `使用 /help 查看所有命令`
                );
                break;

            case '/help':
                await bot.sendMessage(chatId, 
                    `📋 可用命令：\n\n` +
                    `/projects - 查看所有项目\n` +
                    `/tasks - 查看所有任务\n` +
                    `/obstacles - 查看当前阻碍\n` +
                    `/newtask <任务名> - 创建新任务\n` +
                    `/report - 生成项目报告\n` +
                    `/ai <问题> - 询问AI助手`
                );
                break;

            case '/projects':
                const projects = await getNotionProjects();
                if (projects.length === 0) {
                    await bot.sendMessage(chatId, '📂 暂无项目');
                } else {
                    let projectList = '📁 项目列表：\n\n';
                    projects.forEach((project, index) => {
                        const title = project.properties['项目名称']?.title[0]?.text?.content || '未命名';
                        const status = project.properties['状态']?.select?.name || '未设置';
                        projectList += `${index + 1}. ${title} - ${status}\n`;
                    });
                    await bot.sendMessage(chatId, projectList);
                }
                break;

            case '/tasks':
                const tasks = await getNotionTasks();
                if (tasks.length === 0) {
                    await bot.sendMessage(chatId, '✅ 暂无任务');
                } else {
                    let taskList = '📝 任务列表：\n\n';
                    const unfinishedTasks = tasks.filter(task => 
                        task.properties['状态']?.select?.name !== '完成'
                    );
                    unfinishedTasks.forEach((task, index) => {
                        const title = task.properties['任务名称']?.title[0]?.text?.content || '未命名';
                        const status = task.properties['状态']?.select?.name || '未设置';
                        const assignee = task.properties['负责人']?.rich_text[0]?.text?.content || '未分配';
                        taskList += `${index + 1}. ${title}\n   状态: ${status} | 负责人: ${assignee}\n\n`;
                    });
                    await bot.sendMessage(chatId, taskList || '所有任务已完成！');
                }
                break;

            case '/obstacles':
                const obstacles = await getNotionObstacles();
                if (obstacles.length === 0) {
                    await bot.sendMessage(chatId, '✨ 当前没有阻碍！');
                } else {
                    let obstacleList = '⚠️ 当前阻碍：\n\n';
                    obstacles.forEach((obstacle, index) => {
                        const desc = obstacle.properties['阻碍描述']?.title[0]?.text?.content || '未描述';
                        const assignee = obstacle.properties['负责人']?.rich_text[0]?.text?.content || '未分配';
                        obstacleList += `${index + 1}. ${desc}\n   负责人: ${assignee}\n\n`;
                    });
                    await bot.sendMessage(chatId, obstacleList);
                }
                break;

            case '/newtask':
                if (args) {
                    const task = await createNotionTask(args, null, username, null);
                    if (task) {
                        await bot.sendMessage(chatId, `✅ 任务 "${args}" 已创建！`);
                    } else {
                        await bot.sendMessage(chatId, '❌ 创建任务失败，请重试');
                    }
                } else {
                    await bot.sendMessage(chatId, '请提供任务名称，例如: /newtask 完成产品设计');
                }
                break;

            case '/report':
                await generateAndSendReport(chatId);
                break;

            case '/ai':
                if (args) {
                    await bot.sendMessage(chatId, '🤔 正在思考...');
                    const response = await callClaudeAI(args);
                    await bot.sendMessage(chatId, response);
                } else {
                    await bot.sendMessage(chatId, '请提供问题，例如: /ai 如何提高团队效率？');
                }
                break;

            default:
                await bot.sendMessage(chatId, '❓ 未知命令。使用 /help 查看可用命令');
        }
    } else if (text) {
        // 对于非命令消息，使用AI处理
        const response = await callClaudeAI(`作为项目管理助手，请回答: ${text}`);
        await bot.sendMessage(chatId, response);
    }
});

// 生成并发送报告
async function generateAndSendReport(chatId) {
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

        const report = `📊 **项目进度报告**\n` +
            `日期: ${new Date().toLocaleDateString('zh-CN')}\n\n` +
            `**项目概况:**\n` +
            `• 总项目数: ${totalProjects}\n` +
            `• 已完成: ${completedProjects}\n` +
            `• 完成率: ${totalProjects > 0 ? Math.round(completedProjects/totalProjects*100) : 0}%\n\n` +
            `**任务进度:**\n` +
            `• 总任务数: ${totalTasks}\n` +
            `• 已完成: ${completedTasks}\n` +
            `• 完成率: ${totalTasks > 0 ? Math.round(completedTasks/totalTasks*100) : 0}%\n\n` +
            `**当前阻碍:** ${activeObstacles} 个\n\n` +
            `---\n` +
            `报告生成时间: ${new Date().toLocaleTimeString('zh-CN')}`;

        await bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Error generating report:', error);
        await bot.sendMessage(chatId, '❌ 生成报告时出错，请稍后重试');
    }
}

// 设置定时任务 - 每天早上9点发送日报
cron.schedule('0 9 * * *', async () => {
    console.log('⏰ 执行定时任务：发送日报');
    if (TELEGRAM_GROUP_ID) {
        await generateAndSendReport(TELEGRAM_GROUP_ID);
    }
});

// 设置定时任务 - 每周一早上9点发送周报
cron.schedule('0 9 * * 1', async () => {
    console.log('⏰ 执行定时任务：发送周报');
    if (TELEGRAM_GROUP_ID) {
        await bot.sendMessage(TELEGRAM_GROUP_ID, '📅 **周报提醒**\n新的一周开始了，让我们回顾上周进展并规划本周任务！', 
            { parse_mode: 'Markdown' });
        await generateAndSendReport(TELEGRAM_GROUP_ID);
    }
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n👋 正在关闭服务器...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 正在关闭服务器...');
    process.exit(0);
});

console.log('🚀 AI项目管理机器人已启动！');