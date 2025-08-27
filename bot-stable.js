// bot-stable.js
// 增强版机器人，包含完整的错误处理和日志记录

const TelegramBot = require('node-telegram-bot-api');
const { spawn } = require('child_process');
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 日志系统
class Logger {
    constructor(logDir = './logs') {
        this.logDir = logDir;
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data
        };

        // 控制台输出
        const consoleMsg = `[${timestamp}] [${level}] ${message}`;
        if (level === 'ERROR') {
            console.error(consoleMsg, data || '');
        } else {
            console.log(consoleMsg, data || '');
        }

        // 写入文件
        const filename = `${this.logDir}/${new Date().toISOString().split('T')[0]}.log`;
        fs.appendFileSync(filename, JSON.stringify(logEntry) + '\n');
    }

    info(message, data) {
        this.log('INFO', message, data);
    }

    error(message, data) {
        this.log('ERROR', message, data);
    }

    warn(message, data) {
        this.log('WARN', message, data);
    }

    debug(message, data) {
        if (process.env.DEBUG === 'true') {
            this.log('DEBUG', message, data);
        }
    }
}

const logger = new Logger();

// 配置
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const BOT_USERNAME = '@lapureleonardchow_bot';
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID || '-4976924235';
const BOSS_ID = parseInt(process.env.BOSS_ID) || YOUR_BOSS_ID;

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

// 初始化机器人
let bot;
try {
    bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
    logger.info('机器人初始化成功', { username: BOT_USERNAME });
} catch (error) {
    logger.error('机器人初始化失败', error);
    process.exit(1);
}

// Claude进程管理
class ClaudeManager {
    constructor() {
        this.process = null;
        this.outputBuffer = '';
        this.isProcessing = false;
        this.restartAttempts = 0;
        this.maxRestarts = 5;
    }

    start() {
        try {
            if (this.process) {
                logger.warn('Claude进程已存在，先停止旧进程');
                this.stop();
            }

            this.process = spawn('claude', [], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env, CLAUDE_NO_COLOR: '1' }
            });

            this.process.stdout.on('data', (data) => {
                this.outputBuffer += data.toString();
                this.checkOutputComplete();
            });

            this.process.stderr.on('data', (data) => {
                logger.error('Claude错误输出', data.toString());
            });

            this.process.on('error', (error) => {
                logger.error('Claude进程错误', error);
                this.handleProcessError();
            });

            this.process.on('close', (code) => {
                logger.info('Claude进程退出', { code });
                this.process = null;
                this.isProcessing = false;
                
                if (code !== 0 && this.restartAttempts < this.maxRestarts) {
                    this.restart();
                }
            });

            logger.info('Claude进程启动成功');
            this.restartAttempts = 0;
            return true;
        } catch (error) {
            logger.error('启动Claude失败', error);
            return false;
        }
    }

    stop() {
        if (this.process) {
            this.process.kill();
            this.process = null;
        }
    }

    restart() {
        this.restartAttempts++;
        logger.warn('尝试重启Claude', { attempt: this.restartAttempts });
        setTimeout(() => this.start(), 5000);
    }

    send(message) {
        if (!this.process) {
            logger.error('Claude进程不存在，无法发送消息');
            return false;
        }

        try {
            this.process.stdin.write(message + '\n');
            this.isProcessing = true;
            return true;
        } catch (error) {
            logger.error('发送消息到Claude失败', error);
            return false;
        }
    }

    checkOutputComplete() {
        if (this.outputBuffer.includes('\n') || this.outputBuffer.length > 500) {
            const response = this.outputBuffer.trim();
            this.outputBuffer = '';
            this.isProcessing = false;
            handleClaudeResponse(response);
        }
    }

    handleProcessError() {
        if (this.restartAttempts >= this.maxRestarts) {
            logger.error('Claude重启次数超限，停止重试');
            bot.sendMessage(TELEGRAM_GROUP_ID, 
                '⚠️ Claude AI服务异常，请联系管理员检查。目前使用备用响应模式。');
        }
    }
}

const claudeManager = new ClaudeManager();

// 消息队列管理
class MessageQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
    }

    add(message) {
        this.queue.push(message);
        logger.debug('消息加入队列', { queueLength: this.queue.length });
        this.processNext();
    }

    async processNext() {
        if (this.processing || this.queue.length === 0) {
            return;
        }

        this.processing = true;
        const message = this.queue.shift();
        
        try {
            await this.processMessage(message);
        } catch (error) {
            logger.error('处理消息失败', { error, message });
        } finally {
            this.processing = false;
            setTimeout(() => this.processNext(), 1000);
        }
    }

    async processMessage(message) {
        const { chatId, text, fromId, fromUsername } = message;
        logger.info('处理消息', { fromUsername, text: text.substring(0, 50) });
        
        currentChatId = chatId;
        await sendToClaude(fromId, fromUsername, text);
    }
}

const messageQueue = new MessageQueue();
let currentChatId = null;

// 发送消息到Claude
async function sendToClaude(fromId, fromUsername, text) {
    const role = fromId === BOSS_ID ? '老板' : '员工';
    let prompt = '';

    try {
        if (role === '老板') {
            prompt = buildBossPrompt(text);
        } else {
            prompt = buildEmployeePrompt(fromUsername, text);
        }

        if (claudeManager.process && !claudeManager.isProcessing) {
            const sent = claudeManager.send(prompt);
            if (!sent) {
                throw new Error('发送失败');
            }
        } else {
            throw new Error('Claude不可用');
        }
    } catch (error) {
        logger.error('发送到Claude失败，使用备用响应', error);
        await useFallbackResponse(currentChatId, role, text);
    }
}

// 构建提示词
function buildBossPrompt(text) {
    return `老板给你一个新任务："${text}"。请将此任务拆解为多个可执行的子任务，并为每个任务指定负责人和截止日期。
在Notion创建相应的项目和任务记录，然后生成要发送到群组的消息，@提及相关负责人。
只返回要发送的群组消息内容。`;
}

function buildEmployeePrompt(username, text) {
    if (text.includes('完成') || /done|finished|completed/i.test(text)) {
        return `员工@${username}报告："${text}"。
请在Notion中将相应任务标记为完成，更新项目进度。
生成确认消息并表扬该员工。只返回群组消息。`;
    } else if (text.includes('问题') || text.includes('阻碍')) {
        return `员工@${username}遇到问题："${text}"。
请在Notion中更新任务状态为需协助，创建阻碍记录。
生成通知消息，@老板请求支援。只返回群组消息。`;
    } else {
        return `作为项目管理助手，回复员工@${username}的消息："${text}"。
保持专业友好的语气。`;
    }
}

// 处理Claude响应
function handleClaudeResponse(responseText) {
    try {
        const cleanResponse = responseText
            .replace(/\x1b\[[0-9;]*m/g, '')
            .replace(/^(Human|Assistant):.*$/gm, '')
            .trim();

        if (!cleanResponse) {
            logger.warn('Claude响应为空');
            return;
        }

        logger.info('收到Claude响应', { length: cleanResponse.length });
        
        const targetChatId = currentChatId || TELEGRAM_GROUP_ID;
        sendToTelegram(targetChatId, cleanResponse);
    } catch (error) {
        logger.error('处理Claude响应失败', error);
    }
}

// 发送消息到Telegram
async function sendToTelegram(chatId, message) {
    try {
        await bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        });
        logger.info('消息发送成功', { chatId, messageLength: message.length });
    } catch (error) {
        logger.error('Telegram发送失败，尝试纯文本', error);
        try {
            await bot.sendMessage(chatId, message);
            logger.info('纯文本发送成功');
        } catch (error2) {
            logger.error('纯文本发送也失败', error2);
        }
    }
}

// 备用响应
async function useFallbackResponse(chatId, role, text) {
    let response = '';
    
    if (role === '老板') {
        response = `📋 收到任务："${text}"\n正在处理中...（Claude暂时不可用）`;
    } else if (text.includes('完成')) {
        response = `✅ 收到完成通知！感谢您的努力！`;
    } else if (text.includes('问题') || text.includes('阻碍')) {
        response = `⚠️ 已记录问题，将尽快协调解决。`;
    } else {
        response = `收到消息，我会尽快处理。`;
    }
    
    await sendToTelegram(chatId, response);
}

// Notion API函数（带错误处理）
async function notionRequest(url, method = 'GET', data = null) {
    try {
        const config = {
            method,
            url: `${NOTION_BASE_URL}${url}`,
            headers: notionHeaders
        };
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        return response.data;
    } catch (error) {
        logger.error('Notion API请求失败', {
            url,
            error: error.response?.data || error.message
        });
        return null;
    }
}

// 消息处理
bot.on('message', async (msg) => {
    try {
        const chatId = msg.chat.id;
        const text = msg.text?.trim();
        const fromId = msg.from.id;
        const fromUsername = msg.from.username || msg.from.first_name || '未知用户';

        // 忽略机器人自己的消息
        if (msg.from.username === BOT_USERNAME.replace('@', '')) return;
        if (!text) return;

        logger.info('收到消息', {
            chatId,
            fromId,
            fromUsername,
            text: text.substring(0, 50)
        });

        // 处理命令
        if (text.startsWith('/')) {
            await handleCommand(msg);
            return;
        }

        // 加入消息队列
        messageQueue.add({ chatId, text, fromId, fromUsername });
    } catch (error) {
        logger.error('消息处理错误', error);
    }
});

// 命令处理
async function handleCommand(msg) {
    const chatId = msg.chat.id;
    const text = msg.text;
    const command = text.split(' ')[0];

    try {
        switch (command) {
            case '/start':
                await bot.sendMessage(chatId, 
                    `👋 欢迎使用AI项目管理助手！\n\n` +
                    `功能特性：\n` +
                    `• 智能任务拆解与分配\n` +
                    `• 实时进度跟踪\n` +
                    `• 自动生成报告\n` +
                    `• Notion数据同步\n\n` +
                    `使用 /help 查看命令列表`
                );
                break;

            case '/status':
                const claudeStatus = claudeManager.process ? '✅ 运行中' : '❌ 未运行';
                const queueLength = messageQueue.queue.length;
                await bot.sendMessage(chatId,
                    `🤖 **系统状态**\n\n` +
                    `Claude AI: ${claudeStatus}\n` +
                    `消息队列: ${queueLength} 条待处理\n` +
                    `Notion: ${NOTION_API_KEY ? '✅ 已配置' : '❌ 未配置'}\n` +
                    `运行时间: ${process.uptime().toFixed(0)} 秒`,
                    { parse_mode: 'Markdown' }
                );
                break;

            case '/restart':
                if (msg.from.id === BOSS_ID) {
                    claudeManager.restart();
                    await bot.sendMessage(chatId, '🔄 正在重启Claude AI...');
                } else {
                    await bot.sendMessage(chatId, '❌ 仅管理员可执行此操作');
                }
                break;

            case '/logs':
                if (msg.from.id === BOSS_ID) {
                    const today = new Date().toISOString().split('T')[0];
                    const logFile = `./logs/${today}.log`;
                    if (fs.existsSync(logFile)) {
                        const logs = fs.readFileSync(logFile, 'utf-8')
                            .split('\n')
                            .slice(-10)
                            .join('\n');
                        await bot.sendMessage(chatId, `📝 最近日志：\n\`\`\`\n${logs}\n\`\`\``, 
                            { parse_mode: 'Markdown' });
                    } else {
                        await bot.sendMessage(chatId, '暂无日志');
                    }
                } else {
                    await bot.sendMessage(chatId, '❌ 仅管理员可查看日志');
                }
                break;

            case '/help':
                await bot.sendMessage(chatId,
                    `📋 **命令列表**\n\n` +
                    `/start - 欢迎信息\n` +
                    `/status - 系统状态\n` +
                    `/help - 帮助信息\n` +
                    `${msg.from.id === BOSS_ID ? '/restart - 重启Claude\n/logs - 查看日志\n' : ''}` +
                    `\n直接发送消息与AI对话`,
                    { parse_mode: 'Markdown' }
                );
                break;

            default:
                await bot.sendMessage(chatId, '❓ 未知命令，使用 /help 查看帮助');
        }
    } catch (error) {
        logger.error('命令处理失败', { command, error });
        await bot.sendMessage(chatId, '❌ 命令执行失败，请稍后重试');
    }
}

// 定时任务
cron.schedule('0 9,13,18 * * *', async () => {
    logger.info('执行定时报告');
    try {
        const prompt = '生成项目进度报告，包括项目状态、任务进度、阻碍情况。';
        currentChatId = TELEGRAM_GROUP_ID;
        
        if (claudeManager.process) {
            claudeManager.send(prompt);
        } else {
            await bot.sendMessage(TELEGRAM_GROUP_ID, 
                '📊 定时报告（备用模式）\n请手动检查Notion获取最新进度。');
        }
    } catch (error) {
        logger.error('定时报告失败', error);
    }
});

// 错误处理
bot.on('polling_error', (error) => {
    logger.error('Telegram轮询错误', error);
});

process.on('uncaughtException', (error) => {
    logger.error('未捕获异常', error);
    // 尝试优雅关闭
    setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('未处理的Promise拒绝', { reason, promise });
});

// 优雅关闭
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function shutdown() {
    logger.info('收到关闭信号，正在优雅关闭...');
    
    try {
        claudeManager.stop();
        await bot.stopPolling();
        logger.info('关闭完成');
        process.exit(0);
    } catch (error) {
        logger.error('关闭时出错', error);
        process.exit(1);
    }
}

// 启动
async function start() {
    logger.info('启动AI项目管理机器人', {
        environment: process.env.NODE_ENV || 'development',
        botUsername: BOT_USERNAME,
        groupId: TELEGRAM_GROUP_ID
    });

    // 启动Claude
    claudeManager.start();

    logger.info('机器人启动完成，等待消息...');
}

// 执行启动
start().catch(error => {
    logger.error('启动失败', error);
    process.exit(1);
});