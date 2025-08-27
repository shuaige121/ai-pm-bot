// bot-with-api.js
// 使用HTTP API调用Claude来处理任务拆解

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cron = require('node-cron');
const { pickAssignee, mentionFor } = require('./role-router.js');
const { createProjectWithTasks, updateTaskStatus, createObstacle, generateProgressReport } = require('./notion-service.js');
require('dotenv').config();

// 配置
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const BOT_USERNAME = '@lapureleonardchow_bot';
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID || 'YOUR_GROUP_ID_HERE';
const BOSS_ID = parseInt(process.env.BOSS_ID) || YOUR_BOSS_ID;

// Claude API配置 - 需要你的API key
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || 'YOUR_CLAUDE_API_KEY';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// 初始化机器人
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

console.log('🤖 API版项目管理机器人已启动');
console.log(`📱 Bot用户名: ${BOT_USERNAME}`);
console.log(`💬 群组ID: ${TELEGRAM_GROUP_ID}`);
console.log(`👔 老板ID: ${BOSS_ID}`);

// 调用Claude API来拆解任务
async function callClaudeAPI(taskText) {
    try {
        const response = await axios.post(
            CLAUDE_API_URL,
            {
                model: 'claude-3-opus-20240229',
                max_tokens: 1000,
                messages: [{
                    role: 'user',
                    content: `请将以下任务拆解为3-5个具体可执行的子任务，直接返回JSON格式，不要有任何其他解释或markdown标记：

任务内容：${taskText}

要求：
1. 拆解为3-5个子任务
2. 每个任务要具体、可执行
3. 设定合理的时间预期

只返回纯JSON格式如下：
{
  "project_title": "项目主标题",
  "tasks": [
    {
      "title": "子任务名称",
      "details": "具体要求说明",
      "due_hint": "3天"
    }
  ]
}`
                }]
            },
            {
                headers: {
                    'x-api-key': CLAUDE_API_KEY,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json'
                }
            }
        );
        
        const content = response.data.content[0].text;
        // 提取JSON部分
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error('未找到JSON格式响应');
        
    } catch (error) {
        console.error('Claude API调用失败:', error.message);
        // 降级到简单拆解
        return fallbackBreakdown(taskText);
    }
}

// 备用的简单拆解逻辑
function fallbackBreakdown(taskText) {
    const projectTitle = taskText.substring(0, 50);
    const tasks = [];
    const lowerText = taskText.toLowerCase();
    
    if (lowerText.includes('设计') || lowerText.includes('海报')) {
        tasks.push(
            { title: '收集设计需求', details: '明确设计要求和风格', due_hint: '1天' },
            { title: '制作设计初稿', details: '完成第一版设计', due_hint: '2天' },
            { title: '修改完善', details: '根据反馈调整', due_hint: '1天' }
        );
    } else if (lowerText.includes('付款') || lowerText.includes('支付')) {
        tasks.push(
            { title: '核对付款信息', details: '确认金额和收款方', due_hint: '1天' },
            { title: '准备付款凭证', details: '整理相关文件', due_hint: '1天' },
            { title: '执行付款', details: '完成转账操作', due_hint: '1天' }
        );
    } else {
        tasks.push(
            { title: '需求分析', details: '明确具体要求', due_hint: '1天' },
            { title: '制定计划', details: '规划执行步骤', due_hint: '1天' },
            { title: '执行任务', details: '完成主要工作', due_hint: '3天' }
        );
    }
    
    return {
        project_title: projectTitle,
        tasks: tasks
    };
}

// 老板发布新项目
async function onBossNewProject(msg) {
    const boss = msg.from.username || `user_${msg.from.id}`;
    const chatId = msg.chat.id;
    
    try {
        await bot.sendMessage(chatId, '🤔 正在智能拆解任务...');
        
        // 调用Claude API或使用备用方案
        const data = await callClaudeAPI(msg.text);
        
        // 为每个任务分配负责人
        const tasksWithAssignee = (data.tasks || []).map(t => {
            const role = pickAssignee(`${t.title} ${t.details || ''}`);
            return { ...t, assigneeRole: role };
        });
        
        // 创建项目和任务到Notion
        await createProjectWithTasks({
            projectTitle: data.project_title,
            bossName: boss,
            tasks: tasksWithAssignee,
            sourceText: msg.text
        });
        
        // 生成群组消息
        const lines = [`📋 **${data.project_title}** 已创建\n发起人: @${boss}\n`];
        tasksWithAssignee.forEach((t, i) => {
            const mention = mentionFor(t.assigneeRole);
            const due = t.due_hint ? `(截止: ${t.due_hint})` : '';
            lines.push(`${i+1}. ${t.title} - ${mention} ${due}`);
        });
        lines.push('\n✅ 已同步到Notion');
        
        await bot.sendMessage(chatId, lines.join('\n'), { 
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        });
        
    } catch (error) {
        console.error('处理任务失败:', error);
        await bot.sendMessage(chatId, '❌ 任务创建失败，请稍后重试');
    }
}

// 员工报告完成
async function onEmployeeComplete(msg) {
    const username = msg.from.username || msg.from.first_name || '未知用户';
    const chatId = msg.chat.id;
    const taskInfo = msg.text.replace(/完成|done|finished|completed/gi, '').trim();
    
    try {
        const success = await updateTaskStatus(taskInfo, '完成', username);
        
        if (success) {
            await bot.sendMessage(chatId, 
                `✅ @${username} 完成了任务！\n` +
                `任务: ${taskInfo}\n` +
                `状态已更新到Notion`,
                { parse_mode: 'Markdown' }
            );
        } else {
            await bot.sendMessage(chatId, 
                `⚠️ @${username} 未找到匹配的任务\n` +
                `请确认任务名称或在Notion中手动更新`,
                { parse_mode: 'Markdown' }
            );
        }
    } catch (error) {
        console.error('更新任务状态失败:', error);
        await bot.sendMessage(chatId, '❌ 更新失败，请稍后重试');
    }
}

// 员工报告阻碍
async function onEmployeeObstacle(msg) {
    const username = msg.from.username || msg.from.first_name || '未知用户';
    const chatId = msg.chat.id;
    
    try {
        const text = msg.text;
        const taskMatch = text.match(/任务[：:]\s*(.+?)[\n,，。]/);
        const taskName = taskMatch ? taskMatch[1] : text.substring(0, 30);
        
        await createObstacle({
            taskName,
            description: text,
            username
        });
        
        await updateTaskStatus(taskName, '需协助', username);
        
        await bot.sendMessage(chatId, 
            `⚠️ @${username} 遇到阻碍\n` +
            `任务: ${taskName}\n` +
            `已标记为"需协助"状态\n` +
            `@${BOSS_ID === msg.from.id ? '团队' : '老板'} 请协助解决`,
            { parse_mode: 'Markdown' }
        );
    } catch (error) {
        console.error('记录阻碍失败:', error);
        await bot.sendMessage(chatId, '❌ 记录失败，请稍后重试');
    }
}

// 消息处理
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();
    const fromId = msg.from.id;
    
    if (msg.from.username === BOT_USERNAME.replace('@', '')) {
        return;
    }
    
    if (!text) return;
    
    if (text.startsWith('/')) {
        await handleCommand(msg);
        return;
    }
    
    if (fromId === BOSS_ID) {
        await onBossNewProject(msg);
    } else if (text.match(/完成|done|finished|completed/i)) {
        await onEmployeeComplete(msg);
    } else if (text.match(/问题|阻碍|困难|help|issue|problem|block/i)) {
        await onEmployeeObstacle(msg);
    } else {
        await bot.sendMessage(chatId, 
            `收到消息。请使用关键词:\n` +
            `• 任务完成: "完成"或"done"\n` +
            `• 遇到问题: "问题"或"阻碍"\n` +
            `• 老板发任务: 直接描述任务内容`
        );
    }
});

// 命令处理
async function handleCommand(msg) {
    const chatId = msg.chat.id;
    const command = msg.text.split(' ')[0];
    
    switch (command) {
        case '/start':
            await bot.sendMessage(chatId, 
                `🤖 AI项目管理机器人\n\n` +
                `功能:\n` +
                `• 老板发布任务 → AI智能拆解并分配\n` +
                `• 员工说"完成" → 自动更新状态\n` +
                `• 遇到"问题" → 记录并通知\n` +
                `• 自动路由: 付款→Joe, 直播→郭总, 设计→设计师\n` +
                `• 业务分区: Salon/BB House/LaPure\n\n` +
                `由Claude AI提供智能支持`
            );
            break;
            
        case '/status':
            try {
                const report = await generateProgressReport();
                await bot.sendMessage(chatId,
                    `📊 项目进度报告\n\n` +
                    `项目:\n` +
                    `• ${report.projects.active}个进行中\n` +
                    `• ${report.projects.completed}个已完成\n\n` +
                    `任务:\n` +
                    `• ${report.tasks.pending}个待完成\n` +
                    `• ${report.tasks.needHelp}个需协助\n` +
                    `• ${report.tasks.completed}个已完成\n\n` +
                    `阻碍: ${report.obstacles.open}个待解决`
                );
            } catch (error) {
                await bot.sendMessage(chatId, '❌ 获取状态失败');
            }
            break;
            
        case '/help':
            await bot.sendMessage(chatId,
                `📋 使用说明\n\n` +
                `老板: 直接发送任务描述\n` +
                `员工: \n` +
                `• 完成任务说"完成"\n` +
                `• 遇到问题说"问题"\n\n` +
                `命令:\n` +
                `/status - 查看进度\n` +
                `/help - 显示帮助`
            );
            break;
            
        default:
            await bot.sendMessage(chatId, '❓ 未知命令，使用 /help 查看帮助');
    }
}

// 定时任务
cron.schedule('0 9,13,18 * * *', async () => {
    console.log('⏰ 生成定时报告...');
    
    try {
        const report = await generateProgressReport();
        const now = new Date().toLocaleString('zh-CN');
        
        await bot.sendMessage(TELEGRAM_GROUP_ID,
            `📊 定时进度报告 [${now}]\n\n` +
            `项目: ${report.projects.active}个进行中, ${report.projects.completed}个已完成\n` +
            `任务: ${report.tasks.pending}个待完成, ${report.tasks.needHelp}个需协助\n` +
            `阻碍: ${report.obstacles.open}个待解决\n\n` +
            `请相关负责人及时跟进！`
        );
    } catch (error) {
        console.error('生成报告失败:', error);
    }
});

// 错误处理
bot.on('polling_error', (error) => {
    console.error('Telegram轮询错误:', error);
});

process.on('uncaughtException', (error) => {
    console.error('未捕获异常:', error);
});

process.on('unhandledRejection', (reason) => {
    console.error('未处理的Promise拒绝:', reason);
});

process.on('SIGINT', () => {
    console.log('\n👋 正在关闭...');
    bot.stopPolling();
    process.exit(0);
});

console.log('✅ 系统初始化完成，等待消息...');
console.log('⚠️ 注意: 需要配置CLAUDE_API_KEY环境变量才能使用AI功能');