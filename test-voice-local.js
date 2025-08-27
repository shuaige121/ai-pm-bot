// test-voice-local.js
// 测试本地语音功能（免费）

const { 
  textToSpeechLocal, 
  getChineseVoices,
  checkDependencies 
} = require('./voice-service-local.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function testLocalVoice() {
  console.log('🧪 测试本地语音功能（免费开源）');
  console.log('=' .repeat(60));
  
  // 1. 检查依赖
  console.log('\n1️⃣ 检查本地语音服务...');
  const deps = await checkDependencies();
  
  // 2. 测试不同的中文声音
  if (deps.edgeTTS) {
    console.log('\n2️⃣ 测试Edge-TTS中文语音...');
    console.log('   可用的中文声音：');
    
    const voices = getChineseVoices();
    voices.forEach(v => {
      console.log(`   • ${v.description} (${v.name})`);
    });
    
    console.log('\n3️⃣ 生成不同声音的语音示例...');
    
    const testText = '您好，我是项目管理助手，很高兴为您服务';
    const testVoices = [
      { name: 'zh-CN-XiaomengNeural', desc: '晓梦（甜美女声）' },
      { name: 'zh-CN-XiaoxiaoNeural', desc: '晓晓（温柔女声）' },
      { name: 'zh-CN-XiaohanNeural', desc: '晓涵（专业女声）' }
    ];
    
    for (const voice of testVoices) {
      console.log(`\n   测试 ${voice.desc}...`);
      try {
        const audioPath = await textToSpeechLocal(testText, voice.name);
        if (audioPath && fs.existsSync(audioPath)) {
          const stats = fs.statSync(audioPath);
          console.log(`   ✅ 生成成功: ${path.basename(audioPath)} (${stats.size} bytes)`);
          
          // 保留一个示例文件
          const samplePath = path.join(__dirname, 'temp', `sample_${voice.name}.mp3`);
          fs.renameSync(audioPath, samplePath);
          console.log(`   💾 示例保存到: ${samplePath}`);
        } else {
          console.log(`   ❌ 生成失败`);
        }
      } catch (error) {
        console.log(`   ❌ 错误: ${error.message}`);
      }
    }
  }
  
  console.log('\n4️⃣ 测试Whisper本地语音识别...');
  if (deps.whisper) {
    console.log('   ✅ Whisper已安装，支持中文语音识别');
    console.log('   模型位置: models/ggml-base.bin');
  } else {
    console.log('   ⚠️ Whisper未安装');
    console.log('   安装方法：');
    console.log('   brew install whisper-cpp');
    console.log('   然后下载模型：');
    console.log('   curl -L -o models/ggml-base.bin \\');
    console.log('     https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin');
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ 测试完成！');
  
  console.log('\n💡 使用说明：');
  console.log('1. 本地语音服务完全免费，无需API密钥');
  console.log('2. Edge-TTS提供高质量中文语音合成');
  console.log('3. Whisper本地模型支持准确的中文识别');
  console.log('4. 可以选择不同的声音风格（甜美/温柔/专业）');
  
  console.log('\n🎤 推荐配置：');
  console.log('在.env文件中添加：');
  console.log('ENABLE_VOICE_REPLY=true  # 启用语音回复');
  console.log('VOICE_CHARACTER=zh-CN-XiaomengNeural  # 使用甜美女声');
}

testLocalVoice().catch(console.error);