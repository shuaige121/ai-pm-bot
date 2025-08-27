# AI PM Bot - AI项目管理机器人

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org)
[![Telegram Bot API](https://img.shields.io/badge/Telegram%20Bot%20API-Latest-blue)](https://core.telegram.org/bots/api)

基于 Telegram 的智能项目管理机器人，集成 Claude AI 和 Notion 数据库，支持中文语音交互

[English](#) | **中文**

</div>

## ✨ 特性

- 🤖 **AI 智能理解** - 使用 Claude CLI 进行自然语言处理，智能识别任务意图
- 🎤 **语音交互** - 支持语音输入识别和语音回复（文字+语音同时发送）
- 📋 **任务管理** - 自动创建项目和任务，智能分配负责人到 Notion
- 🏢 **多业务支持** - 自动路由到不同业务线（支持多个 Notion 数据库）
- ⏰ **定时任务** - 支持每天/每周/每月的重复任务提醒
- 💰 **完全免费** - 所有语音功能使用开源方案，无需付费 API
- 🖥️ **Mac 应用** - 提供原生 macOS 应用程序界面

## 🎯 使用场景

- 团队项目管理和任务分配
- 办公室日常事务管理
- 多业务线任务协调
- 定期任务提醒和跟踪
- 语音记录和任务创建

## 🚀 快速开始

### 前置要求

- Node.js 16+
- Claude CLI（需要登录）
- Telegram Bot Token
- Notion API Key

### 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/ai-pm-bot.git
cd ai-pm-bot

# 安装依赖
npm install

# 安装语音组件（可选）
brew install whisper-cpp  # macOS

# 下载 Whisper 模型
mkdir models && cd models
curl -LO https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
cd ..
```

### 配置

1. 复制环境变量配置文件：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入你的配置

3. 登录 Claude CLI：
```bash
claude auth login
```

### 启动

```bash
# 添加执行权限
chmod +x *.sh

# 一键启动
./start.sh

# 或分别启动
node ai-server-claude.js  # AI 服务器
node bot-with-ai-server.js  # Telegram Bot
```

## 💬 使用方法

### 基础命令

| 命令示例 | 功能 | 说明 |
|---------|------|------|
| "为办公室买打印机" | 创建任务 | 自动识别并创建任务 |
| "有什么任务" | 列出任务 | 显示所有待办任务 |
| "打印机买好了" | 完成任务 | 标记任务为完成 |
| "每周五提交周报" | 定时任务 | 创建重复提醒 |
| 发送语音消息 | 语音识别 | 自动转文字并处理 |

### 任务确认流程

1. 发送创建任务的消息
2. Bot 显示任务预览
3. 回复"确定"保存到 Notion
4. 2分钟内不确认将自动取消

## 🛠️ 项目结构

```
ai-pm-bot/
├── bot-with-ai-server.js    # Telegram Bot 主程序
├── ai-server-claude.js       # AI 服务器（调用 Claude CLI）
├── notion-service.js         # Notion 数据库操作
├── voice-service-local.js    # 语音处理（Whisper + gTTS）
├── biz-router.js            # 业务线路由
├── role-router.js           # 负责人分配
├── recurring-tasks.js       # 定时任务管理
├── start.sh                 # 启动脚本
├── stop.sh                  # 停止脚本
├── AI PM Bot.app/          # macOS 应用
└── .env                     # 配置文件
```

## 🖥️ Mac 应用

```bash
# 创建应用
./create-simple-app.sh

# 打开应用
open "AI PM Bot.app"
```

## 🔧 开发

### 测试

```bash
# 测试所有功能
node test-all-features.js

# 查看服务状态
./status.sh
```

### 日志

```bash
# 查看 Bot 日志
tail -f /tmp/bot.log

# 查看 AI 服务器日志
tail -f /tmp/ai.log
```

## 🆓 免费方案说明

本项目使用的所有核心功能都是免费的：

- **语音识别**: Whisper.cpp（本地模型，完全免费）
- **语音合成**: Google TTS（gTTS，免费）
- **AI 理解**: Claude CLI（需要 Claude 账号）
- **无需任何付费 API**

## 🐛 故障排除

### Bot 不回复

1. 检查群组是否为 Forum 模式
2. 确保 Bot 有管理员权限
3. 在主题中 @bot_username

### 语音功能不工作

1. 检查 `ENABLE_VOICE_REPLY=true`
2. 确保安装了 Whisper
3. 验证网络可访问 Google TTS

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🤝 贡献

欢迎提交 Pull Request 或创建 Issue！

---

<div align="center">

**如果这个项目对你有帮助，请给一个 ⭐️**

</div>
