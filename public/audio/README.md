# 游戏音频资源目录

本目录包含彩蛋游戏 V2.0 的所有音频资源。

## 目录结构

```
audio/
├── music/           # 背景音乐（7 个文件）
└── sfx/             # 音效（16 个文件）
```

## 音频规格

- **格式**: MP3
- **比特率**: 128kbps
- **音乐文件大小**: < 1 MB
- **音效文件大小**: < 50 KB

## 获取音频资源

请参考项目根目录的 `AUDIO_RESOURCES_GUIDE.md` 文件，了解如何获取或创建音频资源。

## 快速开始

### 选项 1: 使用免费资源

1. 访问 [OpenGameArt.org](https://opengameart.org/)
2. 搜索 "8-bit music" 和 "8-bit sound effects"
3. 下载并转换为 MP3 格式（128kbps）
4. 放入对应的 `music/` 或 `sfx/` 目录

### 选项 2: 生成音频

1. 使用 [BeepBox](https://www.beepbox.co/) 生成音乐
2. 使用 [JFXR](https://jfxr.frozenfractal.com/) 生成音效
3. 导出并转换为 MP3 格式
4. 放入对应目录

### 选项 3: 使用占位符（开发阶段）

在开发阶段，可以使用静音 MP3 文件作为占位符，确保游戏可以正常运行。

## 文件清单

### 背景音乐 (music/)

- [ ] `stage1.mp3` - 第一关音乐（轻快风格）
- [ ] `stage1_boss.mp3` - 第一关 BOSS 音乐
- [ ] `stage2.mp3` - 第二关音乐（紧张风格）
- [ ] `stage2_boss.mp3` - 第二关 BOSS 音乐
- [ ] `stage3.mp3` - 第三关音乐（史诗风格）
- [ ] `final_boss.mp3` - 最终 BOSS 音乐
- [ ] `victory.mp3` - 通关音乐（庆祝风格）

### 音效 (sfx/)

#### 武器音效
- [ ] `player_gun_fire.mp3` - 玩家机炮发射
- [ ] `player_missile_fire.mp3` - 玩家导弹发射
- [ ] `bullet_fly.mp3` - 机炮飞行
- [ ] `missile_fly.mp3` - 导弹飞行
- [ ] `bullet_hit.mp3` - 机炮击中
- [ ] `missile_explode.mp3` - 导弹爆炸

#### 爆炸音效
- [ ] `enemy_explode.mp3` - 普通敌人爆炸
- [ ] `elite_explode.mp3` - 精英怪爆炸
- [ ] `stage_boss_explode.mp3` - 关底 BOSS 爆炸
- [ ] `final_boss_explode.mp3` - 最终 BOSS 爆炸
- [ ] `player_explode.mp3` - 玩家爆炸

#### 庆祝页面音效
- [ ] `balloon_pop.mp3` - 气球爆炸
- [ ] `banner_shake.mp3` - 横幅晃动
- [ ] `cake_light.mp3` - 蛋糕点亮
- [ ] `carpet_roll.mp3` - 红毯铺开
- [ ] `firework_launch.mp3` - 礼花发射

## 许可协议

请确保所有使用的音频资源符合其许可协议要求。如果使用需要署名的资源，请在项目的 CREDITS.md 文件中注明。

## 测试

完成音频文件准备后，运行游戏并测试：

1. 背景音乐是否正常播放和切换
2. 音效是否在正确的时机触发
3. 音量是否合适
4. 音乐循环是否流畅

## 故障排除

如果遇到音频播放问题，请检查：

1. 文件路径和文件名是否正确
2. 文件格式是否为 MP3
3. 浏览器控制台是否有错误信息
4. 浏览器是否支持自动播放（可能需要用户交互）

---

**注意**: 本目录中的音频文件不应提交到 Git 仓库（已在 .gitignore 中配置）。每个开发者需要自行获取或生成音频资源。
