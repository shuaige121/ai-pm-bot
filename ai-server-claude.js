// ai-server-claude.js
// 本地 AI 服务器（Claude 代理版）：接收文本 → 调用 Claude CLI → 返回结构化拆解 JSON
//
// 运行：node ai-server-claude.js
// 端点：POST /breakdown { text, author, idempotencyKey? }  ->  { ok, project_title, tasks:[{title,details,due_hint}] }
//
// 说明：
// - 不直接连接 Notion；只生成 JSON，由 bot 写入 Notion（更可控）。
// - 无需 Claude Desktop；使用 Claude Code CLI 子进程（需已登录：claude auth status）。
// - 有共享密钥校验（x-api-key），有健康检查（/health），有幂等缓存（idempotencyKey）。

const express = require('express');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// --- 安全：共享密钥 ---
app.use((req, res, next) => {
  const key = req.header('x-api-key');
  if (!process.env.AI_SERVER_KEY || key === process.env.AI_SERVER_KEY) return next();
  return res.status(401).json({ ok: false, error: 'unauthorized' });
});

// --- 健康检查 ---
app.get('/health', (req, res) => {
  res.json({ ok: true, ts: Date.now(), service: 'ai-server-claude' });
});

// --- 幂等缓存（内存版；生产可换 redis/sqlite） ---
const cache = new Map();

// --- Claude 调用：一次请求 = 一次子进程（简单稳妥）---
function askClaudeOnce(prompt, { timeoutMs = 90000 } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', [], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const t = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch {}
      reject(new Error('Claude timeout'));
    }, timeoutMs);

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('error', (err) => {
      clearTimeout(t);
      reject(err);
    });
    proc.on('close', (code) => {
      clearTimeout(t);
      if (code !== 0 && !stdout) {
        return reject(new Error(`Claude exit ${code}: ${stderr.trim()}`));
      }
      resolve({ stdout, stderr, code });
    });

    // 写入提示，结尾必须换行
    proc.stdin.write(prompt + '\n');
    proc.stdin.end();
  });
}

// --- 从自由文本中提取单个 JSON（容错解析）---
function extractSingleJSON(text) {
  // 策略：找到第一个 '{' 开始，做括号计数直到配对成功
  const i = text.indexOf('{');
  if (i === -1) throw new Error('no json start');
  let depth = 0;
  for (let j = i; j < text.length; j++) {
    const ch = text[j];
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth === 0) {
      const candidate = text.slice(i, j + 1);
      return JSON.parse(candidate);
    }
  }
  throw new Error('json not closed');
}

// --- 生成 Claude 提示词（判别意图 + 智能回复）---
function buildPrompt(author, rawText) {
  return `
[ROLE]
你是"项目管理AI助手"。对每条输入，先判别意图，再输出统一JSON：
- 若是闲聊/咨询/问候 => intent=chat，给一个自然、有帮助的回答到 assistant_reply；
- 若是"创建项目/分配任务/安排工作" => intent=task_new，给 project_title + tasks（不分配负责人）+ assistant_reply；
- 若是"完成了/做完了/已提交/done" => intent=task_done，给 status_update.task_hint（任务线索）+ assistant_reply；
- 若是"遇到问题/需要批准/缺少资源/被阻塞" => intent=task_blocked，给 obstacle.desc 和 obstacle.need + assistant_reply；
- 若是"查看进度/汇报状态/今日总结/项目进度统计/进度报告" => intent=task_query，assistant_reply说明将生成统计报告（数字）；
- 若是包含"任务"关键字或问"有什么/还有什么/什么需要做/待办" => intent=list_tasks，assistant_reply说明将列出全部待办任务；
- 若是"列出项目/所有项目/项目列表" => intent=list_projects，assistant_reply说明将列出所有项目；
- 若是包含"每周/每天/每月"并且描述了要做的事 => intent=recurring_task，给 recurring.title + recurring.frequency + assistant_reply；
只输出JSON，不要多余文字。

[INPUT]
发起人: ${author || 'unknown'}
消息:
"""${rawText}"""

[OUTPUT_JSON_SCHEMA]
{
  "intent": "chat | task_new | task_done | task_blocked | task_query | list_tasks | list_projects | recurring_task",
  "assistant_reply": "string (必填，用于群里回复)",
  "project_title": "string (task_new时必填)",
  "tasks": [
    { "title": "string", "details": "string", "due_hint": "string" }
  ],
  "status_update": { "task_hint": "string (task_done时必填)" },
  "obstacle": { "desc": "string", "need": "string (task_blocked时必填)" },
  "recurring": { 
    "title": "string (recurring_task时必填)",
    "frequency": "daily | weekly | monthly",
    "day_of_week": "1-7 (weekly时选填)",
    "time": "HH:MM (选填，默认09:00)"
  }
}

[RULES]
- assistant_reply 必须总是提供：自然、友好、专业的回复（像Claude那样）；
- task_new：project_title不超过40字；tasks 1~8条，每条10~22字；
- task_done：从消息推断完成了什么任务，给出task_hint；
- task_blocked：描述具体问题和需要什么帮助；
- 重要区分：
  * task_query：只用于统计数字（进度报告、统计汇总）
  * list_tasks：列出全部具体任务（只要用户问任务就用这个）
  * recurring_task：创建定时重复任务（每天/每周/每月）
  * 规则：如果消息包含"任务"二字或问"有什么/还有什么"，一律用list_tasks
  * 规则：如果消息以"每天/每周/每月"开头并描述了具体任务，用recurring_task
- 不要分配负责人（系统会根据关键词自动分配）；
- 不要询问属于哪个业务（系统会自动判断：办公室采购默认归LaPure）；
- 仅输出JSON（不要代码块标记、不要解释）。

[EXAMPLES]
输入："今天天气真好"
输出：{"intent":"chat","assistant_reply":"是的，天气不错！希望您今天工作顺利。有什么项目需要我协助安排吗？"}

输入："BB house需要安装WiFi，三天内完成"
输出：{"intent":"task_new","assistant_reply":"好的，我来为BB House的WiFi安装制定计划，需要在三天内完成。","project_title":"BB House WiFi安装","tasks":[{"title":"联系网络运营商","details":"比较套餐价格和服务","due_hint":"今天"},{"title":"提交申请材料","details":"准备地址证明等文件","due_hint":"明天"},{"title":"预约安装时间","details":"确保现场有人接待","due_hint":"2天内"},{"title":"完成安装调试","details":"测试网络连接","due_hint":"3天内"}]}

输入："WiFi申请已经提交了"
输出：{"intent":"task_done","assistant_reply":"太好了！WiFi申请已经提交，我会更新任务状态为完成。请继续跟进后续的安装安排。","status_update":{"task_hint":"WiFi申请"}}

输入："有什么任务"
输出：{"intent":"list_tasks","assistant_reply":"让我为您列出所有待办任务。"}

输入："还有什么事没做完"
输出：{"intent":"list_tasks","assistant_reply":"我来查看一下所有未完成的任务。"}

输入："查看进度"
输出：{"intent":"task_query","assistant_reply":"正在为您生成项目进度报告。"}

输入："每周五提交周报"
输出：{"intent":"recurring_task","assistant_reply":"好的，我会设置每周五提醒提交周报的定时任务。","recurring":{"title":"提交周报","frequency":"weekly","day_of_week":"5","time":"17:00"}}

输入："每天检查邮件"
输出：{"intent":"recurring_task","assistant_reply":"明白了，我会设置每天提醒检查邮件的定时任务。","recurring":{"title":"检查邮件","frequency":"daily","time":"09:00"}}

[OUTPUT_ONLY_JSON]`;
}

// --- /breakdown 主路由 ---
app.post('/breakdown', async (req, res) => {
  const { text, author, idempotencyKey } = req.body || {};

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ ok: false, error: 'text required' });
  }

  // 幂等
  if (idempotencyKey && cache.has(idempotencyKey)) {
    return res.json(cache.get(idempotencyKey));
  }

  // 组装提示
  const prompt = buildPrompt(author, text);

  try {
    const { stdout } = await askClaudeOnce(prompt, { timeoutMs: 90_000 });

    let data;
    try {
      data = extractSingleJSON(stdout);
    } catch (e) {
      // 二次尝试：去掉代码块/提示符等噪音后再 parse
      const cleaned = stdout.replace(/```json|```/g, '').trim();
      data = extractSingleJSON(cleaned);
    }

    // 最小校验
    if (!data || typeof data !== 'object') {
      throw new Error('bad json shape');
    }
    
    // 确保intent存在
    if (!data.intent) {
      data.intent = 'chat';
    }
    
    // 确保assistant_reply存在
    if (!data.assistant_reply) {
      data.assistant_reply = '收到您的消息，正在处理中。';
    }
    
    // 归一化 tasks (如果是task_new)
    if (data.intent === 'task_new' && data.tasks) {
      data.tasks = data.tasks
        .filter(t => t && typeof t.title === 'string' && t.title.trim())
        .map(t => ({
          title: String(t.title).slice(0, 40),
          details: typeof t.details === 'string' ? t.details : '',
          due_hint: typeof t.due_hint === 'string' ? t.due_hint : ''
        }));
        
      if (!data.project_title) {
        data.project_title = text.slice(0, 40);
      }
    } else {
      data.tasks = data.tasks || [];
    }

    const result = { 
      ok: true, 
      intent: data.intent,
      assistant_reply: data.assistant_reply,
      project_title: data.project_title || '',
      tasks: data.tasks || [],
      status_update: data.status_update || null,
      obstacle: data.obstacle || null
    };
    if (idempotencyKey) cache.set(idempotencyKey, result);
    return res.json(result);

  } catch (err) {
    console.error('[claude-breakdown-error]', err?.message || err);
    // 降级：返回一个友好的聊天回复（不阻塞主流程）
    const fallback = {
      ok: true,
      intent: 'chat',
      assistant_reply: '收到您的消息。我正在处理中，如果是任务相关的需求，请稍后再试或者更详细地描述一下。',
      project_title: '',
      tasks: [],
      status_update: null,
      obstacle: null
    };
    if (idempotencyKey) cache.set(idempotencyKey, fallback);
    return res.json(fallback);
  }
});

// --- 启动 ---
const PORT = process.env.AI_SERVER_PORT ? Number(process.env.AI_SERVER_PORT) : 3001;
app.listen(PORT, () => {
  console.log(`🧠 Claude 代理 AI 服务器启动：端口 ${PORT}`);
  console.log(`📡 任务拆解 API: http://localhost:${PORT}/breakdown`);
});