# 音频资源快速开始

## 🚀 三步快速开始

### 步骤 1: 选择方式

选择以下三种方式之一获取音频：

#### 方式 A: 使用免费资源（推荐）⭐
- 访问 [OpenGameArt.org](https://opengameart.org/)
- 搜索 "8-bit music" 和 "8-bit sound effects"
- 下载并放入对应目录

#### 方式 B: 生成音频
- 音乐: [BeepBox](https://www.beepbox.co/)
- 音效: [JFXR](https://jfxr.frozenfractal.com/)
- 导出并转换为 MP3

#### 方式 C: 使用占位符（开发测试）
```bash
npm run audio:placeholder
```

### 步骤 2: 优化音频

如果使用方式 A 或 B，需要优化音频：

**Linux/Mac**:
```bash
./scripts/optimize-audio.sh ./raw-audio ./public/audio
```

**Windows**:
```cmd
scripts\optimize-audio.bat .\raw-audio .\public\audio
```

### 步骤 3: 测试

```bash
npm run dev
```

在游戏中测试所有音频是否正常播放。

## 📋 需要的文件

### 背景音乐（7 个）
- `music/stage1.mp3` - 第一关
- `music/stage1_boss.mp3` - 第一关 BOSS
- `music/stage2.mp3` - 第二关
- `music/stage2_boss.mp3` - 第二关 BOSS
- `music/stage3.mp3` - 第三关
- `music/final_boss.mp3` - 最终 BOSS
- `music/victory.mp3` - 通关

### 音效（16 个）
- `sfx/player_gun_fire.mp3` - 玩家机炮
- `sfx/player_missile_fire.mp3` - 玩家导弹
- `sfx/bullet_fly.mp3` - 子弹飞行
- `sfx/missile_fly.mp3` - 导弹飞行
- `sfx/bullet_hit.mp3` - 击中
- `sfx/missile_explode.mp3` - 导弹爆炸
- `sfx/enemy_explode.mp3` - 敌人爆炸
- `sfx/elite_explode.mp3` - 精英怪爆炸
- `sfx/stage_boss_explode.mp3` - BOSS 爆炸
- `sfx/final_boss_explode.mp3` - 最终 BOSS 爆炸
- `sfx/player_explode.mp3` - 玩家爆炸
- `sfx/balloon_pop.mp3` - 气球
- `sfx/banner_shake.mp3` - 横幅
- `sfx/cake_light.mp3` - 蛋糕
- `sfx/carpet_roll.mp3` - 红毯
- `sfx/firework_launch.mp3` - 礼花

## 🎯 音频规格

| 类型 | 格式 | 比特率 | 大小 | 时长 |
|------|------|--------|------|------|
| 音乐 | MP3 | 128kbps | < 1MB | 1-3分钟 |
| 音效 | MP3 | 128kbps | < 50KB | < 1秒 |

## 🔧 手动转换（FFmpeg）

### 音乐
```bash
ffmpeg -i input.wav -ac 2 -b:a 128k -af "loudnorm" output.mp3
```

### 音效
```bash
ffmpeg -i input.wav -ac 1 -b:a 128k -af "silenceremove=1:0:-50dB,loudnorm" output.mp3
```

## 📚 详细文档

- [完整指南](../../AUDIO_RESOURCES_GUIDE.md)
- [测试清单](../../AUDIO_TESTING_CHECKLIST.md)
- [总结文档](../../AUDIO_RESOURCES_SUMMARY.md)

## ❓ 常见问题

**Q: 音频无法播放？**
A: 检查文件路径、格式和浏览器控制台错误。

**Q: 音频延迟？**
A: 减小文件大小，使用预加载。

**Q: 音量不一致？**
A: 使用 FFmpeg 标准化音量。

**Q: 需要署名吗？**
A: 查看音频的许可协议，在 CREDITS.md 中记录。

## 🎵 推荐资源

- **音乐**: [OpenGameArt](https://opengameart.org/), [Incompetech](https://incompetech.com/)
- **音效**: [Freesound](https://freesound.org/), [Zapsplat](https://www.zapsplat.com/)
- **生成**: [BeepBox](https://www.beepbox.co/), [JFXR](https://jfxr.frozenfractal.com/)

---

**提示**: 开发阶段可以先使用占位符，后续再替换为实际音频。
