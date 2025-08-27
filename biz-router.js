// biz-router.js
function pickBizDBIds(text) {
  const t = (text || '').toLowerCase();

  // 明确提到给租客或给某个店的采购
  const isForTenant = /给租客|为租客|租客需要|房客/.test(t);
  const isForSalon = /给.*店|为.*店|salon需要|理发店需要|美发店需要/.test(t);
  
  // BB House关键词（必须明确提到BB House或租赁相关）
  const isBB = /bb\s*house|租赁|房屋|poster\s*code|邮编/.test(t) || isForTenant;
  
  // Salon关键词（必须明确提到Salon或理发相关）
  const isSalon = /理发|美发|沙龙|发廊|门店|发型|染烫|salon/.test(t) && !isForTenant;
  
  // LaPure关键词
  const isLaPure = /lapure|护肤|护发|面膜|洗发|品牌|电商|海报|官网|小红书|tiktok/.test(t);
  
  // 办公室/采购相关（没有明确指定给谁的采购默认归LaPure）
  const isOfficeOrPurchase = /办公|订购|采购|买|购买|订|进货|补货|用品|物资|设备|耗材/.test(t);

  // 注意: 各业务数据库的schema不同
  // - Salon DB (f2663c0c) 是理发店信息库，不能用于项目管理
  // - BB House DB (259efdcd-10f5-8134) 是任务管理库，使用中文属性
  // - LaPure DB (238efdcd) 是项目库，使用英文属性
  // - 通用项目/任务库使用中文属性
  
  // 1. 明确提到BB House或给租客的
  if (isBB && !isForSalon) {
    return { 
      projectDb: process.env.NOTION_PROJECT_DB_ID,  // 通用项目库（中文属性）
      taskDb: process.env.NOTION_DB_BBHOUSE         // BB House任务库（中文属性）
    };
  }
  
  // 2. 明确提到Salon或理发店的
  if (isSalon) {
    return { 
      projectDb: process.env.NOTION_PROJECT_DB_ID,  // 通用项目库（中文属性）
      taskDb: process.env.NOTION_TASK_DB_ID         // 通用任务库（中文属性）
    };
  }
  
  // 3. 明确提到LaPure或办公室采购（没指定给谁的采购默认归LaPure）
  if (isLaPure || (isOfficeOrPurchase && !isBB && !isSalon)) {
    return { 
      projectDb: process.env.NOTION_DB_LAPURE,      // LaPure项目库（英文属性）
      taskDb: process.env.NOTION_TASK_DB_ID         // 通用任务库（中文属性）
    };
  }

  // 4. 其他默认归LaPure（因为是主要业务）
  return { 
    projectDb: process.env.NOTION_DB_LAPURE,      // LaPure项目库（英文属性）
    taskDb: process.env.NOTION_TASK_DB_ID         // 通用任务库（中文属性）
  };
}

module.exports = {
  pickBizDBIds
};