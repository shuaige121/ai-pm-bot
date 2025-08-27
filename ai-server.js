// ai-server.js
// 本地AI服务器 - 接收任务并返回拆解结果

const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.AI_SERVER_PORT || 3001;

// 任务拆解端点
app.post('/breakdown', (req, res) => {
    const { task } = req.body;
    
    if (!task) {
        return res.status(400).json({ error: '缺少任务描述' });
    }
    
    console.log('📥 收到任务:', task);
    
    // 智能拆解逻辑
    const result = intelligentBreakdown(task);
    
    console.log('📤 返回拆解结果:', result.project_title);
    
    res.json(result);
});

// 智能拆解函数（可以根据需要增强）
function intelligentBreakdown(taskText) {
    const lowerText = taskText.toLowerCase();
    const tasks = [];
    let projectTitle = taskText.substring(0, 50);
    
    // 根据关键词进行智能拆解
    if (lowerText.includes('网站') || lowerText.includes('website')) {
        projectTitle = '网站开发项目';
        tasks.push(
            { title: '需求分析和原型设计', details: '确定网站功能和界面设计', due_hint: '2天' },
            { title: '前端开发', details: '实现用户界面和交互', due_hint: '5天' },
            { title: '后端开发', details: '实现服务器逻辑和数据库', due_hint: '5天' },
            { title: '测试和部署', details: '完成测试并上线', due_hint: '2天' }
        );
    } else if (lowerText.includes('app') || lowerText.includes('应用')) {
        projectTitle = 'APP开发项目';
        tasks.push(
            { title: 'UI/UX设计', details: '设计应用界面和用户体验', due_hint: '3天' },
            { title: '功能开发', details: '实现核心功能模块', due_hint: '7天' },
            { title: '接口对接', details: '完成前后端接口集成', due_hint: '3天' },
            { title: '测试发布', details: '测试并发布到应用商店', due_hint: '2天' }
        );
    } else if (lowerText.includes('营销') || lowerText.includes('推广') || lowerText.includes('marketing')) {
        projectTitle = '营销推广项目';
        tasks.push(
            { title: '市场调研', details: '分析目标用户和竞品', due_hint: '2天' },
            { title: '策略制定', details: '制定营销策略和计划', due_hint: '2天' },
            { title: '内容创作', details: '制作营销素材和文案', due_hint: '3天' },
            { title: '渠道投放', details: '在各平台执行推广', due_hint: '5天' },
            { title: '效果分析', details: '收集数据并优化', due_hint: '2天' }
        );
    } else if (lowerText.includes('活动') || lowerText.includes('event')) {
        projectTitle = '活动策划项目';
        tasks.push(
            { title: '活动策划', details: '确定活动主题和流程', due_hint: '2天' },
            { title: '场地和物料准备', details: '预定场地，准备物料', due_hint: '3天' },
            { title: '嘉宾邀请', details: '邀请和确认参与人员', due_hint: '3天' },
            { title: '活动执行', details: '现场执行和协调', due_hint: '1天' },
            { title: '活动总结', details: '整理反馈和复盘', due_hint: '1天' }
        );
    } else if (lowerText.includes('培训') || lowerText.includes('training')) {
        projectTitle = '培训项目';
        tasks.push(
            { title: '培训需求分析', details: '调研培训需求和目标', due_hint: '2天' },
            { title: '课程设计', details: '设计培训大纲和内容', due_hint: '3天' },
            { title: '材料准备', details: '制作培训PPT和资料', due_hint: '2天' },
            { title: '培训实施', details: '进行培训授课', due_hint: '2天' },
            { title: '效果评估', details: '收集反馈并改进', due_hint: '1天' }
        );
    } else if (lowerText.includes('招聘') || lowerText.includes('recruitment')) {
        projectTitle = '招聘项目';
        tasks.push(
            { title: '需求确认', details: '明确岗位要求和数量', due_hint: '1天' },
            { title: '发布招聘信息', details: '在各渠道发布职位', due_hint: '1天' },
            { title: '简历筛选', details: '筛选合适的候选人', due_hint: '3天' },
            { title: '面试安排', details: '组织面试和评估', due_hint: '5天' },
            { title: 'Offer和入职', details: '发送offer并安排入职', due_hint: '2天' }
        );
    } else if (lowerText.includes('装修') || lowerText.includes('renovation')) {
        projectTitle = '装修改造项目';
        tasks.push(
            { title: '设计方案', details: '确定装修风格和布局', due_hint: '3天' },
            { title: '预算报价', details: '制定装修预算清单', due_hint: '2天' },
            { title: '材料采购', details: '采购装修材料', due_hint: '3天' },
            { title: '施工执行', details: '进行装修施工', due_hint: '10天' },
            { title: '验收整改', details: '检查质量并整改', due_hint: '2天' }
        );
    } else if (lowerText.includes('产品') || lowerText.includes('product')) {
        projectTitle = '产品开发项目';
        tasks.push(
            { title: '市场调研', details: '分析市场需求和竞品', due_hint: '3天' },
            { title: '产品设计', details: '设计产品功能和规格', due_hint: '3天' },
            { title: '原型制作', details: '制作产品原型', due_hint: '5天' },
            { title: '用户测试', details: '进行用户测试和反馈', due_hint: '3天' },
            { title: '批量生产', details: '安排批量生产', due_hint: '7天' }
        );
    } else {
        // 通用拆解
        projectTitle = taskText.length > 50 ? taskText.substring(0, 47) + '...' : taskText;
        tasks.push(
            { title: '需求分析', details: '明确具体需求和目标', due_hint: '1天' },
            { title: '方案设计', details: '制定实施方案', due_hint: '2天' },
            { title: '资源准备', details: '准备所需资源和材料', due_hint: '2天' },
            { title: '执行实施', details: '按计划执行任务', due_hint: '3天' },
            { title: '验收交付', details: '检查质量并交付成果', due_hint: '1天' }
        );
    }
    
    return {
        project_title: projectTitle,
        tasks: tasks
    };
}

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'AI服务器运行中' });
});

app.listen(PORT, () => {
    console.log(`🧠 AI服务器启动在端口 ${PORT}`);
    console.log(`📡 任务拆解API: http://localhost:${PORT}/breakdown`);
    console.log(`💚 健康检查: http://localhost:${PORT}/health`);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n👋 AI服务器关闭');
    process.exit(0);
});