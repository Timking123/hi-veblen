/**
 * 生成占位符音频文件
 * 
 * 此脚本生成静音的 MP3 文件作为占位符，用于开发阶段。
 * 实际音频资源应该从免费资源网站获取或使用音频生成工具创建。
 * 
 * 使用方法:
 * node scripts/generate-placeholder-audio.js
 * 
 * 注意: 需要安装 ffmpeg
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 检查 ffmpeg 是否安装
function checkFFmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// 创建目录
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✓ 创建目录: ${dir}`);
  }
}

// 生成静音音频文件
function generateSilentAudio(outputPath, duration) {
  const command = `ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t ${duration} -b:a 128k -y "${outputPath}"`;
  
  try {
    execSync(command, { stdio: 'ignore' });
    console.log(`✓ 生成: ${path.basename(outputPath)}`);
    return true;
  } catch (error) {
    console.error(`✗ 失败: ${path.basename(outputPath)}`);
    return false;
  }
}

// 音频文件配置
const audioFiles = {
  music: [
    { name: 'stage1.mp3', duration: 60 },
    { name: 'stage1_boss.mp3', duration: 60 },
    { name: 'stage2.mp3', duration: 60 },
    { name: 'stage2_boss.mp3', duration: 60 },
    { name: 'stage3.mp3', duration: 60 },
    { name: 'final_boss.mp3', duration: 90 },
    { name: 'victory.mp3', duration: 30 }
  ],
  sfx: [
    // 武器音效
    { name: 'player_gun_fire.mp3', duration: 0.2 },
    { name: 'player_missile_fire.mp3', duration: 0.3 },
    { name: 'bullet_fly.mp3', duration: 0.15 },
    { name: 'missile_fly.mp3', duration: 0.3 },
    { name: 'bullet_hit.mp3', duration: 0.15 },
    { name: 'missile_explode.mp3', duration: 0.4 },
    // 爆炸音效
    { name: 'enemy_explode.mp3', duration: 0.3 },
    { name: 'elite_explode.mp3', duration: 0.4 },
    { name: 'stage_boss_explode.mp3', duration: 0.6 },
    { name: 'final_boss_explode.mp3', duration: 1.0 },
    { name: 'player_explode.mp3', duration: 0.6 },
    // 庆祝页面音效
    { name: 'balloon_pop.mp3', duration: 0.15 },
    { name: 'banner_shake.mp3', duration: 0.3 },
    { name: 'cake_light.mp3', duration: 0.3 },
    { name: 'carpet_roll.mp3', duration: 0.4 },
    { name: 'firework_launch.mp3', duration: 0.7 }
  ]
};

// 主函数
function main() {
  console.log('=================================');
  console.log('生成占位符音频文件');
  console.log('=================================\n');

  // 检查 ffmpeg
  if (!checkFFmpeg()) {
    console.error('错误: 未找到 ffmpeg');
    console.error('请先安装 ffmpeg: https://ffmpeg.org/download.html');
    process.exit(1);
  }

  console.log('✓ 检测到 ffmpeg\n');

  // 创建目录
  const baseDir = path.join(__dirname, '..', 'public', 'audio');
  const musicDir = path.join(baseDir, 'music');
  const sfxDir = path.join(baseDir, 'sfx');

  ensureDir(musicDir);
  ensureDir(sfxDir);
  console.log('');

  // 生成背景音乐
  console.log('生成背景音乐 (7 个文件)...');
  let successCount = 0;
  let totalCount = 0;

  for (const file of audioFiles.music) {
    const outputPath = path.join(musicDir, file.name);
    totalCount++;
    if (generateSilentAudio(outputPath, file.duration)) {
      successCount++;
    }
  }

  console.log('');

  // 生成音效
  console.log('生成音效 (16 个文件)...');
  for (const file of audioFiles.sfx) {
    const outputPath = path.join(sfxDir, file.name);
    totalCount++;
    if (generateSilentAudio(outputPath, file.duration)) {
      successCount++;
    }
  }

  console.log('');
  console.log('=================================');
  console.log(`完成: ${successCount}/${totalCount} 个文件`);
  console.log('=================================\n');

  console.log('注意事项:');
  console.log('1. 这些是静音占位符文件，仅用于开发测试');
  console.log('2. 请参考 AUDIO_RESOURCES_GUIDE.md 获取实际音频资源');
  console.log('3. 实际音频应该从免费资源网站下载或使用工具生成');
  console.log('4. 替换占位符文件时，确保文件名和格式正确\n');
}

// 运行
main();
