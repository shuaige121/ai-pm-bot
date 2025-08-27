// test-all-features.js
// 完整测试所有功能

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { 
  processVoiceMessageLocal, 
  textToSpeechLocal,
  checkDependencies 
} = require('./voice-service-local.js');
const { listPendingTasks, listAllProjects } = require('./notion-service.js');
const { getAllRecurringTasks } = require('./recurring-tasks.js');
require('dotenv').config();

const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:3001';
const AI_SERVER_KEY = process.env.AI_SERVER_KEY || 'supersecret_please_change';

async function testAllFeatures() {
  console.log('🧪 完整功能测试');
  console.log('=' .repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  // 1. 测试AI服务器
  console.log('\n1️⃣ 测试AI服务器连接...');
  try {
    const response = await axios.get(`${AI_SERVER_URL}/health`, {
      headers: { 'x-api-key': AI_SERVER_KEY }
    });
    console.log('   ✅ AI服务器正常');
    passed++;
  } catch (error) {
    console.log('   ❌ AI服务器未启动');
    failed++;
  }
  
  // 2. 测试语音服务
  console.log('\n2️⃣ 测试语音服务...');
  const deps = await checkDependencies();
  
  if (deps.whisper) {
    console.log('   ✅ Whisper语音识别就绪');
    passed++;
  } else {
    console.log('   ❌ Whisper未安装');
    failed++;
  }
  
  // 3. 测试语音合成
  console.log('\n3️⃣ 测试语音合成（gTTS）...');
  try {
    const testText = '测试语音合成功能';
    const audioPath = await textToSpeechLocal(testText);
    if (audioPath && fs.existsSync(audioPath)) {
      const stats = fs.statSync(audioPath);
      console.log(`   ✅ 语音生成成功 (${stats.size} bytes)`);
      fs.unlinkSync(audioPath);
      passed++;
    } else {
      console.log('   ❌ 语音生成失败');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ gTTS错误:', error.message);
    failed++;
  }
  
  // 4. 测试任务意图识别
  console.log('\n4️⃣ 测试AI意图识别...');
  const testCases = [
    { text: '为办公室采购电脑', expected: 'task_new' },
    { text: '每周五提交周报', expected: 'recurring_task' },
    { text: '有什么任务', expected: 'list_tasks' },
    { text: '任务完成了', expected: 'task_done' }
  ];
  
  for (const test of testCases) {
    try {
      const response = await axios.post(
        `${AI_SERVER_URL}/breakdown`,
        { text: test.text, author: 'test' },
        { headers: { 'x-api-key': AI_SERVER_KEY } }
      );
      
      if (response.data.intent === test.expected) {
        console.log(`   ✅ "${test.text}" → ${test.expected}`);
        passed++;
      } else {
        console.log(`   ❌ "${test.text}" → ${response.data.intent} (期望: ${test.expected})`);
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ 测试失败: ${test.text}`);
      failed++;
    }
  }
  
  // 5. 测试Notion查询
  console.log('\n5️⃣ 测试Notion数据查询...');
  try {
    const tasks = await listPendingTasks();
    console.log(`   ✅ 查询待办任务: ${tasks.length} 个`);
    passed++;
  } catch (error) {
    console.log('   ❌ 查询任务失败:', error.message);
    failed++;
  }
  
  try {
    const projects = await listAllProjects();
    console.log(`   ✅ 查询项目: ${projects.length} 个`);
    passed++;
  } catch (error) {
    console.log('   ❌ 查询项目失败:', error.message);
    failed++;
  }
  
  // 6. 测试定时任务
  console.log('\n6️⃣ 测试定时任务...');
  try {
    const recurringTasks = getAllRecurringTasks();
    console.log(`   ✅ 定时任务: ${recurringTasks.length} 个`);
    passed++;
  } catch (error) {
    console.log('   ❌ 定时任务失败:', error.message);
    failed++;
  }
  
  // 7. 测试语音回复设置
  console.log('\n7️⃣ 测试语音回复设置...');
  if (process.env.ENABLE_VOICE_REPLY === 'true') {
    console.log('   ✅ 语音回复已启用（文字+语音）');
    passed++;
  } else {
    console.log('   ⚠️ 语音回复未启用');
  }
  
  // 总结
  console.log('\n' + '=' .repeat(60));
  console.log(`📊 测试结果: ${passed} 通过, ${failed} 失败`);
  
  if (failed === 0) {
    console.log('✅ 所有功能测试通过！');
  } else {
    console.log('⚠️ 部分功能需要检查');
  }
  
  console.log('\n💡 系统状态:');
  console.log('• AI服务器: ' + (failed === 0 ? '正常' : '需要检查'));
  console.log('• 语音识别: Whisper本地模型（免费）');
  console.log('• 语音合成: Google TTS（免费）');
  console.log('• API密钥: 不需要');
  console.log('• 任务确认: 需要用户确认才保存');
  console.log('• 定时任务: 支持每天/每周/每月');
}

testAllFeatures().catch(console.error);