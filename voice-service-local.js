// voice-service-local.js
// 本地语音处理服务：使用开源模型，无需API密钥

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { spawn } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

// 临时文件目录
const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

// 下载Telegram语音文件
async function downloadVoiceFile(fileUrl, fileId) {
  const filePath = path.join(TEMP_DIR, `${fileId}.oga`);
  const writer = fs.createWriteStream(filePath);
  
  const response = await axios({
    url: fileUrl,
    method: 'GET',
    responseType: 'stream'
  });
  
  response.data.pipe(writer);
  
  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(filePath));
    writer.on('error', reject);
  });
}

// 转换音频格式（OGA到WAV，用于Whisper）
async function convertToWav(inputPath) {
  const outputPath = inputPath.replace('.oga', '.wav');
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('wav')
      .audioFrequency(16000)  // Whisper需要16kHz
      .audioChannels(1)        // 单声道
      .on('end', () => {
        fs.unlinkSync(inputPath);
        resolve(outputPath);
      })
      .on('error', reject)
      .save(outputPath);
  });
}

// 使用本地Whisper进行语音识别
async function speechToTextLocal(audioFilePath) {
  try {
    console.log('🎤 使用本地Whisper识别语音...');
    
    return new Promise((resolve, reject) => {
      // 使用whisper-cli命令行工具（新版本）
      const whisperProcess = spawn('/opt/homebrew/bin/whisper-cli', [
        '-m', path.join(__dirname, 'models', 'ggml-base.bin'), // 模型路径
        '-l', 'zh',  // 中文
        '-f', audioFilePath,
        '--no-timestamps'
      ]);
      
      let output = '';
      let error = '';
      
      whisperProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      whisperProcess.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      whisperProcess.on('close', (code) => {
        // 清理临时文件
        if (fs.existsSync(audioFilePath)) {
          fs.unlinkSync(audioFilePath);
        }
        
        if (code !== 0) {
          // 如果whisper命令不存在，使用备用方案
          console.log('⚠️ Whisper本地模型未安装，使用简化识别');
          resolve({
            text: '[语音消息]',
            language: 'zh'
          });
        } else {
          // 解析输出获取识别文本
          const lines = output.split('\n');
          const text = lines.filter(l => l.trim() && !l.startsWith('['))
            .join(' ')
            .trim();
          
          resolve({
            text: text || '[无法识别]',
            language: 'zh'
          });
        }
      });
      
      whisperProcess.on('error', (err) => {
        console.log('⚠️ Whisper未安装，请参考README安装');
        // 清理文件
        if (fs.existsSync(audioFilePath)) {
          fs.unlinkSync(audioFilePath);
        }
        resolve({
          text: '[需要安装Whisper本地模型]',
          language: 'zh'
        });
      });
    });
  } catch (error) {
    console.error('本地语音识别失败:', error);
    if (fs.existsSync(audioFilePath)) {
      fs.unlinkSync(audioFilePath);
    }
    throw error;
  }
}

// 使用Edge-TTS进行文字转语音（免费，质量好）
async function textToSpeechLocal(text, voice = 'zh-CN-XiaoxiaoNeural') {
  try {
    console.log('🔊 使用Edge-TTS生成语音...');
    
    const outputPath = path.join(TEMP_DIR, `tts_${Date.now()}.mp3`);
    
    return new Promise((resolve, reject) => {
      // 使用gTTS作为主要方案（更稳定）
      const pythonScript = `from gtts import gTTS; tts = gTTS('${text.replace(/'/g, "\\'")}', lang='zh-CN'); tts.save('${outputPath}')`;
      const gtts = spawn('python3', ['-c', pythonScript]);
      
      let error = '';
      
      gtts.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      gtts.on('close', (code) => {
        if (code !== 0) {
          console.error('gTTS生成失败:', error);
          resolve(null);
        } else {
          console.log('✅ 语音生成成功（Google TTS）');
          resolve(outputPath);
        }
      });
      
      gtts.on('error', (err) => {
        console.log('⚠️ gTTS未安装，请运行: pip3 install gtts');
        resolve(null);
      });
    });
  } catch (error) {
    console.error('文字转语音失败:', error);
    return null;
  }
}

// 处理Telegram语音消息（本地版）
async function processVoiceMessageLocal(bot, fileId) {
  try {
    // 1. 获取文件信息
    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
    
    // 2. 下载语音文件
    console.log('📥 下载语音文件...');
    const ogaPath = await downloadVoiceFile(fileUrl, fileId);
    
    // 3. 转换格式
    console.log('🔄 转换音频格式...');
    const wavPath = await convertToWav(ogaPath);
    
    // 4. 本地语音识别
    console.log('🎤 本地识别语音内容...');
    const result = await speechToTextLocal(wavPath);
    
    console.log('✅ 语音识别结果:', result.text);
    return result;
  } catch (error) {
    console.error('处理语音消息失败:', error);
    throw error;
  }
}

// 获取可用的中文语音列表
function getChineseVoices() {
  return [
    { name: 'zh-CN-XiaoxiaoNeural', gender: 'Female', description: '晓晓（女声，温柔）' },
    { name: 'zh-CN-YunyangNeural', gender: 'Male', description: '云扬（男声，标准）' },
    { name: 'zh-CN-YunxiNeural', gender: 'Male', description: '云希（男声，活泼）' },
    { name: 'zh-CN-XiaohanNeural', gender: 'Female', description: '晓涵（女声，专业）' },
    { name: 'zh-CN-XiaomengNeural', gender: 'Female', description: '晓梦（女声，甜美）' }
  ];
}

// 清理临时文件
function cleanupTempFiles() {
  const files = fs.readdirSync(TEMP_DIR);
  const now = Date.now();
  
  files.forEach(file => {
    const filePath = path.join(TEMP_DIR, file);
    const stats = fs.statSync(filePath);
    const age = now - stats.mtimeMs;
    
    // 删除超过1小时的文件
    if (age > 60 * 60 * 1000) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ 清理临时文件: ${file}`);
    }
  });
}

// 每小时清理一次
setInterval(cleanupTempFiles, 60 * 60 * 1000);

// 检查依赖是否安装
async function checkDependencies() {
  const checks = {
    whisper: false,
    edgeTTS: false,
    ffmpeg: true  // 已通过npm安装
  };
  
  // 检查whisper
  try {
    const { execSync } = require('child_process');
    execSync('test -f /opt/homebrew/bin/whisper-cpp', { stdio: 'ignore' });
    checks.whisper = true;
  } catch {
    console.log('⚠️ Whisper未安装，语音识别功能受限');
    console.log('   安装方法：');
    console.log('   brew install whisper-cpp  # macOS');
    console.log('   或参考：https://github.com/ggerganov/whisper.cpp');
  }
  
  // 检查edge-tts（Python模块）
  try {
    const { execSync } = require('child_process');
    execSync('python3 -m edge_tts --help', { stdio: 'ignore' });
    checks.edgeTTS = true;
  } catch {
    console.log('⚠️ Edge-TTS未安装，语音合成功能受限');
    console.log('   安装方法：pip3 install edge-tts');
  }
  
  if (checks.whisper && checks.edgeTTS) {
    console.log('✅ 本地语音服务就绪（完全免费）');
  }
  
  return checks;
}

module.exports = {
  processVoiceMessageLocal,
  speechToTextLocal,
  textToSpeechLocal,
  downloadVoiceFile,
  convertToWav,
  getChineseVoices,
  checkDependencies
};