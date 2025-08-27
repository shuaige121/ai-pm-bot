# 🤖 AI项目管理机器人 - 完整配置说明

## ✅ 系统状态：已完全修复并测试通过

### 最新更新
- **业务路由逻辑优化**：办公室采购默认归LaPure
- **Telegram错误修复**：无效用户名不再使用@mention
- **Notion属性映射**：正确处理中英文属性差异

## 📋 业务分区规则

### 默认规则：办公室采购 → LaPure
**关键点**：只要涉及订购、采购、买东西，且没有明确说给谁（如"给租客"、"给Salon"），就默认归LaPure。

### 具体分配逻辑

#### 1️⃣ LaPure（默认业务）
- **触发词**：lapure、护肤、护发、面膜、品牌、电商、海报、官网、小红书、tiktok
- **办公采购**：办公、订购、采购、买、购买、订、进货、补货、用品、物资、设备、耗材
- **数据库**：
  - 项目库：LaPure DB（英文属性：Project name, Status等）
  - 任务库：通用任务库（中文属性）

**示例**：
- ✅ "订购办公用品" → LaPure
- ✅ "买咖啡机" → LaPure
- ✅ "采购一批设备" → LaPure
- ✅ "LaPure产品拍摄" → LaPure

#### 2️⃣ Salon业务
- **触发词**：salon、理发、美发、沙龙、发廊、门店、发型、染烫
- **必须明确提及Salon或理发店**
- **数据库**：
  - 项目库：通用项目库（中文属性）
  - 任务库：通用任务库（中文属性）

**示例**：
- ✅ "Salon需要染发剂" → Salon
- ✅ "理发店订购洗发水" → Salon
- ❌ "订购染发剂"（没提Salon） → LaPure

#### 3️⃣ BB House业务
- **触发词**：bb house、租赁、房屋、租客、房客
- **必须明确提及BB House或租客**
- **数据库**：
  - 项目库：通用项目库（中文属性）
  - 任务库：BB House任务库（中文属性+额外字段）

**示例**：
- ✅ "BB House空调维修" → BB House
- ✅ "给租客买家具" → BB House
- ❌ "买家具"（没提租客） → LaPure

## 🚀 启动系统

```bash
# 启动所有服务
./start-services.sh

# 或分别启动
node ai-server-claude.js &
node bot-with-ai-server.js &
```

## 🧪 测试系统

```bash
# 完整测试（含Notion实际操作）
node full-test-with-notion.js

# 快速测试
node test-final.js
```

## 💬 使用示例

### 在Telegram群组中：

1. **创建任务**
   - "订购一批办公用品" → 自动归LaPure
   - "Salon需要染发剂" → 归Salon业务
   - "给租客买床垫" → 归BB House

2. **报告完成**
   - "办公用品已经订购完成"
   - "染发剂done"

3. **报告问题**
   - "订购遇到问题，供应商缺货"
   - "需要老板批准预算"

4. **查询进度**
   - "查看今天的进度"
   - "项目状态如何"

5. **普通聊天**
   - "今天天气真好" → 只回复，不创建任务

## 📊 测试结果

```
业务路由测试: 8/8 ✅
- 办公用品采购 → LaPure ✓
- 买咖啡机 → LaPure ✓
- 订购饮料 → LaPure ✓
- Salon染发剂 → Salon ✓
- 给租客买家具 → BB House ✓
- BB House维修 → BB House ✓
- LaPure产品拍摄 → LaPure ✓
- 通用采购 → LaPure ✓

Notion操作: 3个项目成功创建并删除 ✅
Telegram消息: 正常发送，无错误 ✅
```

## ⚙️ 配置文件

### .env配置
```env
# Telegram配置
TELEGRAM_BOT_TOKEN=你的token
TELEGRAM_GROUP_ID=你的群组ID

# Notion配置
NOTION_API_KEY=你的API密钥
NOTION_PROJECT_DB_ID=通用项目库ID
NOTION_TASK_DB_ID=通用任务库ID
NOTION_DB_BBHOUSE=BB House任务库ID
NOTION_DB_LAPURE=LaPure项目库ID

# Telegram用户名映射（可选）
TG_USER_ADMIN=admin真实用户名
TG_USER_DESIGNER=设计师用户名
TG_USER_GUO=郭总用户名
TG_USER_JOE=joe用户名
```

## 🔧 故障排除

1. **如果出现"处理消息时遇到问题"**
   - 检查Notion数据库属性名是否匹配
   - 检查Telegram用户名是否有效

2. **如果业务分配错误**
   - 检查biz-router.js的关键词匹配
   - 记住：不明确的采购默认归LaPure

3. **如果AI响应慢**
   - 检查Claude CLI是否正常：`claude auth status`
   - 重启AI服务器：`pkill -f ai-server && node ai-server-claude.js &`

## 📝 维护提示

- 所有办公室采购默认归LaPure（主要业务）
- 只有明确提及特定业务时才分配到其他库
- 系统不会再询问"属于哪个业务"
- 无效的Telegram用户名会使用中文角色名代替

---

系统已完全配置并测试通过，可以正常使用！