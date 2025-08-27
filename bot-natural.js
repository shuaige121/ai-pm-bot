// bot-natural.js
// 自然语言版本 - 无需斜杠命令，直接对话

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cron = require('node-cron');
require('dotenv').config();

// 配置
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7809164403:AAFSNjGqrOUSXlQS_0xolVWFkirNud2ojaE';
const BOT_USERNAME = '@lapureleonardchow_bot';
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID || '-1002985202794';
const BOSS_ID = parseInt(process.env.BOSS_ID) || 7624953278;

// Notion API 配置
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_VERSION = process.env.NOTION_VERSION || '2022-06-28';
const NOTION_BASE_URL = 'https://api.notion.com/v1';
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

console.log('🤖 自然语言机器人已启动');
console.log(`📱 Bot用户名: ${BOT_USERNAME}`);
console.log(`💬 群组ID: ${TELEGRAM_GROUP_ID}`);
console.log('💡 无需使用斜杠命令，直接对话即可！');

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
            `生成时间: ${new Date().toLocaleTimeString('zh-CN')}`;

        return report;
    } catch (error) {
        console.error('生成报告失败:', error);
        return '❌ 生成报告时出错';
    }
}

// 分析消息意图
function analyzeIntent(text) {
    const lowerText = text.toLowerCase();
    
    // 项目相关
    if (lowerText.includes('项目') || lowerText.includes('project')) {
        if (lowerText.includes('有哪些') || lowerText.includes('列表') || lowerText.includes('show') || lowerText.includes('list')) {
            return 'show_projects';
        }
        if (lowerText.includes('进度') || lowerText.includes('status') || lowerText.includes('progress')) {
            return 'project_status';
        }
    }
    
    // 任务相关
    if (lowerText.includes('任务') || lowerText.includes('task')) {
        if (lowerText.includes('创建') || lowerText.includes('新建') || lowerText.includes('create') || lowerText.includes('add')) {
            return 'create_task';
        }
        if (lowerText.includes('有哪些') || lowerText.includes('列表') || lowerText.includes('show') || lowerText.includes('list')) {
            return 'show_tasks';
        }
    }
    
    // 报告相关
    if (lowerText.includes('报告') || lowerText.includes('report') || lowerText.includes('进度') || lowerText.includes('progress')) {
        return 'generate_report';
    }
    
    // 阻碍/问题
    if (lowerText.includes('阻碍') || lowerText.includes('问题') || lowerText.includes('obstacle') || lowerText.includes('issue') || lowerText.includes('problem')) {
        return 'show_obstacles';
    }
    
    // 完成任务
    if (lowerText.includes('完成') || lowerText.includes('done') || lowerText.includes('finished') || lowerText.includes('completed')) {
        return 'task_completed';
    }
    
    // 帮助
    if (lowerText.includes('帮助') || lowerText.includes('help') || lowerText.includes('怎么用') || lowerText.includes('how to')) {
        return 'help';
    }
    
    // 问候
    if (lowerText.includes('你好') || lowerText.includes('hi') || lowerText.includes('hello') || lowerText.includes('hey')) {
        return 'greeting';
    }
    
    // 状态检查
    if (lowerText.includes('状态') || lowerText.includes('status') || lowerText.includes('你在吗') || lowerText.includes('are you there')) {
        return 'status_check';
    }
    
    return 'unknown';
}

// 提取任务名称
function extractTaskName(text) {
    // 尝试提取引号中的内容
    const quotedMatch = text.match(/["']([^"']+)["']/);
    if (quotedMatch) return quotedMatch[1];
    
    // 尝试提取"创建任务"后的内容
    const patterns = [
        /创建任务[:：\s]+(.+)/i,
        /新建任务[:：\s]+(.+)/i,
        /添加任务[:：\s]+(.+)/i,
        /create task[:：\s]+(.+)/i,
        /add task[:：\s]+(.+)/i,
        /任务[:：\s]+(.+)/i,
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1].trim();
    }
    
    // 如果没有特定格式，返回整个消息（去除关键词）
    return text.replace(/创建任务|新建任务|添加任务|create task|add task|任务/gi, '').trim();
}

// 处理消息
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();
    const fromId = msg.from.id;
    const username = msg.from.username || msg.from.first_name || '未知用户';
    
    // 忽略机器人自己的消息
    if (msg.from.username === BOT_USERNAME.replace('@', '')) {
        return;
    }
    
    if (!text) return;
    
    console.log(`📩 收到消息 [${username}]: ${text}`);
    
    // 分析意图
    const intent = analyzeIntent(text);
    console.log(`🎯 识别意图: ${intent}`);
    
    // 根据意图处理
    switch (intent) {
        case 'greeting':
            await bot.sendMessage(chatId, 
                `👋 你好 ${username}！我是AI项目管理助手。\n\n` +
                `你可以直接对我说：\n` +
                `• "显示所有项目"\n` +
                `• "查看任务列表"\n` +
                `• "创建任务：任务名称"\n` +
                `• "生成进度报告"\n` +
                `• "有什么阻碍"\n\n` +
                `无需使用斜杠命令，自然对话即可！`
            );
            break;
            
        case 'help':
            await bot.sendMessage(chatId, 
                `💡 *使用说明*\n\n` +
                `直接用自然语言和我对话，例如：\n\n` +
                `*查看信息：*\n` +
                `• "项目有哪些" / "显示项目"\n` +
                `• "任务列表" / "有什么任务"\n` +
                `• "进度如何" / "生成报告"\n` +
                `• "有什么问题" / "阻碍情况"\n\n` +
                `*创建任务：*\n` +
                `• "创建任务：设计新页面"\n` +
                `• "新建任务 优化数据库"\n\n` +
                `*更新状态：*\n` +
                `• "任务完成了"\n` +
                `• "遇到问题了"\n\n` +
                `我会理解你的意图并作出响应！`,
                { parse_mode: 'Markdown' }
            );
            break;
            
        case 'show_projects':
        case 'project_status':
            const projects = await getNotionProjects();
            if (projects.length === 0) {
                await bot.sendMessage(chatId, '📂 目前还没有项目');
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
            break;
            
        case 'show_tasks':
            const tasks = await getNotionTasks();
            if (tasks.length === 0) {
                await bot.sendMessage(chatId, '✅ 目前还没有任务');
            } else {
                const unfinishedTasks = tasks.filter(task => 
                    task.properties['状态']?.select?.name !== '完成'
                );
                
                if (unfinishedTasks.length === 0) {
                    await bot.sendMessage(chatId, '🎉 太棒了！所有任务都已完成！');
                } else {
                    let taskList = '📝 *未完成的任务：*\n\n';
                    unfinishedTasks.forEach((task, index) => {
                        const title = task.properties['任务名称']?.title[0]?.text?.content || '未命名';
                        const status = task.properties['状态']?.select?.name || '未设置';
                        const assignee = task.properties['负责人']?.rich_text[0]?.text?.content || '未分配';
                        taskList += `${index + 1}. *${title}*\n   负责人: ${assignee} | 状态: ${status}\n\n`;
                    });
                    await bot.sendMessage(chatId, taskList, { parse_mode: 'Markdown' });
                }
            }
            break;
            
        case 'create_task':
            const taskName = extractTaskName(text);
            if (taskName && taskName.length > 0) {
                const task = await createNotionTask(taskName, username);
                if (task) {
                    await bot.sendMessage(chatId, 
                        `✅ 好的，任务 "${taskName}" 已创建！\n负责人：${username}`
                    );
                } else {
                    await bot.sendMessage(chatId, '❌ 创建任务失败，请重试');
                }
            } else {
                await bot.sendMessage(chatId, 
                    '请告诉我任务名称，例如：\n"创建任务：完成产品设计"'
                );
            }
            break;
            
        case 'generate_report':
            await bot.sendMessage(chatId, '📊 正在生成报告，请稍等...');
            const report = await generateReport();
            await bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
            break;
            
        case 'show_obstacles':
            const obstacles = await getNotionObstacles();
            if (obstacles.length === 0) {
                await bot.sendMessage(chatId, '✨ 太好了！目前没有任何阻碍！');
            } else {
                let obstacleList = '⚠️ *当前的阻碍：*\n\n';
                obstacles.forEach((obstacle, index) => {
                    const desc = obstacle.properties['阻碍描述']?.title[0]?.text?.content || '未描述';
                    const assignee = obstacle.properties['负责人']?.rich_text[0]?.text?.content || '未分配';
                    obstacleList += `${index + 1}. *${desc}*\n   负责人: ${assignee}\n\n`;
                });
                await bot.sendMessage(chatId, obstacleList, { parse_mode: 'Markdown' });
            }
            break;
            
        case 'task_completed':
            await bot.sendMessage(chatId, 
                `🎉 太棒了 @${username}！任务完成了！\n\n` +
                `（提示：请在Notion中手动更新任务状态）`
            );
            break;
            
        case 'status_check':
            await bot.sendMessage(chatId, 
                `🟢 我在线！\n` +
                `系统状态：正常运行中\n` +
                `Notion连接：${NOTION_API_KEY ? '✅' : '❌'}\n` +
                `当前时间：${new Date().toLocaleString('zh-CN')}`
            );
            break;
            
        case 'unknown':
        default:
            // 对于无法识别的消息，尝试智能回复
            if (text.length < 5) {
                // 短消息可能是表情或简单回应，不处理
                return;
            }
            
            await bot.sendMessage(chatId, 
                `收到你的消息："${text}"\n\n` +
                `我理解的关键词有：\n` +
                `• 项目、任务、报告、进度\n` +
                `• 创建、完成、阻碍、问题\n\n` +
                `试试说"显示项目"或"创建任务：任务名"？`
            );
    }
});

// 定时任务 - 每天早上9点发送日报
cron.schedule('0 9 * * *', async () => {
    console.log('⏰ 发送日报...');
    if (TELEGRAM_GROUP_ID) {
        const report = await generateReport();
        await bot.sendMessage(TELEGRAM_GROUP_ID, 
            `☀️ *早安！今日项目状态：*\n\n${report}`, 
            { parse_mode: 'Markdown' }
        );
    }
});

// 定时任务 - 每天下午6点发送晚报
cron.schedule('0 18 * * *', async () => {
    console.log('⏰ 发送晚报...');
    if (TELEGRAM_GROUP_ID) {
        const report = await generateReport();
        await bot.sendMessage(TELEGRAM_GROUP_ID, 
            `🌙 *今日工作总结：*\n\n${report}\n\n辛苦了，大家！`, 
            { parse_mode: 'Markdown' }
        );
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

console.log('✅ 自然语言机器人初始化完成！');
console.log('💬 试试在群组里说："你好"、"显示项目"、"生成报告"等');