// bot-with-ai-server.js
// 调用本地AI服务器的机器人版本

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs');
const { pickAssignee, mentionFor } = require('./role-router.js');
const { createProjectWithTasks, updateTaskStatus, createObstacle, generateProgressReport, listAllProjects, listPendingTasks } = require('./notion-service.js');
const { 
  addRecurringTask, 
  removeRecurringTask, 
  markRecurringTaskComplete, 
  getAllRecurringTasks,
  getPendingRecurringTasks,
  initializeRecurringTasks 
} = require('./recurring-tasks.js');
// 只使用本地语音服务（完全免费，无需API密钥）
const { 
  processVoiceMessageLocal, 
  textToSpeechLocal, 
  checkDependencies 
} = require('./voice-service-local.js');
require('dotenv').config();

// 配置
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7809164403:AAFSNjGqrOUSXlQS_0xolVWFkirNud2ojaE';
const BOT_USERNAME = '@lapureleonardchow_bot';
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID || '-1002985202794';
const BOSS_ID = parseInt(process.env.BOSS_ID) || 7624953278;

// AI服务器配置
const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:3001';

// 初始化机器人
const bot = new TelegramBot(TELEGRAM_TOKEN, { 
    polling: true,
    request: {
        agentOptions: {
            keepAlive: true,
            family: 4
        }
    }
});

// 存储待确认的任务
const pendingTasks = new Map(); // key: messageId, value: {tasks, projectTitle, bossName, sourceText, timestamp}

console.log('🤖 AI服务器版项目管理机器人已启动');
console.log(`📱 Bot用户名: ${BOT_USERNAME}`);
console.log(`💬 群组ID: ${TELEGRAM_GROUP_ID}`);
console.log(`👔 老板ID: ${BOSS_ID}`);
console.log(`🧠 AI服务器: ${AI_SERVER_URL}`);

// 检查AI服务器
async function checkAIServer() {
    try {
        const response = await axios.get(`${AI_SERVER_URL}/health`, {
            headers: {
                'x-api-key': process.env.AI_SERVER_KEY || 'supersecret_please_change'
            }
        });
        console.log('✅ AI服务器连接成功:', response.data.service || 'AI服务器运行中');
        return true;
    } catch (error) {
        console.error('❌ AI服务器未启动或密钥错误');
        return false;
    }
}

// 调用AI服务器拆解任务
async function callAIServer(taskText, author = 'unknown') {
    try {
        const response = await axios.post(
            `${AI_SERVER_URL}/breakdown`, 
            {
                text: taskText,  // 改为text字段（匹配新接口）
                author: author,
                idempotencyKey: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`
            },
            {
                headers: {
                    'x-api-key': process.env.AI_SERVER_KEY || 'supersecret_please_change',
                    'Content-Type': 'application/json'
                }
            }
        );
        
        // 新接口返回 {ok, project_title, tasks}
        if (response.data.ok) {
            return response.data;
        } else {
            throw new Error(response.data.error || 'AI服务器返回错误');
        }
    } catch (error) {
        console.error('AI服务器调用失败:', error.message);
        // 降级到简单拆解
        return {
            project_title: taskText.substring(0, 50),
            tasks: [
                { title: '需求分析', details: '明确具体要求', due_hint: '1天' },
                { title: '执行任务', details: '完成主要工作', due_hint: '3天' },
                { title: '验收交付', details: '检查并交付', due_hint: '1天' }
            ]
        };
    }
}

// 老板发布新项目
async function onBossNewProject(msg) {
    const boss = msg.from.username || `user_${msg.from.id}`;
    const chatId = msg.chat.id;
    
    try {
        await bot.sendMessage(chatId, '🤔 AI正在拆解任务...');
        
        // 调用AI服务器（传入作者信息）
        const data = await callAIServer(msg.text, boss);
        
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

// 消息处理 - 统一的AI驱动模式
bot.on('message', async (msg) => {
    console.log(`📨 收到消息: ${msg.text} | 来自: ${msg.from.username || msg.from.first_name}`);
    
    const chatId = msg.chat.id;
    const text = msg.text?.trim();
    const fromId = msg.from.id;
    const fromUsername = msg.from.username || msg.from.first_name || '未知用户';
    
    // 忽略机器人自己的消息
    if (msg.from.username === BOT_USERNAME.replace('@', '')) {
        console.log('  忽略: 机器人自己的消息');
        return;
    }
    
    if (!text) {
        console.log('  忽略: 空消息');
        return;
    }
    
    // 检查是否是确认消息
    if (text === '确定' || text.toLowerCase() === 'ok' || text === '确认') {
        // 查找最近的待确认任务
        const replyTo = msg.reply_to_message?.message_id;
        let taskToConfirm = null;
        
        if (replyTo && pendingTasks.has(replyTo)) {
            // 如果是回复特定消息
            taskToConfirm = pendingTasks.get(replyTo);
        } else {
            // 查找最近2分钟内的待确认任务
            const now = Date.now();
            for (const [msgId, task] of pendingTasks) {
                if (task.chatId === chatId && (now - task.timestamp) < 2 * 60 * 1000) {
                    taskToConfirm = task;
                    pendingTasks.delete(msgId);
                    break;
                }
            }
        }
        
        if (taskToConfirm) {
            // 保存到Notion
            try {
                await createProjectWithTasks({
                    projectTitle: taskToConfirm.projectTitle,
                    bossName: taskToConfirm.bossName,
                    tasks: taskToConfirm.tasks,
                    sourceText: taskToConfirm.sourceText
                });
                
                await bot.sendMessage(chatId, 
                    `✅ 任务已确认并保存到Notion！\n` +
                    `项目：${taskToConfirm.projectTitle}\n` +
                    `任务数：${taskToConfirm.tasks.length}`
                );
                
                if (replyTo) pendingTasks.delete(replyTo);
            } catch (error) {
                console.error('保存任务失败:', error);
                await bot.sendMessage(chatId, '❌ 保存任务失败，请重试');
            }
            return;
        }
    }
    
    // 处理命令
    if (text.startsWith('/')) {
        await handleCommand(msg);
        return;
    }
    
    // 调用AI服务器判别意图
    try {
        const ai = await callAIServer(text, fromUsername);
        
        // 1) 先发送AI的自然语言回复（像Claude聊天）
        if (ai.assistant_reply) {
            await bot.sendMessage(chatId, ai.assistant_reply, { 
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });
            
            // 如果启用语音回复，同时发送语音版本
            if (process.env.ENABLE_VOICE_REPLY === 'true') {
                try {
                    const voicePath = await textToSpeechLocal(ai.assistant_reply);
                    if (voicePath) {
                        await bot.sendVoice(chatId, voicePath);
                        // 清理临时文件
                        const fs = require('fs');
                        fs.unlinkSync(voicePath);
                    }
                } catch (error) {
                    console.log('语音生成失败，仅发送文字:', error.message);
                }
            }
        }
        
        // 2) 根据intent决定是否执行Notion操作
        switch (ai.intent) {
            case 'task_new': {
                // 预览任务，等待确认
                const tasks = (ai.tasks || []).map(t => ({
                    ...t,
                    assigneeRole: pickAssignee(`${t.title} ${t.details || ''}`)
                }));
                
                // 构建预览消息
                const lines = [`\n📋 **${ai.project_title || '新项目'}** 任务预览：`];
                tasks.forEach((t, i) => {
                    const mention = mentionFor(t.assigneeRole);
                    const due = t.due_hint ? `（${t.due_hint}）` : '';
                    lines.push(`${i + 1}. ${t.title} → ${mention} ${due}`);
                });
                lines.push('');
                lines.push('⚠️ **请回复「确定」来保存任务，或等待2分钟自动取消**');
                
                // 发送预览消息
                const previewMsg = await bot.sendMessage(chatId, lines.join('\n'), { 
                    parse_mode: 'Markdown' 
                });
                
                // 存储待确认任务
                pendingTasks.set(previewMsg.message_id, {
                    tasks,
                    projectTitle: ai.project_title || text.slice(0, 40),
                    bossName: fromUsername,
                    sourceText: text,
                    timestamp: Date.now(),
                    chatId
                });
                
                // 2分钟后自动清理
                setTimeout(() => {
                    if (pendingTasks.has(previewMsg.message_id)) {
                        pendingTasks.delete(previewMsg.message_id);
                        bot.sendMessage(chatId, '⏰ 任务预览已过期，未保存到Notion', {
                            reply_to_message_id: previewMsg.message_id
                        });
                    }
                }, 2 * 60 * 1000);
                
                break;
            }
            
            case 'task_done': {
                // 标记任务完成
                if (ai.status_update?.task_hint) {
                    // 先检查是否是定时任务
                    const recurringTask = await markRecurringTaskComplete(ai.status_update.task_hint);
                    if (recurringTask) {
                        await bot.sendMessage(chatId, 
                            `✅ 定时任务"${recurringTask.title}"本周已完成！\n` +
                            `下次提醒时间：${recurringTask.frequency === 'daily' ? '明天' : '下周'}同一时间`
                        );
                    } else {
                        // 普通任务
                        const success = await updateTaskStatus(
                            ai.status_update.task_hint, 
                            '完成', 
                            fromUsername
                        );
                        if (!success) {
                            await bot.sendMessage(chatId, 
                                '⚠️ 未找到匹配的任务，请确认任务名称'
                            );
                        }
                    }
                }
                break;
            }
            
            case 'task_blocked': {
                // 记录阻碍
                if (ai.obstacle) {
                    const need = ai.obstacle.need || ai.obstacle.desc || '';
                    const helpRole = pickAssignee(need);
                    const helpMention = mentionFor(helpRole);
                    
                    await createObstacle({
                        taskName: ai.obstacle.desc || text.slice(0, 30),
                        description: ai.obstacle.desc || text,
                        username: fromUsername
                    });
                    
                    // 尝试更新相关任务状态
                    if (ai.obstacle.desc) {
                        await updateTaskStatus(
                            ai.obstacle.desc,
                            '需协助',
                            fromUsername
                        );
                    }
                    
                    await bot.sendMessage(chatId, 
                        `⚠️ 阻碍已记录，需要 ${helpMention} 协助处理`,
                        { parse_mode: 'Markdown' }
                    );
                }
                break;
            }
            
            case 'task_query': {
                // 生成进度报告
                try {
                    const report = await generateProgressReport();
                    await bot.sendMessage(chatId,
                        `📊 项目进度报告（不含测试数据）\n\n` +
                        `项目：${report.projects.active}个进行中，${report.projects.completed}个已完成\n` +
                        `任务：${report.tasks.pending}个待完成，${report.tasks.needHelp}个需协助\n` +
                        `阻碍：${report.obstacles.open}个待解决`
                    );
                } catch (error) {
                    await bot.sendMessage(chatId, '❌ 生成报告失败');
                }
                break;
            }
            
            case 'list_tasks': {
                // 列出所有待办任务
                try {
                    const tasks = await listPendingTasks();
                    if (tasks.length === 0) {
                        await bot.sendMessage(chatId, '✅ 太棒了！当前没有待办任务');
                    } else {
                        let message = '📝 待办任务列表：\n\n';
                        
                        // 按优先级分组
                        const overdueTasks = tasks.filter(t => t.isOverdue);
                        const highTasks = tasks.filter(t => !t.isOverdue && t.priority === '高');
                        const mediumTasks = tasks.filter(t => !t.isOverdue && t.priority === '中');
                        const lowTasks = tasks.filter(t => !t.isOverdue && t.priority === '低');
                        
                        if (overdueTasks.length > 0) {
                            message += '🔴 过期任务：\n';
                            overdueTasks.forEach(t => {
                                message += `• ${t.title}`;
                                if (t.assignee) message += ` (${t.assignee})`;
                                if (t.dueDate) message += ` - ${t.dueDate}`;
                                message += '\n';
                            });
                            message += '\n';
                        }
                        
                        if (highTasks.length > 0) {
                            message += '🟠 高优先级任务：\n';
                            highTasks.forEach(t => {
                                message += `• ${t.title}`;
                                if (t.assignee) message += ` (${t.assignee})`;
                                if (t.dueDate) message += ` - ${t.dueDate}`;
                                message += '\n';
                            });
                            message += '\n';
                        }
                        
                        if (mediumTasks.length > 0) {
                            message += '🟡 中优先级任务：\n';
                            mediumTasks.forEach(t => {
                                message += `• ${t.title}`;
                                if (t.assignee) message += ` (${t.assignee})`;
                                if (t.dueDate) message += ` - ${t.dueDate}`;
                                message += '\n';
                            });
                            message += '\n';
                        }
                        
                        if (lowTasks.length > 0) {
                            message += '🔵 低优先级任务：\n';
                            lowTasks.forEach(t => {
                                message += `• ${t.title}`;
                                if (t.assignee) message += ` (${t.assignee})`;
                                if (t.dueDate) message += ` - ${t.dueDate}`;
                                message += '\n';
                            });
                        }
                        
                        message += `\n总计：${tasks.length} 个待办任务`;
                        await bot.sendMessage(chatId, message);
                    }
                } catch (error) {
                    console.error('列出任务失败:', error);
                    await bot.sendMessage(chatId, '❌ 获取任务列表失败，请稍后重试');
                }
                break;
            }
            
            case 'list_projects': {
                // 列出所有项目
                try {
                    const projects = await listAllProjects();
                    if (projects.length === 0) {
                        await bot.sendMessage(chatId, '📋 当前没有进行中的项目');
                    } else {
                        let message = '📋 所有项目列表（不含测试数据）：\n\n';
                        
                        // 按状态分组
                        const activeProjects = projects.filter(p => 
                            p.status !== '完成' && p.status !== 'Done' && p.status !== 'Complete'
                        );
                        const completedProjects = projects.filter(p => 
                            p.status === '完成' || p.status === 'Done' || p.status === 'Complete'
                        );
                        
                        if (activeProjects.length > 0) {
                            message += '🔵 进行中的项目：\n';
                            activeProjects.forEach((p, i) => {
                                message += `${i+1}. ${p.title} [${p.status}] (${p.source})\n`;
                            });
                        }
                        
                        if (completedProjects.length > 0) {
                            message += '\n✅ 已完成的项目：\n';
                            completedProjects.forEach((p, i) => {
                                message += `${i+1}. ${p.title} (${p.createdDate})\n`;
                            });
                        }
                        
                        await bot.sendMessage(chatId, message);
                    }
                } catch (error) {
                    console.error('列出项目失败:', error);
                    await bot.sendMessage(chatId, '❌ 获取项目列表失败');
                }
                break;
            }
            
            case 'recurring_task': {
                // 创建定时任务
                if (ai.recurring) {
                    const recurringTask = {
                        title: ai.recurring.title,
                        description: text,
                        frequency: ai.recurring.frequency || 'weekly',
                        dayOfWeek: ai.recurring.day_of_week,
                        timeOfDay: ai.recurring.time || '09:00',
                        assignee: fromUsername,
                        createdBy: fromUsername,
                        groupId: chatId
                    };
                    
                    const task = await addRecurringTask(recurringTask);
                    
                    let frequencyText = '';
                    if (task.frequency === 'daily') {
                        frequencyText = '每天';
                    } else if (task.frequency === 'weekly') {
                        const days = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
                        frequencyText = `每${days[task.dayOfWeek || 1]}`;
                    } else if (task.frequency === 'monthly') {
                        frequencyText = '每月';
                    }
                    
                    await bot.sendMessage(chatId,
                        `⏰ 定时任务已创建！\n\n` +
                        `📋 任务：${task.title}\n` +
                        `🔄 频率：${frequencyText} ${task.timeOfDay}\n` +
                        `👤 负责人：${task.assignee}\n\n` +
                        `提醒：任务会定时提醒，直到回复"${task.title} 完成"为止`
                    );
                }
                break;
            }
            
            case 'chat':
            default:
                // 纯聊天，已在assistant_reply中回复
                break;
        }
    } catch (error) {
        console.error('处理消息失败:', error);
        await bot.sendMessage(chatId, '抱歉，处理您的消息时遇到问题，请稍后重试。');
    }
});

// 处理语音消息
bot.on('voice', async (msg) => {
    const chatId = msg.chat.id;
    const fromUsername = msg.from.username || msg.from.first_name || '未知用户';
    
    console.log(`🎤 收到来自 ${fromUsername} 的语音消息`);
    
    try {
        // 发送处理中提示
        const processingMsg = await bot.sendMessage(chatId, '🎤 正在识别语音内容...');
        
        // 只使用本地语音识别（完全免费）
        let result;
        try {
            result = await processVoiceMessageLocal(bot, msg.voice.file_id);
        } catch (localError) {
            console.error('语音识别失败:', localError);
            await bot.sendMessage(chatId, 
                '❌ 语音识别失败\n' +
                '请确保：\n' +
                '• 语音清晰\n' +
                '• 使用中文\n' +
                '或直接发送文字消息'
            );
            return;
        }
        
        // 删除处理中提示
        await bot.deleteMessage(chatId, processingMsg.message_id);
        
        if (result.text) {
            // 显示识别结果
            await bot.sendMessage(chatId, 
                `📝 语音识别结果：\n"${result.text}"\n\n正在处理...`
            );
            
            // 将识别的文字作为普通消息处理
            const fakeTextMsg = {
                ...msg,
                text: result.text
            };
            
            // 调用AI处理
            const ai = await callAIServer(result.text, fromUsername);
            
            // 发送AI回复
            if (ai.assistant_reply) {
                // 文字回复
                await bot.sendMessage(chatId, ai.assistant_reply, { 
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true
                });
                
                // 如果需要，也生成语音回复（使用免费的gTTS）
                if (process.env.ENABLE_VOICE_REPLY === 'true') {
                    // 只使用本地TTS（完全免费）
                    try {
                        const voicePath = await textToSpeechLocal(ai.assistant_reply);
                        if (voicePath) {
                            await bot.sendVoice(chatId, voicePath);
                            // 清理临时文件
                            fs.unlinkSync(voicePath);
                        }
                    } catch (error) {
                        console.log('语音生成失败，仅发送文字:', error.message);
                    }
                }
            }
            
            // 根据意图执行相应操作（复用文字消息的处理逻辑）
            msg.text = result.text;
            // 触发文字消息处理
            bot.emit('text', msg);
        } else {
            await bot.sendMessage(chatId, '❌ 无法识别语音内容，请重试或发送文字消息');
        }
    } catch (error) {
        console.error('处理语音消息失败:', error);
        await bot.sendMessage(chatId, 
            '❌ 语音处理失败\n' +
            '可能原因：\n' +
            '• 语音不清晰\n' +
            '• 未配置OpenAI API密钥\n' +
            '请尝试发送文字消息'
        );
    }
});

// 处理音频消息（某些客户端发送音频而非语音）
bot.on('audio', async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, 
        '⚠️ 请使用语音消息功能（按住麦克风录音）\n' +
        '音频文件暂不支持自动识别'
    );
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
                `AI服务器: ${AI_SERVER_URL}`
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
            
        case '/aitest':
            // 测试AI服务器
            const aiOk = await checkAIServer();
            await bot.sendMessage(chatId, 
                aiOk ? '✅ AI服务器运行正常' : '❌ AI服务器未启动\n请运行: node ai-server.js'
            );
            break;
            
        case '/recurring':
            // 查看定时任务
            const recurringTasks = getAllRecurringTasks();
            if (recurringTasks.length === 0) {
                await bot.sendMessage(chatId, '📅 当前没有定时任务');
            } else {
                let message = '📅 定时任务列表：\n\n';
                recurringTasks.forEach((task, i) => {
                    let freq = task.frequency === 'daily' ? '每天' : 
                              task.frequency === 'weekly' ? `每周${task.dayOfWeek || ''}` : 
                              '每月';
                    message += `${i+1}. ${task.title}\n`;
                    message += `   🔄 ${freq} ${task.timeOfDay}\n`;
                    message += `   👤 ${task.assignee}\n`;
                    message += `   ${task.completedThisWeek ? '✅ 本周已完成' : '⏳ 待完成'}\n\n`;
                });
                await bot.sendMessage(chatId, message);
            }
            break;
            
        case '/help':
            await bot.sendMessage(chatId,
                `📋 使用说明\n\n` +
                `常用功能:\n` +
                `• 创建任务: 直接描述任务\n` +
                `• 完成任务: 说"XX完成了"\n` +
                `• 查看任务: "有什么任务"\n` +
                `• 定时任务: "每周五提交周报"\n\n` +
                `命令:\n` +
                `/status - 查看进度\n` +
                `/recurring - 查看定时任务\n` +
                `/aitest - 测试AI服务器\n` +
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

// 启动时检查AI服务器
checkAIServer();

// 检查本地语音服务
checkDependencies().then(deps => {
    if (deps.whisper || deps.edgeTTS) {
        console.log('🎤 语音服务状态:');
        console.log(`   语音识别: ${deps.whisper ? '✅ Whisper本地模型' : '❌ 需要安装whisper-cpp'}`);
        console.log(`   语音合成: ${deps.edgeTTS ? '✅ Edge-TTS（甜美女声）' : '❌ 需要安装edge-tts'}`);
    }
});

// 初始化定时任务系统
initializeRecurringTasks(async (task) => {
    // 定时任务提醒回调
    const message = `⏰ 定时任务提醒！\n\n` +
                   `📋 ${task.title}\n` +
                   `👤 @${task.assignee}\n\n` +
                   `请完成任务后回复："${task.title} 完成"`;
    
    try {
        await bot.sendMessage(task.groupId, message);
    } catch (error) {
        console.error('发送定时提醒失败:', error);
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