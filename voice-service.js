// voice-service.js
// 语音处理服务：语音转文字、文字转语音

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

// 初始化OpenAI（用于语音识别和生成）
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log('✅ OpenAI语音服务已启用');
} else {
  console.log('⚠️ 未配置OpenAI API密钥，语音功能受限');
}

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

// 转换OGA到MP3（OpenAI需要MP3格式）
async function convertToMp3(inputPath) {
  const outputPath = inputPath.replace('.oga', '.mp3');
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('mp3')
      .on('end', () => {
        // 删除原始文件
        fs.unlinkSync(inputPath);
        resolve(outputPath);
      })
      .on('error', reject)
      .save(outputPath);
  });
}

// 语音转文字（使用OpenAI Whisper）
async function speechToText(audioFilePath) {
  try {
    // 如果没有OpenAI API密钥，使用备选方案
    if (!openai) {
      console.log('⚠️ 未配置OpenAI API密钥，使用模拟识别');
      // 清理文件
      if (fs.existsSync(audioFilePath)) {
        fs.unlinkSync(audioFilePath);
      }
      return {
        text: '[语音消息 - 需要配置OpenAI API来识别]',
        language: 'zh'
      };
    }
    
    const audioFile = fs.createReadStream(audioFilePath);
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'zh', // 指定中文
      response_format: 'json'
    });
    
    // 清理临时文件
    fs.unlinkSync(audioFilePath);
    
    return {
      text: transcription.text,
      language: 'zh'
    };
  } catch (error) {
    console.error('语音识别失败:', error.message);
    
    // 清理临时文件
    if (fs.existsSync(audioFilePath)) {
      fs.unlinkSync(audioFilePath);
    }
    
    throw error;
  }
}

// 文字转语音（使用OpenAI TTS）
async function textToSpeech(text, voice = 'nova') {
  try {
    // 如果没有OpenAI API密钥，返回null
    if (!openai) {
      console.log('⚠️ 未配置OpenAI API密钥，无法生成语音');
      return null;
    }
    
    // 生成语音
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice, // nova, alloy, echo, fable, onyx, shimmer
      input: text,
      speed: 1.0
    });
    
    // 保存到临时文件
    const buffer = Buffer.from(await mp3.arrayBuffer());
    const outputPath = path.join(TEMP_DIR, `tts_${Date.now()}.mp3`);
    fs.writeFileSync(outputPath, buffer);
    
    return outputPath;
  } catch (error) {
    console.error('文字转语音失败:', error.message);
    return null;
  }
}

// 处理Telegram语音消息
async function processVoiceMessage(bot, fileId) {
  try {
    // 1. 获取文件信息
    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
    
    // 2. 下载语音文件
    console.log('📥 下载语音文件...');
    const ogaPath = await downloadVoiceFile(fileUrl, fileId);
    
    // 3. 转换格式
    console.log('🔄 转换音频格式...');
    const mp3Path = await convertToMp3(ogaPath);
    
    // 4. 语音识别
    console.log('🎤 识别语音内容...');
    const result = await speechToText(mp3Path);
    
    console.log('✅ 语音识别结果:', result.text);
    return result;
  } catch (error) {
    console.error('处理语音消息失败:', error);
    throw error;
  }
}

// 清理临时文件（定期执行）
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

// 每小时清理一次临时文件
setInterval(cleanupTempFiles, 60 * 60 * 1000);

module.exports = {
  processVoiceMessage,
  speechToText,
  textToSpeech,
  downloadVoiceFile,
  convertToMp3
};