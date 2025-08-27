// bot-simple.js
// 简化版 - 不依赖Claude CLI，直接使用规则拆解任务

const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const { pickAssignee, mentionFor } = require('./role-router.js');
const { createProjectWithTasks, updateTaskStatus, createObstacle, generateProgressReport } = require('./notion-service.js');
require('dotenv').config();

// 配置
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const BOT_USERNAME = '@lapureleonardchow_bot';
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID || 'YOUR_GROUP_ID_HERE';
const BOSS_ID = parseInt(process.env.BOSS_ID) || YOUR_BOSS_ID;

// 初始化机器人
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

console.log('🤖 简化版项目管理机器人已启动');
console.log(`📱 Bot用户名: ${BOT_USERNAME}`);
console.log(`💬 群组ID: ${TELEGRAM_GROUP_ID}`);
console.log(`👔 老板ID: ${BOSS_ID}`);

// 简单的任务拆解逻辑（不依赖Claude）
function breakdownTask(taskText) {
    const tasks = [];
    const lowerText = taskText.toLowerCase();
    
    // 根据关键词智能拆解
    if (lowerText.includes('设计') || lowerText.includes('海报') || lowerText.includes('logo')) {
        tasks.push(
            { title: '收集设计需求和参考资料', details: '确定设计风格和要求' },
            { title: '制作初稿设计', details: '完成第一版设计稿' },
            { title: '修改和完善', details: '根据反馈调整设计' },
            { title: '交付最终文件', details: '提供所有格式的设计文件' }
        );
    } else if (lowerText.includes('付款') || lowerText.includes('支付') || lowerText.includes('invoice')) {
        tasks.push(
            { title: '核对付款信息', details: '确认金额和收款方' },
            { title: '准备付款凭证', details: '整理发票和相关文件' },
            { title: '执行付款', details: '完成转账操作' },
            { title: '记录和归档', details: '保存付款记录' }
        );
    } else if (lowerText.includes('直播') || lowerText.includes('带货')) {
        tasks.push(
            { title: '准备直播脚本', details: '编写直播流程和话术' },
            { title: '设置直播间', details: '调试设备和背景' },
            { title: '执行直播', details: '按计划进行直播' },
            { title: '数据分析', details: '统计直播效果和销售数据' }
        );
    } else if (lowerText.includes('wifi') || lowerText.includes('宽带') || lowerText.includes('网络')) {
        tasks.push(
            { title: '联系网络供应商', details: '比较不同套餐和价格' },
            { title: '预约安装时间', details: '确定安装日期' },
            { title: '现场安装调试', details: '配合技术人员完成安装' },
            { title: '测试网络连接', details: '确保所有设备正常连接' }
        );
    } else if (lowerText.includes('装修') || lowerText.includes('renovation')) {
        tasks.push(
            { title: '制定装修方案', details: '确定装修风格和预算' },
            { title: '选择装修材料', details: '采购所需材料' },
            { title: '施工执行', details: '监督装修进度' },
            { title: '验收和整改', details: '检查装修质量' }
        );
    } else {
        // 默认拆解
        tasks.push(
            { title: '需求分析', details: '明确具体要求和目标' },
            { title: '制定计划', details: '规划执行步骤和时间' },
            { title: '执行任务', details: '按计划完成主要工作' },
            { title: '检查和交付', details: '确认完成质量并提交' }
        );
    }
    
    // 为每个任务分配负责人和时间
    return tasks.map(t => ({
        ...t,
        assigneeRole: pickAssignee(`${t.title} ${t.details}`),
        due_hint: '3天'
    }));
}

// 老板发布新项目
async function onBossNewProject(msg) {
    const boss = msg.from.username || `user_${msg.from.id}`;
    const chatId = msg.chat.id;
    const projectTitle = msg.text.substring(0, 50);
    
    try {
        await bot.sendMessage(chatId, '📝 正在创建任务...');
        
        // 使用简单逻辑拆解任务
        const tasks = breakdownTask(msg.text);
        
        // 创建项目和任务到Notion
        await createProjectWithTasks({
            projectTitle: projectTitle,
            bossName: boss,
            tasks: tasks,
            sourceText: msg.text
        });
        
        // 生成群组消息
        const lines = [`📋 **${projectTitle}** 已创建\n发起人: @${boss}\n`];
        tasks.forEach((t, i) => {
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
        // 其他消息
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
                `🤖 简化版项目管理机器人\n\n` +
                `功能:\n` +
                `• 老板发布任务 → 智能拆解并分配\n` +
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
    bot.stopPolling();
    process.exit(0);
});

console.log('✅ 系统初始化完成，等待消息...');