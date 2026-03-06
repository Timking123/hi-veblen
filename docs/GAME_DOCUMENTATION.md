# 彩蛋游戏文档

> 本文档整合了彩蛋游戏的用户指南、开发者文档和技术实现细节。

## 目录

- [第一部分：用户指南](#第一部分用户指南)
- [第二部分：开发者文档](#第二部分开发者文档)
- [第三部分：技术实现](#第三部分技术实现)
- [第四部分：版本历史](#第四部分版本历史)

---

# 第一部分：用户指南

## 1. 游戏简介

彩蛋游戏是一个隐藏在个人网站中的像素艺术风格飞行射击游戏。通过特殊方式触发，体验从家里到学校再到公司的人生旅程。

### 1.1 游戏特色

- 🎨 **像素艺术视觉**: 精美的像素艺术渲染系统
- 🎵 **动态音乐**: 7 首背景音乐 + 16 种音效
- 🎮 **精确控制**: 单次按键 + 长按移动系统
- 💥 **震撼效果**: 爆炸动画 + 屏幕震动
- 📊 **实时 UI**: 生命值和导弹数量显示

## 2. 如何触发彩蛋

1. 访问个人网站首页
2. 找到页面上的头像
3. **在 5 秒内快速点击头像 3 次**
4. 观看页面崩塌动画
5. 在 CMD 窗口中输入 `y` 启动游戏

## 3. 游戏操作

### 3.1 基本操作

| 按键 | 功能 | 说明 |
|------|------|------|
| **W** | 向上移动 | 单次按键移动 1 像素块，长按每 200ms 移动 |
| **A** | 向左移动 | 同上 |
| **S** | 向下移动 | 同上 |
| **D** | 向右移动 | 同上 |
| **J** | 发射机炮 | 最快间隔 200ms |
| **K** | 发射导弹 | 单次发射 |
| **空格** | 发射核弹 | 需要满进度 |

### 3.2 音乐控制

- 点击游戏边框旁边的音乐按钮开关背景音乐
- 关闭音乐后音效仍会播放

## 4. 游戏内容

### 4.1 武器系统

**机炮（J 键）**
- 初始伤害: 2
- 可升级: 子弹数、弹道、射速、伤害、速度

**导弹（K 键）**
- 初始数量: 10 枚
- 伤害: 5
- 爆炸范围: 3x3

**核弹（空格键）**
- 清除所有敌人和敌方子弹
- 击杀敌人充能（+1/敌人）

### 4.2 敌人类型

| 类型 | 血量 | 特点 |
|------|------|------|
| ⚪ 白色 | 3 | 基础敌人 |
| 🟢 绿色 | 5 | 血量较高 |
| 🔵 蓝色 | 8 | 攻击力强 |
| 🟣 紫色 | 12 | 第一关 Boss |
| 🟡 黄色 | 15 | 速度极快 |
| 🟠 橙色 | 22 | 第二关 Boss |
| 🔴 红色 | 30 | 最终 Boss |

### 4.3 掉落物

| 掉落物 | 概率 | 效果 |
|--------|------|------|
| 🔧 维修组件 | 25% | 血量+1 |
| 🔫 机炮升级 | 20% | 随机升级 |
| 🚀 导弹升级 | 10% | 随机升级 |
| ⚙️ 引擎组件 | 10% | 速度+1 |

### 4.4 关卡介绍

**第一关：家里 🏠**
- 敌人数量: 50
- Boss: 紫色敌人
- 背景音乐: 轻快风格

**第二关：学校 🏫**
- 敌人数量: 70
- Boss: 橙色敌人
- 背景音乐: 紧张风格

**第三关：公司 🏢**
- 敌人数量: 80
- Boss: 红色最终 Boss
- 背景音乐: 史诗风格

## 5. 游戏技巧

### 5.1 新手技巧

1. **保持移动** - 不要停在原地
2. **优先拾取维修组件** - 血量很重要
3. **合理使用武器** - 机炮清小怪，导弹打密集敌群

### 5.2 进阶技巧

1. **利用敌人追踪** - 引导敌人集中后使用核弹
2. **避免碰撞** - 碰撞伤害等于敌人剩余血量
3. **Boss 战策略** - 保持距离，持续输出

## 6. 通关奖励

通关后进入庆祝页面，包含互动元素：
- 🎈 气球（点击爆炸）
- 🎆 礼花（点击发射）
- 🎂 蛋糕（点击点亮蜡烛）
- 🎊 横幅（点击晃动）
- 🟥 红毯（点击铺开）
- 💌 贺卡（显示祝贺）

---

# 第二部分：开发者文档

## 7. 技术架构

### 7.1 技术栈

| 技术 | 用途 |
|-----|------|
| Vue 3 | 组件化开发 |
| TypeScript | 类型安全 |
| Canvas 2D | 图形渲染 |
| Web Audio API | 音频处理 |
| Pinia | 状态管理 |

### 7.2 项目结构

```
src/game/
├── entities/              # 游戏实体
│   ├── PlayerAircraft.ts  # 玩家飞机
│   ├── Enemy.ts           # 敌人
│   ├── Bullet.ts          # 子弹
│   ├── Missile.ts         # 导弹
│   └── Pickup.ts          # 掉落物
├── weapons/               # 武器系统
│   ├── MachineGun.ts      # 机炮
│   ├── MissileLauncher.ts # 导弹发射器
│   └── NuclearBomb.ts     # 核弹
├── utils/                 # 工具函数
├── GameEngine.ts          # 游戏引擎
├── InputManager.ts        # 输入管理
├── EnhancedInputManager.ts # 增强输入管理
├── CollisionDetector.ts   # 碰撞检测
├── StageManager.ts        # 关卡管理
├── SceneRenderer.ts       # 场景渲染
├── PixelArtRenderer.ts    # 像素艺术渲染
├── EnemyTextRenderer.ts   # 敌人文字渲染
├── EffectSystem.ts        # 效果系统
├── AudioSystem.ts         # 音频系统
├── AudioPool.ts           # 音频对象池
├── ResourceManager.ts     # 资源管理
├── MemoryManager.ts       # 内存管理
├── ObjectPool.ts          # 对象池
├── PoolManager.ts         # 对象池管理
├── types.ts               # 类型定义
└── constants.ts           # 游戏常量
```

## 8. 核心系统

### 8.1 游戏引擎（GameEngine）

```typescript
class GameEngine {
  // 启动游戏循环
  start(): void
  
  // 停止游戏循环
  stop(): void
  
  // 暂停/恢复
  pause(): void
  resume(): void
  
  // 实体管理
  addEntity(entity: Entity): void
  removeEntity(entity: Entity): void
  
  // 音频系统
  initializeAudio(): Promise<void>
  getAudioSystem(): AudioSystem
}
```

### 8.2 实体接口（Entity）

```typescript
interface Entity {
  id: string
  x: number
  y: number
  width: number
  height: number
  isActive: boolean
  
  update(deltaTime: number): void
  render(ctx: CanvasRenderingContext2D): void
  onCollision(other: Entity): void
  destroy(): void
}
```

### 8.3 音频系统（AudioSystem）

```typescript
class AudioSystem {
  // 初始化
  initialize(): Promise<void>
  
  // 背景音乐
  playBackgroundMusic(stage: number, isBoss: boolean): void
  stopBackgroundMusic(): void
  
  // 音效
  playSoundEffect(effect: SoundEffect): void
  
  // 控制
  toggleMusic(): void
  isMusicEnabled(): boolean
}
```

### 8.4 效果系统（EffectSystem）

```typescript
class EffectSystem {
  // 爆炸效果
  createExplosion(x: number, y: number, size: ExplosionSize): void
  
  // 屏幕震动
  triggerScreenShake(intensity: number): void
  
  // 更新和渲染
  update(deltaTime: number): void
  render(ctx: CanvasRenderingContext2D): void
}
```

## 9. 扩展指南

### 9.1 添加新敌人类型

```typescript
// 1. 在 types.ts 中添加枚举
export enum EnemyType {
  // ...
  NEW_TYPE = 'new-type'
}

// 2. 在 constants.ts 中定义配置
export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  [EnemyType.NEW_TYPE]: {
    health: 50,
    speed: 4,
    color: '#FF00FF',
    weapon: { /* ... */ }
  }
}
```

### 9.2 添加新武器

```typescript
// 1. 创建武器类
export class NewWeapon {
  config: NewWeaponConfig
  
  fire(x: number, y: number): Entity[] {
    // 发射逻辑
    return []
  }
  
  upgrade(): void {
    // 升级逻辑
  }
}

// 2. 在 GameContainer 中集成
const newWeapon = new NewWeapon()
const projectiles = newWeapon.fire(x, y)
projectiles.forEach(p => gameEngine.addEntity(p))
```

### 9.3 添加新音效

```typescript
// 1. 在 AudioSystem 中添加音效枚举
export enum SoundEffect {
  // ...
  NEW_SOUND = 'new_sound'
}

// 2. 配置音频 URL
const SOUND_URLS = {
  [SoundEffect.NEW_SOUND]: '/audio/sfx/new_sound.mp3'
}

// 3. 播放音效
audioSystem.playSoundEffect(SoundEffect.NEW_SOUND)
```

---

# 第三部分：技术实现

## 10. 性能优化

### 10.1 对象池

```typescript
class ObjectPool<T> {
  private pool: T[] = []
  
  acquire(): T {
    return this.pool.pop() || this.createNew()
  }
  
  release(obj: T): void {
    this.reset(obj)
    this.pool.push(obj)
  }
}

// 使用
const bulletPool = new ObjectPool<Bullet>(
  () => new Bullet(),
  (bullet) => bullet.reset(),
  50,  // 初始大小
  200  // 最大大小
)
```

### 10.2 像素艺术缓存

```typescript
class PixelArtRenderer {
  private spriteCache = new Map<string, ImageData>()
  
  cacheSprite(key: string, render: () => ImageData): void {
    if (!this.spriteCache.has(key)) {
      this.spriteCache.set(key, render())
    }
  }
  
  getCachedSprite(key: string): ImageData | null {
    return this.spriteCache.get(key) || null
  }
}
```

### 10.3 视锥剔除

```typescript
function isVisible(entity: Entity, viewport: Viewport): boolean {
  const margin = 50  // 边界容差
  return (
    entity.x + entity.width > viewport.x - margin &&
    entity.x < viewport.x + viewport.width + margin &&
    entity.y + entity.height > viewport.y - margin &&
    entity.y < viewport.y + viewport.height + margin
  )
}
```

### 10.4 性能指标

| 指标 | 目标值 |
|-----|-------|
| 帧率 | 60 FPS |
| 内存占用 | < 100MB |
| 对象复用率 | > 95% |
| 无内存泄漏 | ✅ |

## 11. 配置常量

### 11.1 像素块配置

```typescript
export const PIXEL_BLOCK_SIZE = 4

export const PLAYER_SHIP_CONFIG = {
  widthBlocks: 8,   // 8 像素块宽
  heightBlocks: 12  // 12 像素块高
}

export const ENEMY_TEXT_SIZE = {
  NORMAL: 2,      // 2x2 像素块
  ELITE: 3,       // 3x3 像素块
  STAGE_BOSS: 4,  // 4x4 像素块
  FINAL_BOSS: 5   // 5x5 像素块
}
```

### 11.2 移动和射击配置

```typescript
export const MOVEMENT_CONFIG = {
  moveDistance: 1,        // 单次移动 1 像素块
  moveInterval: 200,      // 长按间隔 200ms
  playerGunCooldown: 200, // 玩家机炮冷却
  enemyGunCooldown: 1000  // 敌人机炮冷却
}

export const PROJECTILE_CONFIG = {
  bulletSpeed: 100,  // 子弹每 100ms 移动 1 像素块
  missileSpeed: 150  // 导弹每 150ms 移动 1 像素块
}
```

### 11.3 效果配置

```typescript
export const EFFECT_CONFIG = {
  explosionDuration: 500,    // 爆炸持续 500ms
  screenShakeDuration: 300,  // 震动持续 300ms
  screenShakeIntensity: 3    // 震动强度 2-4 像素
}
```

---

# 第四部分：版本历史

## 12. 版本更新日志

### V2.0.0 (2026-01-30)

**新增功能**
- 像素艺术渲染系统
- 完整音频系统（7 首音乐 + 16 种音效）
- 效果系统（爆炸动画 + 屏幕震动）
- 增强输入管理器
- UI 信息显示（生命值 + 导弹数量）
- 游戏规则说明界面
- 场景扩展 50%

**优化改进**
- 精确移动控制
- 武器平衡调整
- 敌人 AI 升级
- 性能优化（缓存、对象池、懒加载）

**Bug 修复**
- 修复移动控制不精确问题
- 修复内存泄漏问题
- 修复音频加载失败问题

### V1.0.0 (2026-01-15)

**初始版本**
- 彩蛋触发系统
- 页面崩塌动画
- CMD 交互窗口
- 游戏引擎核心
- 玩家和武器系统
- 敌人系统
- 掉落物系统
- 关卡系统
- 庆祝页面

## 13. 未来计划

### V2.1 计划
- 更多音效和音乐
- 成就系统
- 存档系统

### V3.0 展望
- 移动端支持
- 多人模式
- 更多关卡
- 排行榜系统

---

## 附录

### A. 常见问题

**Q: 如何触发彩蛋？**
A: 在首页 5 秒内快速点击头像 3 次。

**Q: 游戏支持哪些浏览器？**
A: 支持所有现代浏览器（Chrome、Firefox、Edge、Safari）。

**Q: 如何控制音乐？**
A: 点击游戏边框旁边的音乐按钮。

**Q: 核弹如何充能？**
A: 击杀敌人会增加核弹进度，每个敌人 +1 点。

### B. 联系方式

- 邮箱: 1243222867@QQ.com
- 电话: +86 14775378984

---

**文档版本**: 2.0.0  
**最后更新**: 2026-01-30  
**维护者**: 项目开发团队

**祝你游戏愉快！** 🎮✨
