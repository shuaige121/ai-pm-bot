// test-voice.js
// 测试语音功能

const { textToSpeech } = require('./voice-service.js');
const fs = require('fs');
require('dotenv').config();

async function testVoiceFeatures() {
  console.log('🧪 测试语音功能');
  console.log('=' .repeat(60));
  
  // 检查OpenAI配置
  console.log('\n1️⃣ 检查配置...');
  if (process.env.OPENAI_API_KEY) {
    console.log('   ✅ OpenAI API密钥已配置');
    console.log('   支持功能：');
    console.log('   • 语音转文字（中文）');
    console.log('   • 文字转语音');
  } else {
    console.log('   ⚠️ 未配置OpenAI API密钥');
    console.log('   请在.env文件中添加：OPENAI_API_KEY=your_key');
    console.log('   获取密钥：https://platform.openai.com/api-keys');
  }
  
  // 测试文字转语音
  if (process.env.OPENAI_API_KEY) {
    console.log('\n2️⃣ 测试文字转语音...');
    
    const testTexts = [
      '您好，我是项目管理机器人',
      '任务已创建，请查看详情',
      '语音功能测试成功'
    ];
    
    for (const text of testTexts) {
      console.log(`   生成语音: "${text}"`);
      try {
        const audioPath = await textToSpeech(text);
        if (audioPath) {
          const stats = fs.statSync(audioPath);
          console.log(`   ✅ 生成成功: ${audioPath} (${stats.size} bytes)`);
          // 清理测试文件
          fs.unlinkSync(audioPath);
        }
      } catch (error) {
        console.log(`   ❌ 生成失败: ${error.message}`);
      }
    }
  }
  
  console.log('\n3️⃣ 语音功能使用说明：');
  console.log('   接收语音：');
  console.log('   1. 在Telegram中按住麦克风录音');
  console.log('   2. 机器人自动识别为中文');
  console.log('   3. 识别结果作为文字消息处理');
  console.log('   4. 支持所有文字命令功能');
  console.log();
  console.log('   发送语音：');
  console.log('   1. 设置 ENABLE_VOICE_REPLY=true');
  console.log('   2. 机器人回复时会同时发送语音');
  console.log('   3. 使用OpenAI TTS生成自然语音');
  
  console.log('\n4️⃣ 支持的语音命令示例：');
  console.log('   • "为办公室采购十台新电脑"');
  console.log('   • "每周五提交周报"');
  console.log('   • "有什么任务"');
  console.log('   • "周报完成了"');
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ 测试完成！');
}

testVoiceFeatures().catch(console.error);