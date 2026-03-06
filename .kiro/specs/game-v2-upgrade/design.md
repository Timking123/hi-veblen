# 彩蛋游戏 V2.0 升级设计文档

## 概述

本文档描述彩蛋游戏 V2.0 版本的技术设计。此次升级将显著提升游戏的视觉质量、游戏体验和音频系统，同时确保在服务器环境（2 CPU 2G 内存）中的高性能运行。

### 设计目标

1. **视觉升级**: 实现精美的像素艺术风格，提升游戏美术质量
2. **游戏性优化**: 改进移动控制和武器平衡，提升游戏体验
3. **音频系统**: 添加完整的背景音乐和音效系统
4. **性能优化**: 确保在低配服务器环境中稳定运行
5. **代码质量**: 保持高质量代码和完整测试覆盖

### 技术栈

- **前端框架**: Vue 3.4+ with Composition API
- **类型系统**: TypeScript 5.0+
- **构建工具**: Vite 5.0+
- **图形渲染**: Canvas 2D API
- **音频处理**: Web Audio API
- **状态管理**: Pinia 2.0+
- **性能优化**: 对象池、视锥剔除、资源缓存

## 架构设计

### 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    Game Container (Vue)                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Game Engine Core                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │  │
│  │  │ Renderer │  │  Audio   │  │  Input   │        │  │
│  │  │  System  │  │  System  │  │ Manager  │        │  │
│  │  └──────────┘  └──────────┘  └──────────┘        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │  │
│  │  │  Entity  │  │  Stage   │  │ Collision│        │  │
│  │  │ Manager  │  │ Manager  │  │ Detector │        │  │
│  │  └──────────┘  └──────────┘  └──────────┘        │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │           Pixel Art Renderer                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │  │
│  │  │  Sprite  │  │  Frame   │  │  Effect  │        │  │
│  │  │  Cache   │  │ Renderer │  │ Renderer │        │  │
│  │  └──────────┘  └──────────┘  └──────────┘        │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Audio System                          │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │  │
│  │  │  Music   │  │  Sound   │  │  Audio   │        │  │
│  │  │ Manager  │  │  Effect  │  │  Pool    │        │  │
│  │  └──────────┘  └──────────┘  └──────────┘        │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 模块职责

1. **Pixel Art Renderer**: 负责像素艺术的渲染和缓存
2. **Audio System**: 管理背景音乐和音效的播放
3. **Enhanced Input Manager**: 处理改进的按键控制逻辑
4. **Effect System**: 管理爆炸效果和屏幕震动
5. **Resource Manager**: 优化资源加载和内存管理


## 组件和接口

### 1. PixelArtRenderer (像素艺术渲染器)

负责渲染所有像素艺术元素，包括玩家飞船、边框、背景等。

```typescript
interface PixelArtRenderer {
  // 渲染玩家飞船（8x12 像素块，等腰三角形）
  renderPlayerShip(ctx: CanvasRenderingContext2D, x: number, y: number): void
  
  // 渲染街机边框（带装饰细节）
  renderArcadeFrame(ctx: CanvasRenderingContext2D, width: number, height: number): void
  
  // 渲染像素背景（带深度感）
  renderPixelBackground(ctx: CanvasRenderingContext2D, stage: number): void
  
  // 渲染掉落物（4x4 像素块）
  renderPickup(ctx: CanvasRenderingContext2D, type: PickupType, x: number, y: number): void
  
  // 获取像素块大小
  getPixelBlockSize(): number
  
  // 缓存精灵图
  cacheSprite(key: string, renderer: () => ImageData): void
  
  // 获取缓存的精灵图
  getCachedSprite(key: string): ImageData | null
}
```

### 2. EnemyTextRenderer (敌人文字渲染器)

负责渲染文字形式的敌人。

```typescript
interface EnemyTextRenderer {
  // 渲染敌人文字
  renderEnemyText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    enemyType: EnemyType
  ): void
  
  // 获取敌人文字尺寸
  getEnemyTextSize(enemyType: EnemyType): { width: number; height: number }
  
  // 设置字体
  setFont(fontFamily: string): void
}

enum EnemyType {
  NORMAL = 'normal',      // 2x2 像素块
  ELITE = 'elite',        // 3x3 像素块
  STAGE_BOSS = 'stage_boss', // 4x4 像素块
  FINAL_BOSS = 'final_boss'  // 5x5 像素块
}
```

### 3. AudioSystem (音频系统)

管理所有背景音乐和音效。

```typescript
interface AudioSystem {
  // 初始化音频系统
  initialize(): Promise<void>
  
  // 播放背景音乐
  playBackgroundMusic(stage: number, isBoss: boolean): void
  
  // 停止背景音乐
  stopBackgroundMusic(): void
  
  // 播放音效
  playSoundEffect(effect: SoundEffect): void
  
  // 切换音乐开关
  toggleMusic(): void
  
  // 获取音乐状态
  isMusicEnabled(): boolean
  
  // 预加载音频资源
  preloadAudio(urls: string[]): Promise<void>
  
  // 清理资源
  cleanup(): void
}

enum SoundEffect {
  // 武器音效
  PLAYER_GUN_FIRE = 'player_gun_fire',
  PLAYER_MISSILE_FIRE = 'player_missile_fire',
  BULLET_FLY = 'bullet_fly',
  MISSILE_FLY = 'missile_fly',
  BULLET_HIT = 'bullet_hit',
  MISSILE_EXPLODE = 'missile_explode',
  
  // 爆炸音效
  ENEMY_EXPLODE = 'enemy_explode',
  ELITE_EXPLODE = 'elite_explode',
  STAGE_BOSS_EXPLODE = 'stage_boss_explode',
  FINAL_BOSS_EXPLODE = 'final_boss_explode',
  PLAYER_EXPLODE = 'player_explode',
  
  // 庆祝页面音效
  BALLOON_POP = 'balloon_pop',
  BANNER_SHAKE = 'banner_shake',
  CAKE_LIGHT = 'cake_light',
  CARPET_ROLL = 'carpet_roll',
  FIREWORK_LAUNCH = 'firework_launch'
}
```

### 4. EffectSystem (效果系统)

管理爆炸效果和屏幕震动。

```typescript
interface EffectSystem {
  // 创建爆炸效果
  createExplosion(x: number, y: number, size: ExplosionSize): void
  
  // 触发屏幕震动
  triggerScreenShake(intensity: number): void
  
  // 更新效果
  update(deltaTime: number): void
  
  // 渲染效果
  render(ctx: CanvasRenderingContext2D): void
  
  // 获取屏幕偏移（用于震动）
  getScreenOffset(): { x: number; y: number }
}

enum ExplosionSize {
  SMALL = 'small',    // 普通敌人
  MEDIUM = 'medium',  // 精英怪
  LARGE = 'large',    // 关底 BOSS
  HUGE = 'huge'       // 最终 BOSS / 玩家
}

interface Explosion {
  x: number
  y: number
  size: ExplosionSize
  frame: number
  maxFrames: number
  startTime: number
}
```

### 5. EnhancedInputManager (增强输入管理器)

处理改进的按键控制逻辑。

```typescript
interface EnhancedInputManager {
  // 更新输入状态
  update(deltaTime: number): void
  
  // 检查按键是否刚按下
  isKeyJustPressed(key: string): boolean
  
  // 检查按键是否正在按住
  isKeyHeld(key: string): boolean
  
  // 检查按键是否刚释放
  isKeyJustReleased(key: string): boolean
  
  // 获取移动输入（考虑长按延迟）
  getMovementInput(): { x: number; y: number }
  
  // 检查是否应该发射机炮（考虑射速限制）
  shouldFireGun(): boolean
  
  // 检查是否应该发射导弹（单次发射）
  shouldFireMissile(): boolean
  
  // 重置输入状态
  reset(): void
}

interface KeyState {
  isDown: boolean
  justPressed: boolean
  justReleased: boolean
  pressTime: number
  lastRepeatTime: number
}
```


### 6. GameRulesDisplay (游戏规则显示)

在游戏开始前显示游戏规则。

```typescript
interface GameRulesDisplay {
  // 显示规则界面
  show(): void
  
  // 隐藏规则界面
  hide(): void
  
  // 更新文字显示（逐字效果）
  update(deltaTime: number): void
  
  // 渲染规则界面
  render(ctx: CanvasRenderingContext2D): void
  
  // 检查是否显示完成
  isComplete(): boolean
  
  // 跳过动画
  skip(): void
}

interface GameRules {
  controls: string[]      // 操作说明
  weapons: string[]       // 武器说明
  pickups: string[]       // 掉落物说明
  ui: string[]           // UI 说明
  tips: string[]         // 游戏技巧
}
```

### 7. ResourceManager (资源管理器)

优化资源加载和内存管理。

```typescript
interface ResourceManager {
  // 预加载资源
  preloadResources(): Promise<void>
  
  // 加载音频
  loadAudio(url: string): Promise<AudioBuffer>
  
  // 加载图片
  loadImage(url: string): Promise<HTMLImageElement>
  
  // 获取资源
  getResource<T>(key: string): T | null
  
  // 释放资源
  releaseResource(key: string): void
  
  // 获取内存使用情况
  getMemoryUsage(): { used: number; total: number }
  
  // 清理未使用的资源
  cleanup(): void
}
```

## 数据模型

### 像素块配置

```typescript
interface PixelBlockConfig {
  size: number              // 像素块大小（像素）
  playerShipSize: {         // 玩家飞船尺寸
    width: number           // 12 像素块
    height: number          // 8 像素块
  }
  enemyTextSize: {
    normal: number          // 2x2 像素块
    elite: number           // 3x3 像素块
    stageBoss: number       // 4x4 像素块
    finalBoss: number       // 5x5 像素块
  }
  pickupSize: number        // 4x4 像素块
}
```

### 游戏配置更新

```typescript
interface GameConfigV2 {
  // 场景尺寸（扩大 50%）
  canvasWidth: number       // 原来的 1.5 倍
  canvasHeight: number      // 原来的 1.5 倍
  
  // 移动配置
  playerMoveDistance: number    // 1 像素块
  playerMoveInterval: number    // 200ms（长按）
  enemyMoveInterval: number     // 500ms
  enemyDownInterval: number     // 500ms
  
  // 射击配置
  playerGunCooldown: number     // 200ms
  enemyGunCooldown: number      // 1000ms
  bulletSpeed: number           // 1 像素块 / 100ms
  missileSpeed: number          // 1 像素块 / 150ms
  
  // 效果配置
  explosionDuration: number     // 500ms
  screenShakeDuration: number   // 300ms
  screenShakeIntensity: number  // 2-4 像素
  
  // 性能配置
  targetFPS: number             // 60
  maxMemoryMB: number           // 100
}
```

### 音频配置

```typescript
interface AudioConfig {
  // 背景音乐
  backgroundMusic: {
    stage1: string          // 第一关（轻快）
    stage1Boss: string      // 第一关 BOSS
    stage2: string          // 第二关（紧张）
    stage2Boss: string      // 第二关 BOSS
    stage3: string          // 第三关（史诗）
    finalBoss: string       // 最终 BOSS
    victory: string         // 通关（庆祝）
  }
  
  // 音效
  soundEffects: {
    [key in SoundEffect]: string
  }
  
  // 音量配置
  musicVolume: number       // 0.0 - 1.0
  effectVolume: number      // 0.0 - 1.0
  
  // 性能配置
  maxConcurrentSounds: number  // 最大同时播放音效数
  audioPoolSize: number        // 音频对象池大小
}
```


## 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1: 像素块尺寸一致性

*对于任何*游戏元素，所有像素艺术元素使用的像素块大小应该保持一致。

**验证需求**: 1.5

### 属性 2: 敌人文字尺寸正确性

*对于任何*敌人类型，渲染的文字尺寸应该与敌人类型对应：普通敌人 2x2，精英怪 3x3，关底 BOSS 4x4，最终 BOSS 5x5 像素块。

**验证需求**: 2.1, 2.2, 2.3, 2.4

### 属性 3: 敌人文字纯净性

*对于任何*敌人渲染，输出应该只包含文字内容，不包含边框、背景或换行符。

**验证需求**: 2.5

### 属性 4: 掉落物尺寸一致性

*对于任何*掉落物类型，渲染尺寸应该为 4x4 像素块。

**验证需求**: 3.1

### 属性 5: 掉落物类型可区分性

*对于任何*两种不同类型的掉落物，它们的颜色或图标应该不同，以便玩家区分。

**验证需求**: 3.2

### 属性 6: 场景尺寸扩展正确性

*对于*游戏场景，初始化后的尺寸应该是原版的 1.5 倍。

**验证需求**: 5.1

### 属性 7: 元素同步扩展

*对于任何*游戏元素（边框、背景等），当场景扩大时，元素尺寸应该同步扩大相同比例。

**验证需求**: 5.2

### 属性 8: 扩展后性能保持

*对于*扩大后的游戏场景，帧率应该保持在 60 FPS。

**验证需求**: 5.4

### 属性 9: UI 信息实时更新

*对于任何*玩家生命值或导弹数量的变化，UI 显示应该在下一帧立即更新。

**验证需求**: 6.4

### 属性 10: 玩家机炮射速限制

*对于任何*连续的机炮发射，两次发射之间的时间间隔应该不小于 200ms。

**验证需求**: 7.1

### 属性 11: 敌人机炮射速

*对于任何*敌人的机炮发射，两次发射之间的时间间隔应该为 1000ms。

**验证需求**: 7.2

### 属性 12: 单次按键移动距离

*对于任何*单次方向键按下，玩家飞船应该移动恰好 1 像素块的距离。

**验证需求**: 8.1

### 属性 13: 长按移动速率

*对于任何*长按方向键的情况，玩家飞船应该每 200ms 移动 1 像素块。

**验证需求**: 8.2

### 属性 14: 释放按键停止移动

*对于任何*方向键释放事件，玩家飞船应该在下一帧停止移动。

**验证需求**: 8.3

### 属性 15: 敌人追踪玩家

*对于任何*敌人的移动更新，敌人应该每 500ms 向玩家的 X 坐标方向移动。

**验证需求**: 9.1

### 属性 16: 敌人自动下降

*对于任何*非最终 BOSS 的敌人，应该每 500ms 向下移动 1 像素块。

**验证需求**: 9.2

### 属性 17: 最终 BOSS 位置固定

*对于*最终 BOSS，Y 坐标应该保持在屏幕最上方不变。

**验证需求**: 9.3

### 属性 18: 子弹移动速率

*对于任何*机炮子弹，应该每 100ms 向前移动 1 像素块。

**验证需求**: 10.1

### 属性 19: 导弹移动速率

*对于任何*导弹，应该每 150ms 向前移动 1 像素块。

**验证需求**: 10.2

### 属性 20: 导弹单次发射

*对于任何*单次 K 键按下（包括长按），应该只发射一枚导弹。

**验证需求**: 11.1, 11.2

### 属性 21: 导弹释放后可再发射

*对于任何*K 键释放后再按下的情况，应该发射新的一枚导弹。

**验证需求**: 11.3

### 属性 22: 敌人击败触发爆炸

*对于任何*被击败的敌人，应该创建一个爆炸效果实体。

**验证需求**: 12.1

### 属性 23: 玩家击败触发爆炸

*对于*玩家被击败的情况，应该创建一个爆炸效果实体。

**验证需求**: 12.2

### 属性 24: 爆炸持续时间

*对于任何*爆炸效果，应该在 500ms 内完成并从场景中移除。

**验证需求**: 12.4

### 属性 25: 玩家受伤触发震动

*对于任何*玩家被敌人击中的情况，应该触发屏幕震动效果。

**验证需求**: 13.1

### 属性 26: 震动持续时间和强度

*对于任何*屏幕震动，应该在 300ms 内完成，偏移范围在 2-4 像素之间。

**验证需求**: 13.2

### 属性 27: 震动结束恢复

*对于任何*屏幕震动结束后，画面偏移应该归零。

**验证需求**: 13.3

### 属性 28: 震动不影响逻辑

*对于任何*屏幕震动期间的碰撞检测，应该使用实体的原始坐标，不受震动偏移影响。

**验证需求**: 13.4

### 属性 29: 背景音乐状态机

*对于任何*关卡和 BOSS 状态变化，背景音乐应该切换到对应的音乐轨道。

**验证需求**: 16.1-16.8

### 属性 30: 音效触发正确性

*对于任何*特定游戏事件（如发射武器、击中目标），应该触发对应的音效。

**验证需求**: 17.1-17.12

### 属性 31: 敌人武器无音效

*对于任何*敌人发射的武器，不应该播放音效（仅玩家武器有音效）。

**验证需求**: 17.12

### 属性 32: 庆祝页面交互音效

*对于任何*庆祝页面的交互元素点击，应该播放对应的音效。

**验证需求**: 18.1-18.5

### 属性 33: 音乐开关功能

*对于任何*音乐开关切换，背景音乐应该相应地开启或关闭，但音效不受影响。

**验证需求**: 19.3, 19.4

### 属性 34: 服务器环境性能

*对于*在服务器环境（2 CPU 2G 内存）运行的游戏，帧率应该保持在 60 FPS，内存占用不超过 100MB。

**验证需求**: 20.1, 20.2

### 属性 35: 长时间运行无内存泄漏

*对于*游戏运行 30 分钟后，内存占用应该保持稳定，增长不超过 10%。

**验证需求**: 20.5


## 错误处理

### 音频加载失败

```typescript
class AudioLoadError extends Error {
  constructor(public url: string, public reason: string) {
    super(`Failed to load audio: ${url}, reason: ${reason}`)
  }
}

// 处理策略
try {
  await audioSystem.loadAudio(url)
} catch (error) {
  if (error instanceof AudioLoadError) {
    // 降级：使用静音模式继续游戏
    console.warn('Audio disabled due to load failure')
    audioSystem.disableAudio()
  }
}
```

### 资源加载超时

```typescript
class ResourceTimeoutError extends Error {
  constructor(public resourceType: string) {
    super(`Resource loading timeout: ${resourceType}`)
  }
}

// 处理策略
const loadWithTimeout = async (url: string, timeout: number = 5000) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new ResourceTimeoutError(url)), timeout)
  })
  
  return Promise.race([
    resourceManager.loadResource(url),
    timeoutPromise
  ])
}
```

### 渲染错误

```typescript
class RenderError extends Error {
  constructor(public component: string, public reason: string) {
    super(`Render error in ${component}: ${reason}`)
  }
}

// 处理策略
try {
  pixelArtRenderer.renderPlayerShip(ctx, x, y)
} catch (error) {
  if (error instanceof RenderError) {
    // 降级：使用简单矩形代替
    ctx.fillStyle = '#00ff00'
    ctx.fillRect(x, y, 12, 8)
  }
}
```

### 内存不足

```typescript
class OutOfMemoryError extends Error {
  constructor(public currentUsage: number, public limit: number) {
    super(`Out of memory: ${currentUsage}MB / ${limit}MB`)
  }
}

// 处理策略
const checkMemory = () => {
  const usage = resourceManager.getMemoryUsage()
  if (usage.used > usage.total * 0.9) {
    // 清理未使用的资源
    resourceManager.cleanup()
    // 清理对象池
    poolManager.shrink()
  }
}
```

### 音频上下文暂停

```typescript
// Web Audio API 需要用户交互才能启动
const resumeAudioContext = async () => {
  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }
}

// 在用户首次交互时恢复
document.addEventListener('click', resumeAudioContext, { once: true })
```

## 测试策略

### 单元测试

使用 Vitest 进行单元测试，覆盖核心逻辑：

```typescript
// 示例：测试像素块尺寸一致性
describe('PixelArtRenderer', () => {
  it('should use consistent pixel block size', () => {
    const renderer = new PixelArtRenderer()
    const blockSize = renderer.getPixelBlockSize()
    
    // 所有元素应该使用相同的像素块大小
    expect(blockSize).toBeGreaterThan(0)
    expect(renderer.playerShipWidth).toBe(12 * blockSize)
    expect(renderer.playerShipHeight).toBe(8 * blockSize)
  })
})

// 示例：测试敌人文字尺寸
describe('EnemyTextRenderer', () => {
  it('should render enemy text with correct size', () => {
    const renderer = new EnemyTextRenderer()
    
    expect(renderer.getEnemyTextSize('normal')).toEqual({ width: 2, height: 2 })
    expect(renderer.getEnemyTextSize('elite')).toEqual({ width: 3, height: 3 })
    expect(renderer.getEnemyTextSize('stage_boss')).toEqual({ width: 4, height: 4 })
    expect(renderer.getEnemyTextSize('final_boss')).toEqual({ width: 5, height: 5 })
  })
})

// 示例：测试移动控制
describe('EnhancedInputManager', () => {
  it('should move 1 pixel block on single key press', () => {
    const input = new EnhancedInputManager()
    const player = new PlayerAircraft()
    
    const initialX = player.x
    input.simulateKeyPress('d')
    player.handleInput(input)
    
    expect(player.x).toBe(initialX + PIXEL_BLOCK_SIZE)
  })
  
  it('should move every 200ms on key hold', async () => {
    const input = new EnhancedInputManager()
    const player = new PlayerAircraft()
    
    input.simulateKeyDown('d')
    await sleep(200)
    player.handleInput(input)
    
    const x1 = player.x
    await sleep(200)
    player.handleInput(input)
    
    expect(player.x).toBe(x1 + PIXEL_BLOCK_SIZE)
  })
})

// 示例：测试射速限制
describe('MachineGun', () => {
  it('should enforce 200ms cooldown', () => {
    const gun = new MachineGun()
    
    gun.fire() // 第一次发射
    const canFire1 = gun.canFire() // 应该为 false
    
    jest.advanceTimersByTime(200)
    const canFire2 = gun.canFire() // 应该为 true
    
    expect(canFire1).toBe(false)
    expect(canFire2).toBe(true)
  })
})
```

### 集成测试

测试系统间的交互：

```typescript
describe('Audio System Integration', () => {
  it('should switch music when boss appears', () => {
    const audio = new AudioSystem()
    const stage = new StageManager()
    
    audio.playBackgroundMusic(1, false) // 第一关普通音乐
    expect(audio.currentTrack).toBe('stage1')
    
    stage.spawnBoss()
    audio.playBackgroundMusic(1, true) // 第一关 BOSS 音乐
    expect(audio.currentTrack).toBe('stage1Boss')
  })
  
  it('should play sound effect on player weapon fire', () => {
    const audio = new AudioSystem()
    const player = new PlayerAircraft()
    
    const spy = jest.spyOn(audio, 'playSoundEffect')
    player.fireGun()
    
    expect(spy).toHaveBeenCalledWith(SoundEffect.PLAYER_GUN_FIRE)
  })
  
  it('should not play sound effect on enemy weapon fire', () => {
    const audio = new AudioSystem()
    const enemy = new Enemy()
    
    const spy = jest.spyOn(audio, 'playSoundEffect')
    enemy.fireGun()
    
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('Effect System Integration', () => {
  it('should create explosion when enemy is defeated', () => {
    const effects = new EffectSystem()
    const enemy = new Enemy()
    
    enemy.takeDamage(enemy.health)
    
    expect(effects.explosions.length).toBe(1)
    expect(effects.explosions[0].size).toBe(ExplosionSize.SMALL)
  })
  
  it('should trigger screen shake when player is hit', () => {
    const effects = new EffectSystem()
    const player = new PlayerAircraft()
    
    player.takeDamage(1)
    
    expect(effects.isShaking).toBe(true)
    expect(effects.shakeDuration).toBe(300)
  })
})
```

### 性能测试

测试性能指标：

```typescript
describe('Performance Tests', () => {
  it('should maintain 60 FPS with expanded scene', async () => {
    const game = new GameEngine()
    game.initialize({ scaleMultiplier: 1.5 })
    
    const fps = await measureFPS(game, 5000) // 测试 5 秒
    expect(fps).toBeGreaterThanOrEqual(55) // 允许 5 帧波动
  })
  
  it('should not exceed 100MB memory usage', async () => {
    const game = new GameEngine()
    game.initialize()
    
    await runGame(game, 30 * 60 * 1000) // 运行 30 分钟
    
    const memory = performance.memory.usedJSHeapSize / 1024 / 1024
    expect(memory).toBeLessThan(100)
  })
  
  it('should handle 100+ entities without performance drop', () => {
    const game = new GameEngine()
    
    // 创建 100 个实体
    for (let i = 0; i < 100; i++) {
      game.addEntity(new Enemy())
    }
    
    const fps = measureFPS(game, 1000)
    expect(fps).toBeGreaterThanOrEqual(55)
  })
})
```

### 视觉回归测试

使用截图对比测试视觉效果：

```typescript
describe('Visual Regression Tests', () => {
  it('should render player ship correctly', async () => {
    const canvas = createTestCanvas()
    const ctx = canvas.getContext('2d')!
    const renderer = new PixelArtRenderer()
    
    renderer.renderPlayerShip(ctx, 100, 100)
    
    const screenshot = canvas.toDataURL()
    await expect(screenshot).toMatchImageSnapshot()
  })
  
  it('should render arcade frame correctly', async () => {
    const canvas = createTestCanvas()
    const ctx = canvas.getContext('2d')!
    const renderer = new PixelArtRenderer()
    
    renderer.renderArcadeFrame(ctx, 800, 600)
    
    const screenshot = canvas.toDataURL()
    await expect(screenshot).toMatchImageSnapshot()
  })
})
```


## 性能优化策略

### 1. 像素艺术缓存

```typescript
class PixelArtCache {
  private cache: Map<string, ImageData> = new Map()
  
  // 缓存渲染结果
  cacheSprite(key: string, render: () => ImageData): ImageData {
    if (!this.cache.has(key)) {
      this.cache.set(key, render())
    }
    return this.cache.get(key)!
  }
  
  // 预渲染常用精灵
  prerender(): void {
    this.cacheSprite('player_ship', () => this.renderPlayerShip())
    this.cacheSprite('arcade_frame', () => this.renderArcadeFrame())
    // ... 其他常用精灵
  }
}
```

### 2. 音频对象池

```typescript
class AudioPool {
  private pool: Map<SoundEffect, HTMLAudioElement[]> = new Map()
  private maxPoolSize = 5
  
  // 获取音频对象
  acquire(effect: SoundEffect): HTMLAudioElement {
    const pool = this.pool.get(effect) || []
    
    // 查找空闲的音频对象
    const audio = pool.find(a => a.paused)
    if (audio) {
      audio.currentTime = 0
      return audio
    }
    
    // 创建新的音频对象
    if (pool.length < this.maxPoolSize) {
      const newAudio = new Audio(this.getAudioUrl(effect))
      pool.push(newAudio)
      this.pool.set(effect, pool)
      return newAudio
    }
    
    // 复用最早的音频对象
    return pool[0]
  }
  
  // 预加载音频
  preload(effects: SoundEffect[]): Promise<void[]> {
    return Promise.all(
      effects.map(effect => {
        const audio = new Audio(this.getAudioUrl(effect))
        return new Promise<void>((resolve) => {
          audio.addEventListener('canplaythrough', () => resolve(), { once: true })
        })
      })
    )
  }
}
```

### 3. 批量渲染优化

```typescript
class BatchRenderer {
  private batches: Map<string, RenderBatch> = new Map()
  
  // 添加到批次
  addToBatch(type: string, x: number, y: number, data: any): void {
    if (!this.batches.has(type)) {
      this.batches.set(type, { type, items: [] })
    }
    this.batches.get(type)!.items.push({ x, y, data })
  }
  
  // 批量渲染
  renderBatches(ctx: CanvasRenderingContext2D): void {
    for (const batch of this.batches.values()) {
      // 设置一次渲染状态
      this.setupRenderState(ctx, batch.type)
      
      // 批量绘制
      for (const item of batch.items) {
        this.renderItem(ctx, item)
      }
    }
    
    this.batches.clear()
  }
}
```

### 4. 懒加载音频资源

```typescript
class LazyAudioLoader {
  private loaded: Set<string> = new Set()
  private loading: Map<string, Promise<void>> = new Map()
  
  // 按需加载
  async loadOnDemand(url: string): Promise<void> {
    if (this.loaded.has(url)) {
      return
    }
    
    if (this.loading.has(url)) {
      return this.loading.get(url)!
    }
    
    const promise = this.doLoad(url)
    this.loading.set(url, promise)
    
    await promise
    this.loaded.add(url)
    this.loading.delete(url)
  }
  
  // 预加载关键资源
  async preloadCritical(): Promise<void> {
    const critical = [
      'player_gun_fire.mp3',
      'player_explode.mp3',
      'stage1.mp3'
    ]
    
    await Promise.all(critical.map(url => this.loadOnDemand(url)))
  }
}
```

### 5. 内存管理

```typescript
class MemoryManager {
  private readonly MAX_MEMORY_MB = 100
  private checkInterval = 5000 // 每 5 秒检查一次
  
  startMonitoring(): void {
    setInterval(() => {
      this.checkMemory()
    }, this.checkInterval)
  }
  
  checkMemory(): void {
    if (!performance.memory) return
    
    const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024
    
    if (usedMB > this.MAX_MEMORY_MB * 0.9) {
      console.warn(`Memory usage high: ${usedMB.toFixed(2)}MB`)
      this.cleanup()
    }
  }
  
  cleanup(): void {
    // 清理对象池
    poolManager.shrink()
    
    // 清理未使用的缓存
    pixelArtCache.cleanup()
    
    // 清理音频资源
    audioSystem.releaseUnusedAudio()
    
    // 强制垃圾回收（如果可用）
    if (global.gc) {
      global.gc()
    }
  }
}
```

### 6. 渲染优化

```typescript
class OptimizedRenderer {
  private offscreenCanvas: OffscreenCanvas
  private dirtyRegions: DirtyRegion[] = []
  
  // 使用离屏 Canvas 预渲染
  prerenderToOffscreen(render: (ctx: CanvasRenderingContext2D) => void): void {
    const ctx = this.offscreenCanvas.getContext('2d')!
    render(ctx)
  }
  
  // 只渲染脏区域
  renderDirtyRegions(ctx: CanvasRenderingContext2D): void {
    for (const region of this.dirtyRegions) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(region.x, region.y, region.width, region.height)
      ctx.clip()
      
      this.renderRegion(ctx, region)
      
      ctx.restore()
    }
    
    this.dirtyRegions = []
  }
  
  // 标记脏区域
  markDirty(x: number, y: number, width: number, height: number): void {
    this.dirtyRegions.push({ x, y, width, height })
  }
}
```

## 实现优先级

### P0 - 核心功能（第一周）

1. **像素艺术渲染系统**
   - PixelArtRenderer 实现
   - 玩家飞船像素艺术
   - 街机边框设计
   - 像素背景渲染

2. **敌人文字渲染系统**
   - EnemyTextRenderer 实现
   - 不同尺寸敌人文字
   - 字体配置

3. **游戏性调整**
   - EnhancedInputManager 实现
   - 移动控制重构
   - 射速平衡调整
   - 敌人 AI 重构

4. **场景扩展**
   - 游戏区域扩大 50%
   - 所有元素同步扩展
   - 性能测试和优化

### P1 - 重要功能（第二周）

5. **效果系统**
   - EffectSystem 实现
   - 爆炸动画
   - 屏幕震动效果

6. **UI 增强**
   - 生命值显示
   - 导弹数量显示
   - 游戏规则说明界面

7. **音频系统基础**
   - AudioSystem 实现
   - 音频对象池
   - 音频加载和管理

8. **背景音乐**
   - 各关卡音乐
   - BOSS 战音乐
   - 音乐切换逻辑

### P2 - 增强功能（第三周）

9. **游戏音效**
   - 武器音效
   - 爆炸音效
   - 交互音效

10. **音频控制**
    - 音乐开关按钮
    - 音量控制
    - 音效管理

11. **性能优化**
    - 资源缓存
    - 批量渲染
    - 内存管理
    - 懒加载

12. **其他优化**
    - 页面崩塌动画优化
    - CMD 窗口字体统一
    - 掉落物视觉优化

### P3 - 测试和文档（第四周）

13. **全面测试**
    - 单元测试
    - 集成测试
    - 性能测试
    - 视觉回归测试

14. **Bug 修复**
    - 修复所有发现的 Bug
    - 性能调优
    - 兼容性测试

15. **文档更新**
    - 更新用户指南
    - 更新开发者文档
    - 创建升级日志

## 技术风险和缓解策略

### 风险 1: 像素艺术创作耗时

**风险等级**: 高

**缓解策略**:
- 使用程序化生成基础形状
- 创建像素艺术工具辅助设计
- 优先实现核心元素，细节后续迭代

### 风险 2: 音频资源获取

**风险等级**: 高

**缓解策略**:
- 使用免费音效库（如 freesound.org）
- 使用 Web Audio API 程序化生成简单音效
- 准备降级方案（静音模式）

### 风险 3: 性能优化挑战

**风险等级**: 中

**缓解策略**:
- 早期进行性能测试
- 使用性能分析工具定位瓶颈
- 实现多级降级策略

### 风险 4: 浏览器兼容性

**风险等级**: 中

**缓解策略**:
- 使用 Web Audio API polyfill
- 测试主流浏览器
- 提供兼容性警告

### 风险 5: 内存管理

**风险等级**: 中

**缓解策略**:
- 实现完善的资源管理
- 定期内存检查和清理
- 使用对象池减少分配

## 部署和发布

### 构建优化

```bash
# 生产构建配置
vite build --mode production

# 启用代码分割
# 启用资源压缩
# 启用 Tree Shaking
```

### 资源优化

- 音频文件使用 MP3 格式，比特率 128kbps
- 图片资源使用 WebP 格式
- 启用 Gzip 压缩
- 使用 CDN 加速资源加载

### 监控和分析

- 集成性能监控（如 Web Vitals）
- 错误追踪（如 Sentry）
- 用户行为分析（可选）

---

**文档版本**: 1.0  
**创建日期**: 2026-01-29  
**最后更新**: 2026-01-29  
**状态**: 待审核
