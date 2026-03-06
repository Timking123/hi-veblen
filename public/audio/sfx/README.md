# 游戏音效目录

本目录包含游戏的所有音效文件。

## 文件列表

### 武器音效

#### 1. player_gun_fire.mp3
- **用途**: 玩家机炮发射音效
- **时长**: 0.1-0.3 秒
- **特点**: 清脆的射击声，8-bit 风格

#### 2. player_missile_fire.mp3
- **用途**: 玩家导弹发射音效
- **时长**: 0.2-0.5 秒
- **特点**: 比机炮更重的发射声

#### 3. bullet_fly.mp3
- **用途**: 机炮飞行音效（可选）
- **时长**: 0.1-0.2 秒
- **特点**: 轻微的飞行音效

#### 4. missile_fly.mp3
- **用途**: 导弹飞行音效（可选）
- **时长**: 0.2-0.4 秒
- **特点**: 持续的飞行音效

#### 5. bullet_hit.mp3
- **用途**: 机炮击中音效
- **时长**: 0.1-0.2 秒
- **特点**: 击中目标的声音

#### 6. missile_explode.mp3
- **用途**: 导弹爆炸音效
- **时长**: 0.3-0.6 秒
- **特点**: 爆炸声，比普通击中更响亮

### 爆炸音效

#### 7. enemy_explode.mp3
- **用途**: 普通敌人爆炸音效
- **时长**: 0.2-0.4 秒
- **特点**: 小型爆炸声

#### 8. elite_explode.mp3
- **用途**: 精英怪爆炸音效
- **时长**: 0.3-0.5 秒
- **特点**: 中型爆炸声，比普通敌人更响

#### 9. stage_boss_explode.mp3
- **用途**: 关底 BOSS 爆炸音效
- **时长**: 0.5-0.8 秒
- **特点**: 大型爆炸声

#### 10. final_boss_explode.mp3
- **用途**: 最终 BOSS 爆炸音效
- **时长**: 0.8-1.2 秒
- **特点**: 超大型爆炸声，最震撼

#### 11. player_explode.mp3
- **用途**: 玩家爆炸音效
- **时长**: 0.5-0.8 秒
- **特点**: 玩家被击败的爆炸声

### 庆祝页面音效

#### 12. balloon_pop.mp3
- **用途**: 气球爆炸音效
- **时长**: 0.1-0.2 秒
- **特点**: 气球爆破的"啪"声

#### 13. banner_shake.mp3
- **用途**: 横幅晃动音效
- **时长**: 0.2-0.4 秒
- **特点**: 布料晃动的声音

#### 14. cake_light.mp3
- **用途**: 蛋糕点亮音效
- **时长**: 0.2-0.4 秒
- **特点**: 蜡烛点燃的声音

#### 15. carpet_roll.mp3
- **用途**: 红毯铺开音效
- **时长**: 0.3-0.6 秒
- **特点**: 地毯展开的声音

#### 16. firework_launch.mp3
- **用途**: 礼花发射音效
- **时长**: 0.5-1.0 秒
- **特点**: 烟花发射和爆炸的声音

## 音频规格

- **格式**: MP3
- **比特率**: 128kbps
- **采样率**: 44.1kHz
- **声道**: 单声道（推荐）或立体声
- **文件大小**: < 50 KB

## 获取资源

### 推荐网站

1. **Freesound** (https://freesound.org/)
   - 最大的免费音效库
   - 需要注册

2. **Zapsplat** (https://www.zapsplat.com/)
   - 大量免费音效
   - 高质量

3. **OpenGameArt** (https://opengameart.org/)
   - 游戏音效
   - 8-bit 音效丰富

### 生成工具

1. **JFXR** (https://jfxr.frozenfractal.com/)
   - 在线音效生成器
   - 专为游戏设计
   - 可生成 8-bit 音效

2. **BFXR** (https://www.bfxr.net/)
   - 经典音效生成器
   - 8-bit 风格

3. **ChipTone** (https://sfbgames.itch.io/chiptone)
   - 复古音效生成器
   - 多种预设

## 音效生成建议

### 使用 JFXR 生成音效

1. 访问 https://jfxr.frozenfractal.com/
2. 选择预设类型：
   - **Shoot**: 射击音效
   - **Explosion**: 爆炸音效
   - **Hit**: 击中音效
   - **Pickup**: 拾取音效
3. 调整参数
4. 导出为 WAV
5. 使用 FFmpeg 转换为 MP3

### 音效参数建议

**射击音效**:
- Wave Type: Square
- Attack: 0.01
- Sustain: 0.05
- Decay: 0.1

**爆炸音效**:
- Wave Type: Noise
- Attack: 0.01
- Sustain: 0.2
- Decay: 0.3

**击中音效**:
- Wave Type: Triangle
- Attack: 0.01
- Sustain: 0.05
- Decay: 0.1

## 音频优化

### 转换为 MP3 (128kbps)

使用 FFmpeg:
```bash
ffmpeg -i input.wav -b:a 128k output.mp3
```

### 转换为单声道（减小文件大小）

使用 FFmpeg:
```bash
ffmpeg -i input.wav -ac 1 -b:a 128k output.mp3
```

### 裁剪静音

使用 FFmpeg:
```bash
ffmpeg -i input.mp3 -af "silenceremove=1:0:-50dB" output.mp3
```

### 标准化音量

使用 FFmpeg:
```bash
ffmpeg -i input.mp3 -af "loudnorm" output.mp3
```

## 测试清单

- [ ] 所有 16 个音效文件已创建
- [ ] 文件格式为 MP3
- [ ] 比特率为 128kbps
- [ ] 文件大小 < 50 KB
- [ ] 音量标准化
- [ ] 音效简短清晰
- [ ] 无爆音或杂音
- [ ] 在游戏中测试播放
- [ ] 音效触发时机正确

## 音效分组测试

### 武器音效测试
1. 按 J 键测试机炮发射音效
2. 按 K 键测试导弹发射音效
3. 击中敌人测试击中音效
4. 导弹击中测试爆炸音效

### 爆炸音效测试
1. 击败普通敌人测试小爆炸
2. 击败精英怪测试中爆炸
3. 击败 BOSS 测试大爆炸
4. 玩家被击败测试玩家爆炸

### 庆祝页面音效测试
1. 点击气球测试气球音效
2. 点击横幅测试横幅音效
3. 点击蛋糕测试蛋糕音效
4. 点击红毯测试红毯音效
5. 点击礼花测试礼花音效

## 许可协议

如果使用需要署名的音效，请在项目的 CREDITS.md 文件中注明：

```
音效:
- player_gun_fire.mp3: Freesound.org 用户 Username (License)
- enemy_explode.mp3: Generated with JFXR (Public Domain)
...
```

## 故障排除

### 问题: 音效播放延迟

**解决方案**:
- 减小文件大小（使用单声道）
- 使用音频预加载
- 检查音频对象池配置

### 问题: 音效音量不一致

**解决方案**:
- 使用 Audacity 标准化所有音效
- 调整 AUDIO_CONFIG.EFFECT_VOLUME
- 确保所有音效使用相同的标准化设置

### 问题: 音效有爆音

**解决方案**:
- 使用 Audacity 的 Normalize 效果
- 降低音量峰值
- 使用 Limiter 效果

---

**注意**: 音效应该简短清晰，避免过长或过于复杂的音效，以确保游戏性能和用户体验。
