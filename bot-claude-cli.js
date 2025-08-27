#!/usr/bin/env node
// bot-claude-cli.js
// 纯 CLI 模式 - 使用 Claude CLI + MCP Notion 集成

const TelegramBot = require('node-telegram-bot-api');
const { spawn, spawnSync } = require('child_process');
const axios = require('axios');
const cron = require('node-cron');
require('dotenv').config();

// ========== 启动前健康检查 ==========
function assertClaudeReady() {
  console.log('🔍 检查 Claude CLI 环境...');
  
  // 检查 Claude CLI 是否可用
  const v = spawnSync('claude', ['--version'], { encoding: 'utf8' });
  if (v.status !== 0) {
    throw new Error('❌ Claude CLI 不可用，请检查安装/路径');
  }
  console.log('✓ Claude CLI 已安装');
  
  // 检查 MCP Notion 是否配置
  const m = spawnSync('claude', ['mcp', 'list'], { encoding: 'utf8' });
  if (m.status !== 0 || !/notion/i.test(m.stdout)) {
    throw new Error('❌ MCP Notion 未就绪：请 claude mcp add 并配置 NOTION_API_TOKEN');
  }
  
  // 检查连接状态
  if (/✓ Connected/i.test(m.stdout)) {
    console.log('✓ MCP Notion 已连接');
  } else {
    console.warn('⚠️ MCP Notion 未连接，可能需要检查 API Token');
  }
  
  console.log('✅ Claude CLI & MCP Notion Ready\n');
}

// 执行健康检查
assertClaudeReady();

// ========== 配置 ==========
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7809164403:AAFSNjGqrOUSXlQS_0xolVWFkirNud2ojaE';
const BOT_USERNAME = '@lapureleonardchow_bot';
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID || '-1002985202794';
const BOSS_ID = parseInt(process.env.BOSS_ID) || 7624953278;

// Notion Database IDs (用于备用查询)
const NOTION_PROJECT_DB_ID = process.env.NOTION_PROJECT_DB_ID || '259efdcd-10f5-8157-b1d0-d2d9a6253aa1';
const NOTION_TASK_DB_ID = process.env.NOTION_TASK_DB_ID || '259efdcd-10f5-812d-a0d8-df24497b18fd';
const NOTION_OBSTACLE_DB_ID = process.env.NOTION_OBSTACLE_DB_ID || '259efdcd-10f5-8100-9949-d0d795379089';

// ========== 初始化 Telegram Bot ==========
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

console.log('🤖 Claude CLI 项目管理机器人已启动');
console.log(`📱 Bot用户名: ${BOT_USERNAME}`);
console.log(`💬 群组ID: ${TELEGRAM_GROUP_ID}`);
console.log(`👔 老板ID: ${BOSS_ID}`);

// ========== Claude CLI 进程管理 ==========
class ClaudeCLI {
    constructor() {
        this.process = null;
        this.outputBuffer = '';
        this.isProcessing = false;
        this.currentResolver = null;
        this.restartAttempts = 0;
        this.maxRestarts = 3;
    }

    start() {
        if (this.process) {
            console.log('⚠️ Claude 进程已存在');
            return;
        }

        try {
            // 启动 Claude CLI 进程
            this.process = spawn('claude', [], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env }
            });

            this.process.stdout.on('data', (data) => {
                const text = data.toString();
                this.outputBuffer += text;
                
                // 检测输出完成（Claude 输出后通常有提示符）
                if (text.includes('\n\n') || text.includes('Human:') || this.outputBuffer.length > 1000) {
                    this.handleOutput();
                }
            });

            this.process.stderr.on('data', (data) => {
                console.error('Claude 错误:', data.toString());
            });

            this.process.on('error', (error) => {
                console.error('Claude 进程错误:', error);
                this.handleError();
            });

            this.process.on('close', (code) => {
                console.log(`Claude 进程退出，代码: ${code}`);
                this.process = null;
                this.isProcessing = false;
                
                if (code !== 0 && this.restartAttempts < this.maxRestarts) {
                    this.restart();
                }
            });

            console.log('✅ Claude CLI 进程已启动');
            this.restartAttempts = 0;
        } catch (error) {
            console.error('启动 Claude CLI 失败:', error);
            throw error;
        }
    }

    stop() {
        if (this.process) {
            this.process.kill();
            this.process = null;
            console.log('Claude CLI 进程已停止');
        }
    }

    restart() {
        this.restartAttempts++;
        console.log(`尝试重启 Claude CLI (${this.restartAttempts}/${this.maxRestarts})...`);
        this.stop();
        setTimeout(() => this.start(), 3000);
    }

    handleOutput() {
        const output = this.outputBuffer.trim();
        this.outputBuffer = '';
        this.isProcessing = false;
        
        if (this.currentResolver) {
            this.currentResolver(output);
            this.currentResolver = null;
        }
    }

    handleError() {
        this.isProcessing = false;
        if (this.currentResolver) {
            this.currentResolver(null);
            this.currentResolver = null;
        }
    }

    async send(prompt) {
        if (!this.process) {
            this.start();
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (this.isProcessing) {
            console.log('⏳ Claude 正忙，等待中...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        return new Promise((resolve) => {
            this.isProcessing = true;
            this.currentResolver = resolve;
            this.outputBuffer = '';
            
            try {
                this.process.stdin.write(prompt + '\n');
            } catch (error) {
                console.error('发送到 Claude 失败:', error);
                this.handleError();
            }
        });
    }
}

const claudeCLI = new ClaudeCLI();
claudeCLI.start();

// ========== 消息队列管理 ==========
class MessageQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
    }

    add(message) {
        this.queue.push(message);
        console.log(`📥 消息入队 [队列长度: ${this.queue.length}]`);
        this.processNext();
    }

    async processNext() {
        if (this.processing || this.queue.length === 0) {
            return;
        }

        this.processing = true;
        const message = this.queue.shift();
        
        try {
            await this.handleMessage(message);
        } catch (error) {
            console.error('处理消息失败:', error);
        } finally {
            this.processing = false;
            // 延迟后处理下一条
            setTimeout(() => this.processNext(), 1000);
        }
    }

    async handleMessage(message) {
        const { chatId, text, fromId, fromUsername } = message;
        const role = fromId === BOSS_ID ? '老板' : '员工';
        
        console.log(`🔄 处理消息 [${role}] @${fromUsername}: ${text.substring(0, 50)}...`);
        
        // 构建严格的工作流提示词
        const prompt = this.buildWorkflowPrompt(role, fromUsername, text);
        
        // 发送给 Claude CLI
        const response = await claudeCLI.send(prompt);
        
        if (response) {
            await this.sendToTelegram(chatId, response);
        } else {
            await this.sendFallback(chatId, role, text);
        }
    }

    buildWorkflowPrompt(role, username, text) {
        // 系统级约束
        const systemConstraints = `
[系统约束]
- 你是项目管理助手，只能操作 Notion 中的项目表、任务表、阻碍表
- 状态只有3种：未完成/完成/需协助
- 所有数据操作必须通过 MCP Notion 工具完成
- 输出只能是发送到 Telegram 群组的 Markdown 格式文本
- 不要解释过程，只输出最终的群组消息`;

        let taskPrompt = '';
        
        if (role === '老板') {
            // 老板：任务拆解流程
            taskPrompt = `
[任务]
老板发布了新目标："${text}"

[执行步骤]
1. 使用 MCP Notion 在"项目表"创建新项目，项目名称为任务主题
2. 将任务拆解为3-5个可执行的子任务
3. 在"任务表"为每个子任务创建条目，分配给团队成员
4. 设置合理的截止日期（建议3-7天内）

[输出要求]
生成一条 Telegram 群组消息：
- 列出拆解的任务清单
- @提及每个负责人
- 标注截止日期
- 确认已更新到 Notion

示例格式：
📋 新项目：[项目名]
任务分配：
1. [任务1] - @负责人1 (截止：MM/DD)
2. [任务2] - @负责人2 (截止：MM/DD)
✅ 已同步到 Notion`;

        } else if (text.match(/完成|done|finished|completed/i)) {
            // 员工：任务完成流程
            taskPrompt = `
[任务]
员工 @${username} 报告任务完成："${text}"

[执行步骤]
1. 使用 MCP Notion 在"任务表"中查找该员工的未完成任务
2. 将匹配的任务状态更新为"完成"
3. 检查项目下所有任务，如全部完成则更新项目状态

[输出要求]
生成一条确认消息：
✅ @${username} 完成了 [任务名]
[如果项目完成] 🎉 项目 [项目名] 已全部完成！`;

        } else if (text.match(/问题|阻碍|困难|help|issue|problem|block/i)) {
            // 员工：遇到阻碍流程
            taskPrompt = `
[任务]
员工 @${username} 遇到阻碍："${text}"

[执行步骤]
1. 使用 MCP Notion 在"阻碍表"创建新记录，描述问题
2. 在"任务表"中找到相关任务，状态改为"需协助"
3. 记录负责人为 @${username}

[输出要求]
生成一条求助消息：
⚠️ @${username} 遇到阻碍：[问题描述]
相关任务：[任务名] 已标记为"需协助"
@${BOSS_ID === fromId ? '团队' : '老板'} 请协助解决`;

        } else {
            // 其他消息：简单回复
            taskPrompt = `
[任务]
回复员工 @${username} 的消息："${text}"

[输出要求]
简短专业地回复，引导使用正确的关键词：
- 任务完成请说"完成"或"done"
- 遇到问题请说"问题"或"需要帮助"`;
        }

        return systemConstraints + taskPrompt;
    }

    async sendToTelegram(chatId, message) {
        try {
            // 清理 Claude 的输出
            const cleanMessage = message
                .replace(/^(Human|Assistant):\s*/gm, '')
                .replace(/\[系统约束\][\s\S]*?\[任务\]/g, '')
                .trim();

            if (cleanMessage) {
                await bot.sendMessage(chatId, cleanMessage, {
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true
                });
                console.log('✅ 消息已发送到群组');
            }
        } catch (error) {
            console.error('发送 Telegram 消息失败:', error);
            // 降级为纯文本
            try {
                await bot.sendMessage(chatId, message);
            } catch (e) {
                console.error('纯文本发送也失败:', e);
            }
        }
    }

    async sendFallback(chatId, role, text) {
        let fallback = '';
        
        if (role === '老板') {
            fallback = `📋 收到任务："${text}"\n(Claude CLI 暂时不可用，请手动在 Notion 创建)`;
        } else if (text.match(/完成|done/i)) {
            fallback = `✅ 收到完成通知！请在 Notion 中手动更新状态。`;
        } else if (text.match(/问题|阻碍/i)) {
            fallback = `⚠️ 已记录问题。请在 Notion 中手动添加到阻碍表。`;
        } else {
            fallback = `收到消息。请使用关键词：完成/done 或 问题/阻碍`;
        }
        
        await bot.sendMessage(chatId, fallback);
    }
}

const messageQueue = new MessageQueue();

// ========== Telegram 消息处理 ==========
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();
    const fromId = msg.from.id;
    const fromUsername = msg.from.username || msg.from.first_name || '未知用户';
    
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
    
    // 加入消息队列
    messageQueue.add({ chatId, text, fromId, fromUsername });
});

// ========== 命令处理 ==========
async function handleCommand(msg) {
    const chatId = msg.chat.id;
    const command = msg.text.split(' ')[0];
    
    switch (command) {
        case '/start':
            await bot.sendMessage(chatId, 
                `🤖 Claude CLI 项目管理机器人\n\n` +
                `工作模式：\n` +
                `• 老板发布任务 → AI拆解分配\n` +
                `• 员工说"完成" → 自动更新状态\n` +
                `• 遇到"问题" → 记录并求助\n\n` +
                `所有数据通过 MCP 同步到 Notion`
            );
            break;
            
        case '/status':
            const queueLength = messageQueue.queue.length;
            const claudeStatus = claudeCLI.process ? '✅ 运行中' : '❌ 未运行';
            await bot.sendMessage(chatId,
                `📊 系统状态\n\n` +
                `Claude CLI: ${claudeStatus}\n` +
                `消息队列: ${queueLength} 条待处理\n` +
                `MCP Notion: ✅ 已配置\n` +
                `数据库ID:\n` +
                `• 项目: ${NOTION_PROJECT_DB_ID.substring(0, 8)}...\n` +
                `• 任务: ${NOTION_TASK_DB_ID.substring(0, 8)}...\n` +
                `• 阻碍: ${NOTION_OBSTACLE_DB_ID.substring(0, 8)}...`
            );
            break;
            
        case '/restart':
            if (msg.from.id === BOSS_ID) {
                claudeCLI.restart();
                await bot.sendMessage(chatId, '🔄 正在重启 Claude CLI...');
            } else {
                await bot.sendMessage(chatId, '❌ 仅管理员可执行');
            }
            break;
            
        case '/help':
            await bot.sendMessage(chatId,
                `📋 使用说明\n\n` +
                `直接发送消息即可：\n` +
                `• 老板：发布项目目标\n` +
                `• 员工：说"完成"汇报进度\n` +
                `• 员工：说"问题"请求帮助\n\n` +
                `命令：\n` +
                `/status - 查看状态\n` +
                `/restart - 重启 Claude (仅管理员)\n` +
                `/help - 显示帮助`
            );
            break;
            
        default:
            await bot.sendMessage(chatId, '❓ 未知命令，使用 /help 查看帮助');
    }
}

// ========== 定时任务 ==========
// 每天 9:00, 13:00, 18:00 发送进度报告
cron.schedule('0 9,13,18 * * *', async () => {
    console.log('⏰ 执行定时报告...');
    
    const reportPrompt = `
[任务]
生成项目进度报告

[执行步骤]
1. 使用 MCP Notion 查询所有项目和任务
2. 统计完成情况
3. 列出未解决的阻碍

[输出要求]
生成简洁的进度报告：
📊 项目进度报告 [日期]
• 项目: X个进行中，Y个已完成
• 任务: X个待完成，Y个需协助
• 阻碍: X个待解决
[列出需要关注的具体事项]`;

    const response = await claudeCLI.send(reportPrompt);
    if (response) {
        await messageQueue.sendToTelegram(TELEGRAM_GROUP_ID, response);
    }
});

// ========== 错误处理 ==========
bot.on('polling_error', (error) => {
    console.error('Telegram 轮询错误:', error);
});

process.on('uncaughtException', (error) => {
    console.error('未捕获异常:', error);
    claudeCLI.stop();
    setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason) => {
    console.error('未处理的 Promise 拒绝:', reason);
});

// ========== 优雅关闭 ==========
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function shutdown() {
    console.log('\n👋 正在关闭...');
    claudeCLI.stop();
    await bot.stopPolling();
    process.exit(0);
}

console.log('✅ 系统初始化完成，等待消息...');