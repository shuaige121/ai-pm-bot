// notion-service.js
const axios = require('axios');
const { pickBizDBIds } = require('./biz-router.js');
require('dotenv').config();

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_VERSION = process.env.NOTION_VERSION || '2022-06-28';

// Notion API 客户端
class NotionClient {
  constructor() {
    this.headers = {
      'Authorization': `Bearer ${NOTION_API_KEY}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION
    };
    this.baseURL = 'https://api.notion.com/v1';
  }

  async createPage(dbId, properties) {
    try {
      const response = await axios.post(
        `${this.baseURL}/pages`,
        {
          parent: { database_id: dbId },
          properties
        },
        { headers: this.headers }
      );
      return response.data.id;
    } catch (error) {
      console.error('创建 Notion 页面失败:', error.response?.data || error.message);
      throw error;
    }
  }

  async updatePage(pageId, properties) {
    try {
      const response = await axios.patch(
        `${this.baseURL}/pages/${pageId}`,
        { properties },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('更新 Notion 页面失败:', error.response?.data || error.message);
      throw error;
    }
  }

  async queryDatabase(dbId, filter = null) {
    try {
      const payload = {};
      // 只有当filter不为null且不为空对象时才添加filter
      if (filter && Object.keys(filter).length > 0) {
        payload.filter = filter;
      }
      
      const response = await axios.post(
        `${this.baseURL}/databases/${dbId}/query`,
        payload,
        { headers: this.headers }
      );
      return response.data.results;
    } catch (error) {
      console.error('查询 Notion 数据库失败:', error.response?.data || error.message);
      throw error;
    }
  }
}

const notion = new NotionClient();

// 创建项目和任务
async function createProjectWithTasks({ projectTitle, bossName, tasks, sourceText }) {
  const { projectDb, taskDb } = pickBizDBIds(sourceText || projectTitle);
  
  console.log(`📂 选择业务分区: Project DB=${projectDb}, Task DB=${taskDb}`);
  
  try {
    // 1) 在 projectDb 创建项目
    let projectProperties;
    
    // 检查是否是LaPure数据库（使用英文属性）
    if (projectDb === process.env.NOTION_DB_LAPURE) {
      // LaPure数据库使用英文属性
      projectProperties = {
        'Project name': {
          title: [{ text: { content: projectTitle } }]
        },
        'Status': {
          status: { name: 'Not started' }
        },
        'Priority': {
          select: { name: 'Medium' }
        },
        'Start date': {
          date: { start: new Date().toISOString() }
        },
        'End date': {
          date: { start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
        }
      };
    } else {
      // 通用项目库使用中文属性
      projectProperties = {
        '项目名称': {
          title: [{ text: { content: projectTitle } }]
        },
        '状态': {
          select: { name: '未完成' }
        },
        '负责人': {
          rich_text: [{ text: { content: bossName || '未知' } }]
        },
        '截止日期': {
          date: { start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
        },
        '描述': {
          rich_text: [{ text: { content: sourceText || '' } }]
        }
      };
    }
    
    const projectId = await notion.createPage(projectDb, projectProperties);
    console.log(`✅ 项目已创建: ${projectTitle} (ID: ${projectId})`);
    
    // 2) 在 taskDb 为每个任务创建条目
    for (const task of tasks) {
      let taskProperties;
      
      // BB House任务库使用特殊属性
      if (taskDb === process.env.NOTION_DB_BBHOUSE) {
        taskProperties = {
          '任务名称': {
            title: [{ text: { content: task.title } }]
          },
          '状态': {
            select: { name: '未完成' }
          },
          '负责人': {
            rich_text: [{ text: { content: task.assigneeRole || 'admin' } }]
          },
          '优先级': {
            select: { name: '中' }
          },
          '类型': {
            select: { name: '任务' }
          },
          '描述': {
            rich_text: [{ text: { content: task.details || '' } }]
          }
        };
      } else {
        // 通用任务库使用标准属性
        taskProperties = {
          '任务名称': {
            title: [{ text: { content: task.title } }]
          },
          '状态': {
            select: { name: '未完成' }
          },
          '负责人': {
            rich_text: [{ text: { content: task.assigneeRole || 'admin' } }]
          },
          '优先级': {
            select: { name: '中' }
          }
        };
      }
      
      // 如果有截止日期
      if (task.due || task.due_hint) {
        const dueDate = task.due || calculateDueDate(task.due_hint);
        if (dueDate) {
          taskProperties['截止日期'] = {
            date: { start: dueDate }
          };
        }
      }
      
      await notion.createPage(taskDb, taskProperties);
      console.log(`  ✅ 任务已创建: ${task.title} → ${task.assigneeRole}`);
    }
    
    return projectId;
  } catch (error) {
    console.error('创建项目和任务失败:', error);
    throw error;
  }
}

// 更新任务或项目状态
async function updateTaskStatus(taskName, status, username) {
  // 正确的数据库列表：
  // 1. 任务库：通用任务库 + BB House任务库
  // 2. 项目库：通用项目库 + LaPure项目库
  
  // 先尝试在任务库中查找
  const taskDbs = [
    { id: process.env.NOTION_TASK_DB_ID, name: '通用任务库', type: 'task' },
    { id: process.env.NOTION_DB_BBHOUSE, name: 'BB House任务库', type: 'task' }
  ].filter(db => db.id && db.id !== 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  
  for (const db of taskDbs) {
    try {
      // 查询匹配的任务
      const filter = {
        and: [
          {
            property: '任务名称',
            title: { contains: taskName }
          },
          {
            property: '状态',
            select: { does_not_equal: '完成' }
          }
        ]
      };
      
      const tasks = await notion.queryDatabase(db.id, filter);
      
      if (tasks.length > 0) {
        // 更新第一个匹配的任务
        const taskId = tasks[0].id;
        await notion.updatePage(taskId, {
          '状态': { select: { name: status } }
        });
        
        console.log(`✅ 任务状态已更新: ${taskName} → ${status}`);
        return true;
      }
    } catch (error) {
      // 静默处理，继续查找
    }
  }
  
  // 如果在任务库中没找到，尝试在项目库中查找
  const projectDbs = [
    { id: process.env.NOTION_PROJECT_DB_ID, name: '通用项目库', type: 'chinese' },
    { id: process.env.NOTION_DB_LAPURE, name: 'LaPure项目库', type: 'english' }
  ].filter(db => db.id && db.id !== 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  
  for (const db of projectDbs) {
    try {
      let filter;
      
      if (db.type === 'english') {
        // LaPure项目库使用英文属性
        filter = {
          and: [
            {
              property: 'Project name',
              title: { contains: taskName }
            },
            {
              property: 'Status',
              status: { does_not_equal: 'Done' }
            }
          ]
        };
      } else {
        // 通用项目库使用中文属性
        filter = {
          and: [
            {
              property: '项目名称',
              title: { contains: taskName }
            },
            {
              property: '状态',
              select: { does_not_equal: '完成' }
            }
          ]
        };
      }
      
      const projects = await notion.queryDatabase(db.id, filter);
      
      if (projects.length > 0) {
        // 更新第一个匹配的项目
        const projectId = projects[0].id;
        
        if (db.type === 'english') {
          // LaPure项目使用英文状态
          const englishStatus = status === '完成' ? 'Done' : 
                               status === '进行中' ? 'In progress' : 'Not started';
          await notion.updatePage(projectId, {
            'Status': { status: { name: englishStatus } }
          });
        } else {
          // 通用项目使用中文状态
          await notion.updatePage(projectId, {
            '状态': { select: { name: status } }
          });
        }
        
        console.log(`✅ 项目状态已更新: ${taskName} → ${status}`);
        return true;
      }
    } catch (error) {
      // 静默处理，继续查找
    }
  }
  
  console.log(`⚠️ 未找到任务或项目: ${taskName}`);
  return false;
}

// 创建阻碍记录
async function createObstacle({ taskName, description, username }) {
  const obstacleDb = process.env.NOTION_OBSTACLE_DB_ID;
  
  if (!obstacleDb || obstacleDb === 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
    console.error('阻碍数据库ID未配置');
    return null;
  }
  
  try {
    const properties = {
      '阻碍描述': {
        title: [{ text: { content: `${taskName}: ${description}` } }]
      },
      '负责人': {
        rich_text: [{ text: { content: username } }]
      },
      '状态': {
        select: { name: '待解决' }
      },
      '创建日期': {
        date: { start: new Date().toISOString() }
      }
    };
    
    const obstacleId = await notion.createPage(obstacleDb, properties);
    console.log(`✅ 阻碍已记录: ${taskName}`);
    return obstacleId;
  } catch (error) {
    console.error('创建阻碍记录失败:', error);
    return null;
  }
}

// 列出所有未完成的任务
async function listPendingTasks() {
  const taskList = [];
  
  // 查询任务数据库
  const taskDbs = [
    { id: process.env.NOTION_TASK_DB_ID, name: '通用任务', type: 'chinese' },
    { id: process.env.NOTION_DB_BBHOUSE, name: 'BB House任务', type: 'chinese' }
  ].filter(db => db.id && db.id !== 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  
  for (const db of taskDbs) {
    try {
      // 查询未完成的任务
      const filter = {
        and: [
          {
            property: '状态',
            select: { does_not_equal: '完成' }
          },
          {
            property: '状态',
            select: { does_not_equal: '已完成' }
          }
        ]
      };
      
      const results = await notion.queryDatabase(db.id, filter);
      
      for (const page of results) {
        const title = page.properties['任务名称']?.title?.[0]?.plain_text || '无标题';
        const status = page.properties['状态']?.select?.name || '未完成';
        const assignee = page.properties['负责人']?.rich_text?.[0]?.plain_text || '未分配';
        const dueDate = page.properties['截止日期']?.date?.start;
        const priority = page.properties['优先级']?.select?.name || '中';
        const createdDate = new Date(page.created_time).toLocaleDateString('zh-CN');
        
        // 过滤掉测试数据
        if (!title.includes('TEST') && !title.includes('DEMO') && !title.includes('测试')) {
          // 计算是否逾期
          let isOverdue = false;
          let dueDateStr = '无期限';
          if (dueDate) {
            const due = new Date(dueDate);
            const today = new Date();
            isOverdue = due < today;
            dueDateStr = due.toLocaleDateString('zh-CN');
          }
          
          taskList.push({
            title,
            status,
            assignee,
            priority,
            dueDate: dueDateStr,
            isOverdue,
            createdDate,
            source: db.name
          });
        }
      }
    } catch (error) {
      console.error(`查询${db.name}失败:`, error.message);
    }
  }
  
  // 按优先级和截止日期排序
  taskList.sort((a, b) => {
    // 逾期的排在前面
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    
    // 按优先级排序
    const priorityOrder = { '高': 0, '中': 1, '低': 2 };
    const aPriority = priorityOrder[a.priority] ?? 1;
    const bPriority = priorityOrder[b.priority] ?? 1;
    
    return aPriority - bPriority;
  });
  
  return taskList;
}

// 列出所有项目详情
async function listAllProjects() {
  const projectList = [];
  
  // 查询项目数据库
  const projectDbs = [
    { id: process.env.NOTION_PROJECT_DB_ID, name: '通用项目', type: 'chinese' },
    { id: process.env.NOTION_DB_LAPURE, name: 'LaPure项目', type: 'english' }
  ].filter(db => db.id && db.id !== 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  
  for (const db of projectDbs) {
    try {
      const results = await notion.queryDatabase(db.id);
      
      for (const page of results) {
        let title, status, createdDate;
        
        if (db.type === 'english') {
          // LaPure项目库使用英文属性
          title = page.properties['Project name']?.title?.[0]?.plain_text || '无标题';
          status = page.properties.Status?.status?.name || 
                  page.properties.Status?.select?.name || 'Not started';
        } else {
          // 通用项目库使用中文属性
          title = page.properties['项目名称']?.title?.[0]?.plain_text || '无标题';
          status = page.properties['状态']?.select?.name || '未完成';
        }
        
        createdDate = new Date(page.created_time).toLocaleDateString('zh-CN');
        
        // 过滤掉测试数据
        if (!title.includes('TEST') && !title.includes('DEMO')) {
          projectList.push({
            title,
            status,
            createdDate,
            source: db.name
          });
        }
      }
    } catch (error) {
      console.error(`查询${db.name}失败:`, error.message);
    }
  }
  
  return projectList;
}

// 生成进度报告（过滤测试数据）
async function generateProgressReport() {
  const report = {
    projects: { active: 0, completed: 0 },
    tasks: { pending: 0, needHelp: 0, completed: 0 },
    obstacles: { open: 0 }
  };
  
  // 正确的数据库配置：
  // - 通用项目库：包含Salon和BB House的项目
  // - LaPure项目库：包含LaPure的项目
  // - 通用任务库：包含Salon和LaPure的任务
  // - BB House任务库：包含BB House的任务
  
  // 1. 查询项目数据库
  const projectDbs = [
    { id: process.env.NOTION_PROJECT_DB_ID, name: '通用项目库' },
    { id: process.env.NOTION_DB_LAPURE, name: 'LaPure项目库' }
  ].filter(db => db.id && db.id !== 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  
  for (const db of projectDbs) {
    try {
      const results = await notion.queryDatabase(db.id);
      
      for (const page of results) {
        // 根据不同数据库使用不同的属性名
        let status, title;
        if (db.name === 'LaPure项目库') {
          // LaPure使用英文Status
          title = page.properties['Project name']?.title?.[0]?.plain_text || '';
          status = page.properties.Status?.status?.name || 
                  page.properties.Status?.select?.name || 'Not started';
        } else {
          // 通用项目库使用中文状态
          title = page.properties['项目名称']?.title?.[0]?.plain_text || '';
          status = page.properties['状态']?.select?.name || '未完成';
        }
        
        // 过滤掉测试数据
        if (title.includes('TEST') || title.includes('DEMO')) {
          continue;
        }
        
        // 统计项目
        if (status === '完成' || status === 'Done' || status === 'Complete') {
          report.projects.completed++;
        } else {
          report.projects.active++;
        }
      }
    } catch (error) {
      console.error(`查询${db.name}失败:`, error.message);
    }
  }
  
  // 2. 查询任务数据库
  const taskDbs = [
    { id: process.env.NOTION_TASK_DB_ID, name: '通用任务库' },
    { id: process.env.NOTION_DB_BBHOUSE, name: 'BB House任务库' }
  ].filter(db => db.id && db.id !== 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  
  for (const db of taskDbs) {
    try {
      const results = await notion.queryDatabase(db.id);
      
      for (const page of results) {
        // 任务都使用中文状态
        const title = page.properties['任务名称']?.title?.[0]?.plain_text || '';
        const status = page.properties['状态']?.select?.name || '未完成';
        
        // 过滤掉测试数据
        if (title.includes('TEST') || title.includes('DEMO') || title.includes('测试')) {
          continue;
        }
        
        // 统计任务
        if (status === '完成' || status === '已完成') {
          report.tasks.completed++;
        } else if (status === '需协助' || status === '阻塞') {
          report.tasks.needHelp++;
        } else {
          report.tasks.pending++;
        }
      }
    } catch (error) {
      console.error(`查询${db.name}失败:`, error.message);
    }
  }
  
  // 查询阻碍
  const obstacleDb = process.env.NOTION_OBSTACLE_DB_ID;
  if (obstacleDb && obstacleDb !== 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
    try {
      const obstacles = await notion.queryDatabase(obstacleDb, {
        and: [{
          property: '状态',
          select: { equals: '待解决' }
        }]
      });
      report.obstacles.open = obstacles.length;
    } catch (error) {
      console.error('查询阻碍失败:', error.message);
    }
  }
  
  return report;
}

// 辅助函数：解析截止日期
function calculateDueDate(dueHint) {
  if (!dueHint) return null;
  
  const today = new Date();
  const match = dueHint.match(/(\d+)/);
  
  if (match) {
    const days = parseInt(match[1]);
    const dueDate = new Date(today);
    dueDate.setDate(today.getDate() + days);
    return dueDate.toISOString();
  }
  
  return null;
}

module.exports = {
  createProjectWithTasks,
  updateTaskStatus,
  createObstacle,
  generateProgressReport,
  listAllProjects,
  listPendingTasks,
  notion
};