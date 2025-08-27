// recurring-tasks.js
// 管理定时重复任务

const fs = require('fs').promises;
const path = require('path');
const cron = require('node-cron');

// 定时任务数据文件
const RECURRING_TASKS_FILE = path.join(__dirname, 'recurring-tasks.json');

// 存储所有定时任务
let recurringTasks = [];
let activeJobs = new Map(); // 存储cron job实例

// 加载定时任务
async function loadRecurringTasks() {
  try {
    const data = await fs.readFile(RECURRING_TASKS_FILE, 'utf8');
    recurringTasks = JSON.parse(data);
    console.log(`📅 加载了 ${recurringTasks.length} 个定时任务`);
    return recurringTasks;
  } catch (error) {
    // 文件不存在，创建空数组
    recurringTasks = [];
    await saveRecurringTasks();
    return recurringTasks;
  }
}

// 保存定时任务
async function saveRecurringTasks() {
  try {
    await fs.writeFile(
      RECURRING_TASKS_FILE, 
      JSON.stringify(recurringTasks, null, 2),
      'utf8'
    );
  } catch (error) {
    console.error('保存定时任务失败:', error);
  }
}

// 添加定时任务
async function addRecurringTask({
  title,
  description,
  frequency, // 'daily', 'weekly', 'monthly'
  dayOfWeek, // 1-7 (周一到周日) for weekly
  timeOfDay = '09:00', // HH:MM 格式
  assignee,
  createdBy,
  groupId
}) {
  const task = {
    id: Date.now().toString(),
    title,
    description,
    frequency,
    dayOfWeek,
    timeOfDay,
    assignee,
    createdBy,
    groupId,
    createdAt: new Date().toISOString(),
    lastReminded: null,
    completedThisWeek: false,
    active: true
  };
  
  recurringTasks.push(task);
  await saveRecurringTasks();
  
  // 启动cron job
  startCronJob(task);
  
  return task;
}

// 删除定时任务
async function removeRecurringTask(taskId) {
  const index = recurringTasks.findIndex(t => t.id === taskId);
  if (index === -1) return false;
  
  recurringTasks.splice(index, 1);
  await saveRecurringTasks();
  
  // 停止cron job
  if (activeJobs.has(taskId)) {
    activeJobs.get(taskId).stop();
    activeJobs.delete(taskId);
  }
  
  return true;
}

// 标记任务完成
async function markRecurringTaskComplete(taskTitle) {
  const task = recurringTasks.find(t => 
    t.title.toLowerCase().includes(taskTitle.toLowerCase()) && 
    t.active
  );
  
  if (!task) return null;
  
  task.completedThisWeek = true;
  task.lastCompleted = new Date().toISOString();
  await saveRecurringTasks();
  
  return task;
}

// 重置每周任务状态（每周一凌晨重置）
async function resetWeeklyTasks() {
  recurringTasks.forEach(task => {
    if (task.frequency === 'weekly') {
      task.completedThisWeek = false;
    }
  });
  await saveRecurringTasks();
  console.log('📅 已重置每周任务状态');
}

// 获取待完成的定时任务
function getPendingRecurringTasks() {
  return recurringTasks.filter(t => 
    t.active && !t.completedThisWeek
  );
}

// 获取所有定时任务
function getAllRecurringTasks() {
  return recurringTasks.filter(t => t.active);
}

// 生成cron表达式
function getCronExpression(task) {
  const [hour, minute] = task.timeOfDay.split(':');
  
  switch (task.frequency) {
    case 'daily':
      // 每天的指定时间
      return `${minute} ${hour} * * *`;
    
    case 'weekly':
      // 每周指定日期的指定时间
      const day = task.dayOfWeek || 1; // 默认周一
      return `${minute} ${hour} * * ${day}`;
    
    case 'monthly':
      // 每月1号的指定时间
      return `${minute} ${hour} 1 * *`;
    
    default:
      // 默认每天
      return `${minute} ${hour} * * *`;
  }
}

// 启动cron job
function startCronJob(task, sendReminder) {
  if (activeJobs.has(task.id)) {
    activeJobs.get(task.id).stop();
  }
  
  const cronExp = getCronExpression(task);
  
  const job = cron.schedule(cronExp, async () => {
    // 检查是否已完成
    if (task.completedThisWeek && task.frequency === 'weekly') {
      console.log(`📅 任务 "${task.title}" 本周已完成，跳过提醒`);
      return;
    }
    
    // 发送提醒
    if (sendReminder) {
      await sendReminder(task);
    }
    
    task.lastReminded = new Date().toISOString();
    await saveRecurringTasks();
  });
  
  activeJobs.set(task.id, job);
  console.log(`⏰ 已启动定时任务: ${task.title} (${cronExp})`);
}

// 初始化所有定时任务
async function initializeRecurringTasks(sendReminder) {
  await loadRecurringTasks();
  
  // 启动所有活跃的定时任务
  recurringTasks.forEach(task => {
    if (task.active) {
      startCronJob(task, sendReminder);
    }
  });
  
  // 每周一凌晨重置任务状态
  cron.schedule('0 0 * * 1', resetWeeklyTasks);
  
  console.log(`📅 定时任务系统已启动，共 ${recurringTasks.filter(t => t.active).length} 个活跃任务`);
}

module.exports = {
  loadRecurringTasks,
  addRecurringTask,
  removeRecurringTask,
  markRecurringTaskComplete,
  getPendingRecurringTasks,
  getAllRecurringTasks,
  initializeRecurringTasks
};