# 🚀 快速部署指南

## 一键启动
```bash
./start.sh
```

## 管理命令

| 命令 | 说明 |
|-----|------|
| `./start.sh` | 启动所有服务 |
| `./stop.sh` | 停止所有服务 |
| `./restart.sh` | 重启所有服务 |
| `./status.sh` | 查看服务状态 |

## 日志查看
```bash
# 实时查看Bot日志
tail -f /tmp/bot.log

# 实时查看AI服务器日志  
tail -f /tmp/ai.log

# 查看最近的错误
grep -i error /tmp/bot.log | tail -20
```

## 功能验证

### 1. 发送测试消息
在Telegram群组中发送：
- "你好" - 测试闲聊
- "有什么任务" - 列出任务
- "为办公室买打印机" - 创建任务
- 发送语音消息 - 测试语音识别

### 2. 检查语音回复
Bot应该同时发送：
- 📝 文字消息
- 🎤 语音消息（相同内容）

### 3. 任务确认流程
1. 发送创建任务的消息
2. Bot显示任务预览
3. 回复"确定"保存到Notion
4. 或等待2分钟自动取消

## 常见问题

### Bot不回复
1. 检查群组是否为Forum模式
2. 确保Bot有管理员权限
3. 在主题中@lapureleonardchow_bot

### 语音不工作
1. 检查 `ENABLE_VOICE_REPLY=true`
2. 确保网络可访问Google TTS
3. 查看日志中的语音错误

### AI服务器错误
1. 确保Claude CLI已登录
2. 检查端口3001是否被占用
3. 重启AI服务器

## 服务架构
```
Telegram用户
    ↓
Telegram Bot (端口: Webhook)
    ↓
AI服务器 (端口: 3001)
    ↓
Claude CLI (本地调用)
    ↓
Notion API (云端)
```

## 进程管理
```bash
# 查看所有相关进程
ps aux | grep -E "node.*(bot|ai-server)"

# 强制停止所有进程
pkill -f "node.*bot"
pkill -f "node.*ai-server"
```

## 备份配置
```bash
# 备份环境配置
cp .env .env.backup

# 备份定时任务
cp recurring-tasks.json recurring-tasks.backup.json
```

## 性能优化
- AI服务器使用内存缓存
- 语音文件自动清理
- 定时任务按需加载

## 安全建议
1. 定期更换Bot Token
2. 限制Notion API权限
3. 使用环境变量存储密钥
4. 不要提交.env到Git