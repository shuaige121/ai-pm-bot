// role-router.js
const KEYWORDS = {
  joe: [
    '批准', '批复', '审批', '签批',
    '付款', '付钱', '打款', '转账', '支付', '付费', '报销', '请款',
    'invoice', '发票', 'bill', '账单',
    'payment', 'pay', 'transfer', 'remit', 'reimburse'
  ],
  guo: [
    '直播', '带货', '开播', '连麦', '脚本', '直播间', '投流', '达人'
  ],
  designer: [
    '设计', '海报', 'logo', 'vi', '版式', '官网', '落地页',
    '视觉', '素材', '修图', '排版', 'ui', '视频剪辑', '封面'
  ],
  admin: [
    '网', '宽带', 'wifi', '安装', '开户', '合同', '登记',
    '接待', '安排', '采购', '寄送', '收据', '发票登记', '收款',
    '对接', '走账', '授权', '预约', '跟进', '提交申请'
  ],
};

function pickAssignee(taskText) {
  const t = (taskText || '').toLowerCase();
  const hit = (bag) => bag.some(k => t.includes(k.toLowerCase()));
  if (hit(KEYWORDS.joe))      return 'joe';       // 新增：付款/批准类 → Joe
  if (hit(KEYWORDS.guo))      return 'guo';
  if (hit(KEYWORDS.designer)) return 'designer';
  return 'admin';
}

function mentionFor(role) {
  const map = {
    admin:    process.env.TG_USER_ADMIN,
    designer: process.env.TG_USER_DESIGNER,
    guo:      process.env.TG_USER_GUO,
    joe:      process.env.TG_USER_JOE,
  };
  const user = map[role];
  
  // 检查是否是有效的Telegram用户名（不能包含_username这种示例值）
  if (user && user.trim() && !user.includes('_username')) {
    return `@${user.trim()}`;
  }
  
  // 没有有效用户名时，用中文名兜底（不使用@符号避免解析错误）
  if (role === 'joe') return '老板Joe';
  if (role === 'guo') return '郭总';
  if (role === 'designer') return '设计师';
  return '管理员';
}

module.exports = {
  KEYWORDS,
  pickAssignee,
  mentionFor
};