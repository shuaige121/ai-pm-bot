// bot-claude.js
// 集成Claude AI、角色路由、业务分区的完整版机器人

const TelegramBot = require('node-telegram-bot-api');
const { spawn } = require('child_process');
const cron = require('node-cron');
const { pickAssignee, mentionFor } = require('./role-router.js');
const { createProjectWithTasks, updateTaskStatus, createObstacle, generateProgressReport } = require('./notion-service.js');
require('dotenv').config();

// 配置
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7809164403:AAFSNjGqrOUSXlQS_0xolVWFkirNud2ojaE';
const BOT_USERNAME = '@lapureleonardchow_bot';
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID || '-1002985202794';
const BOSS_ID = parseInt(process.env.BOSS_ID) || 7624953278;

// 初始化机器人（轮询模式）
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

console.log('🤖 Claude AI项目管理机器人已启动');
console.log(`📱 Bot用户名: ${BOT_USERNAME}`);
console.log(`💬 群组ID: ${TELEGRAM_GROUP_ID}`);
console.log(`👔 老板ID: ${BOSS_ID}`);

// Claude进程管理
let claudeProcess;
let claudeOutputBuffer = '';
let isClaudeProcessing = false;
let currentResolver = null;

function startClaudeProcess() {
    try {
        claudeProcess = spawn('claude', [], { 
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env }
        });

        claudeProcess.stdout.on('data', (data) => {
            const text = data.toString();
            claudeOutputBuffer += text;
            console.log('Claude chunk:', text.substring(0, 50));
            
            // 检测输出完成 - 更宽松的条件
            if (claudeOutputBuffer.includes('}') && claudeOutputBuffer.includes('{')) {
                // 等待一下看是否还有更多输出
                setTimeout(() => {
                    if (isClaudeProcessing) {
                        handleClaudeOutput();
                    }
                }, 500);
            } else if (claudeOutputBuffer.length > 2000) {
                // 防止缓冲区过大
                handleClaudeOutput();
            }
        });

        claudeProcess.stderr.on('data', (data) => {
            console.error('Claude错误:', data.toString());
        });

        claudeProcess.on('error', (error) => {
            console.error('Claude进程错误:', error);
            claudeProcess = null;
            isClaudeProcessing = false;
        });

        claudeProcess.on('close', (code) => {
            console.log(`Claude进程退出，代码: ${code}`);
            claudeProcess = null;
            isClaudeProcessing = false;
        });

        console.log('✅ Claude进程已启动');
    } catch (error) {
        console.error('启动Claude失败:', error);
        claudeProcess = null;
    }
}

function handleClaudeOutput() {
    const output = claudeOutputBuffer.trim();
    claudeOutputBuffer = '';
    isClaudeProcessing = false;
    
    console.log('Claude输出:', output.substring(0, 100) + '...');
    
    if (currentResolver) {
        currentResolver(output);
        currentResolver = null;
    }
}

async function askClaudeJSON(prompt) {
    if (!claudeProcess) {
        startClaudeProcess();
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    if (!claudeProcess) {
        throw new Error('Claude进程未能启动');
    }
    
    return new Promise((resolve) => {
        isClaudeProcessing = true;
        currentResolver = resolve;
        claudeOutputBuffer = '';
        
        try {
            claudeProcess.stdin.write(prompt + '\n');
        } catch (error) {
            console.error('发送到Claude失败:', error);
            isClaudeProcessing = false;
            currentResolver = null;
            resolve(null);
        }
    });
}

// 构建老板任务拆解提示词
function buildBossPrompt(bossUsername, rawText) {
    return `请将以下任务拆解为具体可执行的子任务，直接返回JSON格式，不要有任何解释：

任务内容：${rawText}

要求：
1. 拆解为3-5个子任务
2. 每个任务要具体、可执行
3. 设定合理的时间预期

返回JSON格式（不要markdown标记）：
{
  "project_title": "项目主标题",
  "tasks": [
    {
      "title": "子任务名称",
      "details": "具体要求说明",
      "due_hint": "3天"
    }
  ]
}`;
}

// 老板发布新项目
async function onBossNewProject(msg) {
    const boss = msg.from.username || `user_${msg.from.id}`;
    const chatId = msg.chat.id;
    
    try {
        await bot.sendMessage(chatId, '🤔 正在拆解任务...');
        
        // 让Claude拆解任务
        const prompt = buildBossPrompt(boss, msg.text);
        const jsonText = await askClaudeJSON(prompt);
        
        if (!jsonText) {
            throw new Error('Claude未响应');
        }
        
        // 清理输出并解析JSON
        const cleanJson = jsonText
            .replace(/^(Human|Assistant):\s*/gm, '')
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .trim();
        
        let data;
        try {
            // 尝试找到JSON部分
            const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                data = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('未找到JSON格式');
            }
        } catch (parseError) {
            console.error('JSON解析失败:', cleanJson);
            throw new Error('任务拆解格式错误');
        }
        
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
            sourceText: msg.text   // 让biz-router判断分区
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
        console.error('处理老板任务失败:', error);
        
        // 降级处理：不用Claude，直接创建简单任务
        const fallbackTask = {
            title: msg.text.substring(0, 50),
            assigneeRole: 'admin'
        };
        
        try {
            await createProjectWithTasks({
                projectTitle: msg.text,
                bossName: boss,
                tasks: [fallbackTask],
                sourceText: msg.text
            });
            
            await bot.sendMessage(chatId, 
                `📋 任务已记录: ${msg.text}\n` +
                `负责人: ${mentionFor('admin')}\n` +
                `(Claude暂时不可用，已简化处理)`,
                { parse_mode: 'Markdown' }
            );
        } catch (fallbackError) {
            await bot.sendMessage(chatId, '❌ 任务创建失败，请稍后重试');
        }
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
        // 提取任务名和问题描述
        const text = msg.text;
        const taskMatch = text.match(/任务[：:]\s*(.+?)[\n,，。]/);
        const taskName = taskMatch ? taskMatch[1] : text.substring(0, 30);
        
        await createObstacle({
            taskName,
            description: text,
            username
        });
        
        // 更新任务状态为需协助
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
    
    // 忽略机器人自己的消息
    if (msg.from.username === BOT_USERNAME.replace('@', '')) {
        return;
    }
    
    if (!text) return;
    
    // 处理命令
    if (text.startsWith('/')) {
        await handleCommand(msg);
        return;
    }
    
    // 根据发送者和内容判断处理方式
    if (fromId === BOSS_ID) {
        // 老板发布任务
        await onBossNewProject(msg);
    } else if (text.match(/完成|done|finished|completed/i)) {
        // 员工报告完成
        await onEmployeeComplete(msg);
    } else if (text.match(/问题|阻碍|困难|help|issue|problem|block/i)) {
        // 员工遇到阻碍
        await onEmployeeObstacle(msg);
    } else {
        // 其他消息，简单回复
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
                `🤖 Claude AI项目管理机器人\n\n` +
                `功能:\n` +
                `• 老板发布任务 → AI拆解并分配\n` +
                `• 员工说"完成" → 自动更新状态\n` +
                `• 遇到"问题" → 记录并通知\n` +
                `• 自动路由: 付款→Joe, 直播→郭总, 设计→设计师\n` +
                `• 业务分区: Salon/BB House/LaPure\n\n` +
                `所有数据同步到Notion`
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

// 定时任务：每日报告
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

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n👋 正在关闭...');
    if (claudeProcess) {
        claudeProcess.kill();
    }
    bot.stopPolling();
    process.exit(0);
});

// 启动Claude进程
startClaudeProcess();

console.log('✅ 系统初始化完成，等待消息...');