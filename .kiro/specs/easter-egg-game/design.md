# 彩蛋游戏功能设计文档

## 概述

本设计文档描述了一个隐藏在个人作品集网站中的复古像素风格飞机大战游戏。该功能通过点击头像触发，包含完整的页面崩塌动画、游戏引擎、战斗系统、关卡设计和庆祝页面。

## 架构

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Home.vue                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Easter Egg Trigger Component                  │   │
│  │  - Click detection on avatar                          │   │
│  │  - 5-second timer management                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Page Collapse Animation System                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  - Text fragmentation engine                          │   │
│  │  - Melt effect renderer                               │   │
│  │  - Background tear effect                             │   │
│  │  - Black fill transition                              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CMD Window Component                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  - Terminal UI renderer                               │   │
│  │  - Input handler (y/n)                                │   │
│  │  - Typewriter effect                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Game Container Component                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Game Engine Core                         │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  Game Loop (60fps)                             │  │   │
│  │  │  - Update cycle                                │  │   │
│  │  │  - Render cycle                                │  │   │
│  │  │  - Collision detection                         │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                                                        │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  Entity Management System                      │  │   │
│  │  │  - Player aircraft                             │  │   │
│  │  │  - Enemy entities                              │  │   │
│  │  │  - Projectiles (bullets, missiles)             │  │   │
│  │  │  - Pickups (upgrades, repairs)                 │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                                                        │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  Input System                                  │  │   │
│  │  │  - Keyboard event handler                      │  │   │
│  │  │  - Key state tracking                          │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                                                        │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  Weapon Systems                                │  │   │
│  │  │  - Machine gun system                          │  │   │
│  │  │  - Missile system                              │  │   │
│  │  │  - Nuclear bomb system                         │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                                                        │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  Stage Management System                       │  │   │
│  │  │  - Stage 1: Home scene                         │  │   │
│  │  │  - Stage 2: School scene                       │  │   │
│  │  │  - Stage 3: Company scene                      │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                                                        │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  UI Rendering System                           │  │   │
│  │  │  - HUD display                                 │  │   │
│  │  │  - Progress bars                               │  │   │
│  │  │  - Pixel font rendering                        │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Celebration Page Component                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  - Interactive balloons                               │   │
│  │  - Fireworks                                          │   │
│  │  - Cake with candles                                  │   │
│  │  - Banner animation                                   │   │
│  │  - Red carpet animation                               │   │
│  │  - Congratulation card modal                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 技术栈

- **前端框架**: Vue 3 Composition API
- **渲染引擎**: HTML5 Canvas API
- **动画**: CSS3 Animations + Canvas动画
- **状态管理**: Vue Reactive System
- **类型系统**: TypeScript
- **性能优化**: RequestAnimationFrame + Object Pooling



## 组件和接口

### 1. Easter Egg Trigger (Home.vue 集成)

**职责**: 检测用户点击头像并触发彩蛋

**接口**:
```typescript
interface EasterEggTrigger {
  clickCount: number
  lastClickTime: number
  isTriggered: boolean
  
  handleAvatarClick(): void
  resetClickCounter(): void
  triggerEasterEgg(): void
}
```

**实现细节**:
- 在 Home.vue 中为头像添加点击事件监听
- 使用 ref 跟踪点击次数和时间戳
- 5秒内3次点击触发彩蛋
- 触发后调用页面崩塌动画组件

### 2. Page Collapse Animation Component

**文件**: `src/components/game/PageCollapseAnimation.vue`

**职责**: 执行页面崩塌视觉效果

**接口**:
```typescript
interface CollapseAnimation {
  // 状态
  isAnimating: boolean
  animationPhase: 'text-break' | 'melt' | 'tear' | 'fill' | 'complete'
  
  // 方法
  startAnimation(): Promise<void>
  fragmentText(): void
  applyMeltEffect(): void
  createTearEffect(): void
  fillWithBlack(): void
}

interface TextFragment {
  element: HTMLElement
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  rotationSpeed: number
}
```

**实现细节**:
- 使用 Canvas 或 CSS transforms 实现碎片效果
- 文字碎片使用物理引擎模拟重力
- 融化效果使用 SVG filter 或 Canvas 渐变
- 背景撕裂使用 clip-path 动画
- 黑色填充使用 z-index 层叠和 opacity 过渡

### 3. CMD Window Component

**文件**: `src/components/game/CMDWindow.vue`

**职责**: 显示命令行界面并处理用户输入

**接口**:
```typescript
interface CMDWindow {
  isVisible: boolean
  inputValue: string
  displayText: string
  
  show(): void
  hide(): void
  handleInput(key: string): void
  processCommand(command: string): void
  typewriterEffect(text: string): Promise<void>
}
```

**样式**:
```css
.cmd-window {
  background: #000;
  color: #0f0;
  font-family: 'Courier New', monospace;
  border: 2px solid #0f0;
  padding: 20px;
  width: 600px;
  height: 400px;
}
```

### 4. Game Container Component

**文件**: `src/components/game/GameContainer.vue`

**职责**: 游戏主容器，管理游戏生命周期

**接口**:
```typescript
interface GameContainer {
  isGameActive: boolean
  currentStage: number
  
  startGame(): void
  endGame(): void
  pauseGame(): void
  resumeGame(): void
  exitToHome(): void
}
```

### 5. Game Engine Core

**文件**: `src/game/GameEngine.ts`

**职责**: 游戏循环、更新和渲染管理

**接口**:
```typescript
class GameEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private entities: Entity[]
  private isRunning: boolean
  private lastFrameTime: number
  private fps: number
  
  constructor(canvas: HTMLCanvasElement)
  start(): void
  stop(): void
  update(deltaTime: number): void
  render(): void
  addEntity(entity: Entity): void
  removeEntity(entity: Entity): void
  checkCollisions(): void
}
```

### 6. Entity System

**文件**: `src/game/entities/`

**基础实体接口**:
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

**玩家飞机**:
```typescript
class PlayerAircraft implements Entity {
  health: number
  speed: number
  machineGun: MachineGun
  missileLauncher: MissileLauncher
  nuclearBomb: NuclearBomb
  
  move(direction: 'up' | 'down' | 'left' | 'right'): void
  fireMachineGun(): void
  fireMissile(): void
  launchNuke(): void
  takeDamage(amount: number): void
  applyUpgrade(upgrade: Upgrade): void
}
```

**敌人实体**:
```typescript
interface EnemyConfig {
  type: 'white' | 'green' | 'blue' | 'purple' | 'yellow' | 'orange' | 'red'
  health: number
  speed: number
  attackPower: number
  text: string
  isBoss: boolean
  isElite: boolean
}

class Enemy implements Entity {
  config: EnemyConfig
  currentHealth: number
  weapon: Weapon
  
  trackPlayer(player: PlayerAircraft): void
  attack(): void
  dropLoot(): Pickup | null
}
```

**子弹和导弹**:
```typescript
class Bullet implements Entity {
  damage: number
  speed: number
  owner: 'player' | 'enemy'
}

class Missile implements Entity {
  damage: number
  speed: number
  explosionRadius: number
  owner: 'player' | 'enemy'
  
  explode(): void
}
```

**掉落物**:
```typescript
type PickupType = 
  | 'machinegun-bullets'
  | 'machinegun-trajectory'
  | 'machinegun-firerate'
  | 'machinegun-damage'
  | 'machinegun-speed'
  | 'missile-count'
  | 'missile-damage'
  | 'missile-speed'
  | 'repair'
  | 'engine'

class Pickup implements Entity {
  type: PickupType
  
  applyEffect(player: PlayerAircraft): void
}
```



### 7. Weapon Systems

**文件**: `src/game/weapons/`

**机炮系统**:
```typescript
interface MachineGunConfig {
  bulletsPerShot: number
  trajectories: number
  fireRate: number // milliseconds
  bulletDamage: number
  bulletSpeed: number
}

class MachineGun {
  config: MachineGunConfig
  lastFireTime: number
  isAutoFiring: boolean
  
  fire(x: number, y: number): Bullet[]
  upgrade(type: string): void
  canFire(): boolean
}
```

**导弹系统**:
```typescript
interface MissileLauncherConfig {
  missileCount: number
  missileDamage: number
  missileSpeed: number
  explosionRadius: number
}

class MissileLauncher {
  config: MissileLauncherConfig
  currentSide: 'left' | 'right'
  
  fire(x: number, y: number): Missile | null
  upgrade(type: string): void
  canFire(): boolean
}
```

**核弹系统**:
```typescript
class NuclearBomb {
  progress: number
  maxProgress: number
  
  addProgress(amount: number): void
  canLaunch(): boolean
  launch(): void
  reset(): void
}
```

### 8. Stage Management System

**文件**: `src/game/stages/`

**关卡配置**:
```typescript
interface StageConfig {
  id: number
  name: string
  background: string
  enemyTypes: EnemyConfig['type'][]
  totalEnemies: number
  spawnRate: number // milliseconds
  bossType: EnemyConfig['type']
}

const STAGES: StageConfig[] = [
  {
    id: 1,
    name: '家里',
    background: 'home-scene',
    enemyTypes: ['white', 'green', 'blue'],
    totalEnemies: 50,
    spawnRate: 3000,
    bossType: 'purple'
  },
  {
    id: 2,
    name: '学校',
    background: 'school-scene',
    enemyTypes: ['white', 'green', 'blue', 'purple', 'yellow'],
    totalEnemies: 70,
    spawnRate: 2000,
    bossType: 'orange'
  },
  {
    id: 3,
    name: '公司',
    background: 'company-scene',
    enemyTypes: ['purple', 'yellow', 'orange', 'red'],
    totalEnemies: 80,
    spawnRate: 1500,
    bossType: 'red'
  }
]
```

**关卡管理器**:
```typescript
class StageManager {
  currentStage: number
  enemiesSpawned: number
  enemiesKilled: number
  spawnTimer: number
  
  loadStage(stageId: number): void
  spawnEnemy(): Enemy
  onEnemyKilled(): void
  isStageComplete(): boolean
  nextStage(): void
}
```

### 9. Input System

**文件**: `src/game/InputManager.ts`

**接口**:
```typescript
class InputManager {
  private keyStates: Map<string, boolean>
  private keyDownHandlers: Map<string, Function>
  private keyUpHandlers: Map<string, Function>
  
  constructor()
  isKeyPressed(key: string): boolean
  onKeyDown(key: string, handler: Function): void
  onKeyUp(key: string, handler: Function): void
  update(): void
  destroy(): void
}
```

**键位映射**:
```typescript
const KEY_BINDINGS = {
  MOVE_UP: 'w',
  MOVE_DOWN: 's',
  MOVE_LEFT: 'a',
  MOVE_RIGHT: 'd',
  FIRE_GUN: 'j',
  FIRE_MISSILE: 'k',
  LAUNCH_NUKE: ' '
}
```

### 10. Collision Detection System

**文件**: `src/game/CollisionDetector.ts`

**接口**:
```typescript
interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

class CollisionDetector {
  checkAABB(a: Bounds, b: Bounds): boolean
  checkCircle(a: {x: number, y: number, radius: number}, 
              b: {x: number, y: number, radius: number}): boolean
  getEntitiesInRadius(center: {x: number, y: number}, 
                      radius: number, 
                      entities: Entity[]): Entity[]
}
```

### 11. Enemy Content System

**文件**: `src/game/EnemyContentProvider.ts`

**接口**:
```typescript
class EnemyContentProvider {
  private skillNames: string[]
  private courseNames: string[]
  private projectNames: string[]
  
  constructor(profileData: ProfileData)
  getRandomContent(): string
  loadFromProfile(): void
}
```

### 12. UI Rendering System

**文件**: `src/game/ui/GameUI.ts`

**接口**:
```typescript
class GameUI {
  renderHUD(ctx: CanvasRenderingContext2D, gameState: GameState): void
  renderHealthBar(health: number, maxHealth: number): void
  renderMissileCount(count: number): void
  renderNukeProgress(progress: number, max: number): void
  renderStageInfo(stage: number, enemiesLeft: number): void
  renderControls(): void
  hideControls(): void
}
```

**HUD布局**:
```
┌─────────────────────────────────────────────────────────┐
│ ❤️ HP: 10/10    🚀 导弹: 8    关卡: 2/3    敌人: 45    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│                    [游戏区域]                            │
│                                                          │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ 核弹进度: [████████░░░░░░░░░░░░] 40/100                │
└─────────────────────────────────────────────────────────┘
```

### 13. Celebration Page Component

**文件**: `src/components/game/CelebrationPage.vue`

**接口**:
```typescript
interface CelebrationPage {
  balloons: Balloon[]
  fireworks: Firework[]
  cake: Cake
  banner: Banner
  carpet: Carpet
  showCard: boolean
  
  initializeElements(): void
  handleBalloonClick(balloon: Balloon): void
  handleFireworkClick(firework: Firework): void
  handleCakeClick(): void
  handleBannerClick(): void
  handleCarpetClick(): void
  showCongratulationCard(): void
  returnToHome(): void
}

interface Balloon {
  id: string
  x: number
  y: number
  color: string
  isPopped: boolean
  pop(): void
}

interface Cake {
  candlesLit: boolean
  clickCount: number
  lightCandles(): void
}
```



## 数据模型

### 游戏状态

```typescript
interface GameState {
  isActive: boolean
  isPaused: boolean
  currentStage: number
  player: PlayerState
  enemies: Enemy[]
  projectiles: (Bullet | Missile)[]
  pickups: Pickup[]
  nukeProgress: number
}

interface PlayerState {
  x: number
  y: number
  health: number
  maxHealth: number
  speed: number
  machineGun: MachineGunConfig
  missileLauncher: MissileLauncherConfig
  upgrades: Upgrade[]
}

interface Upgrade {
  type: PickupType
  appliedCount: number
}
```

### 敌人配置数据

```typescript
const ENEMY_CONFIGS: Record<string, EnemyConfig> = {
  white: {
    type: 'white',
    health: 2,
    speed: 2,
    attackPower: 1,
    machineGun: { bulletsPerShot: 1, bulletDamage: 2, bulletSpeed: 20, fireRate: 3000, trajectories: 1 },
    dropRates: { machineGun: 0.2, missile: 0.1, repair: 0.25, engine: 0.1 }
  },
  green: {
    type: 'green',
    health: 5,
    speed: 2,
    attackPower: 1,
    machineGun: { bulletsPerShot: 1, bulletDamage: 2, bulletSpeed: 20, fireRate: 3000, trajectories: 1 },
    dropRates: { machineGun: 0.2, missile: 0.1, repair: 0.25, engine: 0.1 }
  },
  blue: {
    type: 'blue',
    health: 8,
    speed: 2,
    attackPower: 1,
    machineGun: { bulletsPerShot: 1, bulletDamage: 3, bulletSpeed: 20, fireRate: 3000, trajectories: 1 },
    dropRates: { machineGun: 0.2, missile: 0.1, repair: 0.25, engine: 0.1 }
  },
  purple: {
    type: 'purple',
    health: 8,
    speed: 3,
    attackPower: 1,
    machineGun: { bulletsPerShot: 4, bulletDamage: 3, bulletSpeed: 22, fireRate: 3000, trajectories: 1 },
    dropRates: { machineGun: 0.2, missile: 0.1, repair: 0.25, engine: 0.1 }
  },
  yellow: {
    type: 'yellow',
    health: 6,
    speed: 6,
    attackPower: 1,
    machineGun: { bulletsPerShot: 1, bulletDamage: 3, bulletSpeed: 20, fireRate: 3000, trajectories: 1 },
    dropRates: { machineGun: 0.2, missile: 0.1, repair: 0.25, engine: 0.1 }
  },
  orange: {
    type: 'orange',
    health: 12,
    speed: 2,
    attackPower: 1,
    machineGun: { bulletsPerShot: 4, bulletDamage: 3, bulletSpeed: 20, fireRate: 3000, trajectories: 3 },
    dropRates: { machineGun: 0.2, missile: 0.1, repair: 0.25, engine: 0.1 }
  },
  red: {
    type: 'red',
    health: 20,
    speed: 1,
    attackPower: 1,
    machineGun: { bulletsPerShot: 6, bulletDamage: 3, bulletSpeed: 20, fireRate: 3000, trajectories: 3 },
    missileLauncher: { missileCount: Infinity, missileDamage: 5, missileSpeed: 12, fireRate: 2000 },
    dropRates: { machineGun: 0.2, missile: 0.1, repair: 0.25, engine: 0.1 }
  }
}
```

### 像素风格配置

```typescript
const PIXEL_STYLE = {
  fonts: {
    primary: '16px "Press Start 2P", monospace',
    enemy: '14px SimSun, serif', // 宋体
    ui: '12px "Press Start 2P", monospace'
  },
  colors: {
    player: '#00FF00',
    playerBullet: '#FFFF00',
    playerMissile: '#FF6600',
    enemyWhite: '#FFFFFF',
    enemyGreen: '#00FF00',
    enemyBlue: '#0099FF',
    enemyPurple: '#9933FF',
    enemyYellow: '#FFFF00',
    enemyOrange: '#FF9900',
    enemyRed: '#FF0000',
    background: '#000000',
    ui: '#00FF00'
  },
  arcade: {
    borderWidth: 8,
    borderColor: '#8B4513',
    cornerRadius: 4,
    screenGlow: 'rgba(0, 255, 0, 0.1)'
  }
}
```

## 错误处理

### 错误类型

```typescript
class GameError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'GameError'
  }
}

enum GameErrorCode {
  CANVAS_NOT_SUPPORTED = 'CANVAS_NOT_SUPPORTED',
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  RESOURCE_LOAD_FAILED = 'RESOURCE_LOAD_FAILED',
  RUNTIME_ERROR = 'RUNTIME_ERROR'
}
```

### 错误处理策略

1. **Canvas不支持**: 显示友好提示，不启动游戏
2. **初始化失败**: 记录错误日志，恢复正常页面
3. **运行时错误**: 捕获错误，暂停游戏，提供重试或退出选项
4. **资源加载失败**: 使用降级方案或默认资源

```typescript
class GameErrorHandler {
  handleError(error: GameError): void {
    console.error(`[Game Error ${error.code}]:`, error.message)
    
    switch (error.code) {
      case GameErrorCode.CANVAS_NOT_SUPPORTED:
        this.showUnsupportedMessage()
        break
      case GameErrorCode.INITIALIZATION_FAILED:
        this.restoreNormalPage()
        break
      case GameErrorCode.RUNTIME_ERROR:
        this.pauseAndShowError(error)
        break
    }
  }
  
  showUnsupportedMessage(): void
  restoreNormalPage(): void
  pauseAndShowError(error: Error): void
}
```

## 测试策略

### 单元测试

**测试框架**: Vitest

**测试覆盖**:
1. **实体系统测试**
   - 玩家移动边界检测
   - 武器发射逻辑
   - 敌人AI追踪算法
   - 碰撞检测准确性

2. **武器系统测试**
   - 机炮升级效果
   - 导弹爆炸范围计算
   - 核弹进度累积

3. **关卡系统测试**
   - 敌人生成频率
   - 关卡切换逻辑
   - Boss生成条件

4. **掉落系统测试**
   - 概率分布验证
   - 升级效果应用

示例测试:
```typescript
describe('PlayerAircraft', () => {
  it('should not move beyond canvas boundaries', () => {
    const player = new PlayerAircraft(400, 300)
    player.move('left')
    // 移动多次直到边界
    for (let i = 0; i < 100; i++) {
      player.update(16)
    }
    expect(player.x).toBeGreaterThanOrEqual(0)
  })
  
  it('should apply machine gun upgrade correctly', () => {
    const player = new PlayerAircraft(400, 300)
    const initialBullets = player.machineGun.config.bulletsPerShot
    player.applyUpgrade({ type: 'machinegun-bullets', appliedCount: 1 })
    expect(player.machineGun.config.bulletsPerShot).toBe(initialBullets + 1)
  })
})
```

### 集成测试

使用 Playwright 进行端到端测试:

```typescript
test('easter egg trigger flow', async ({ page }) => {
  await page.goto('/')
  
  // 点击头像3次
  const avatar = page.locator('.hero-avatar')
  await avatar.click()
  await avatar.click()
  await avatar.click()
  
  // 验证崩塌动画开始
  await expect(page.locator('.collapse-animation')).toBeVisible()
  
  // 等待CMD窗口出现
  await expect(page.locator('.cmd-window')).toBeVisible({ timeout: 10000 })
  
  // 输入 'y' 启动游戏
  await page.keyboard.type('y')
  await page.keyboard.press('Enter')
  
  // 验证游戏容器出现
  await expect(page.locator('.game-container')).toBeVisible()
})
```

### 性能测试

**目标指标**:
- 游戏帧率: 稳定60fps
- 内存使用: < 100MB
- 初始化时间: < 2秒
- 崩塌动画流畅度: 60fps

**测试方法**:
```typescript
class PerformanceMonitor {
  private frameCount = 0
  private lastTime = performance.now()
  
  measureFPS(): number {
    this.frameCount++
    const currentTime = performance.now()
    const elapsed = currentTime - this.lastTime
    
    if (elapsed >= 1000) {
      const fps = this.frameCount / (elapsed / 1000)
      this.frameCount = 0
      this.lastTime = currentTime
      return fps
    }
    return 0
  }
  
  measureMemory(): number {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize / 1048576 // MB
    }
    return 0
  }
}
```



## 正确性属性

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 点击计数器时间窗口
*For any* 点击序列，如果两次点击之间的时间间隔超过5秒，则计数器应该重置为0
**Validates: Requirements 1.1, 1.3**

### Property 2: 边界限制不变性
*For any* 玩家移动操作，玩家飞机的坐标应该始终在游戏窗口范围内 (0 <= x <= width, 0 <= y <= height)
**Validates: Requirements 5.6**

### Property 3: 碰撞检测对称性
*For any* 两个实体A和B，如果A与B碰撞，则B与A也应该碰撞
**Validates: Requirements 4.3**

### Property 4: 升级效果累积性
*For any* 升级序列，应用N次"增加子弹数量"升级后，子弹数量应该比初始值多N
**Validates: Requirements 6.5**

### Property 5: 导弹范围伤害一致性
*For any* 导弹爆炸位置，所有在3x3范围内的实体都应该受到相同的伤害值
**Validates: Requirements 7.3**

### Property 6: 核弹进度单调性
*For any* 击杀序列，当进度小于100时，每次击杀应该使进度增加1；当进度等于100时，击杀不应该改变进度
**Validates: Requirements 8.2, 8.4**

### Property 7: 核弹清屏完整性
*For any* 游戏状态，释放核弹后，屏幕上的所有敌人实体和敌方子弹实体的数量应该为0
**Validates: Requirements 8.5**

### Property 8: 敌人追踪方向性
*For any* 敌人和玩家位置，敌人移动后应该比移动前更接近玩家
**Validates: Requirements 9.3**

### Property 9: 碰撞伤害等价性
*For any* 敌人，当其与玩家碰撞时，玩家受到的伤害应该等于敌人的当前血量
**Validates: Requirements 9.6**

### Property 10: 掉落概率分布
*For any* 大量击杀样本（N >= 1000），机炮升级模块的掉落次数应该接近 N * 0.2 (误差范围 ±5%)
**Validates: Requirements 11.1**

### Property 11: 拾取效果原子性
*For any* 掉落物，当玩家接触后，掉落物应该被销毁且对应的升级效果应该被应用
**Validates: Requirements 11.7**

### Property 12: 关卡切换条件
*For any* 关卡，当且仅当该关卡的所有敌人被消灭时，系统应该切换到下一关
**Validates: Requirements 12.4**

### Property 13: 状态持久化完整性
*For any* 玩家状态（血量、速度、升级），在关卡切换前后，这些状态值应该保持不变
**Validates: Requirements 12.13, 18.1**

### Property 14: 游戏结束条件
*For any* 游戏状态，当且仅当玩家血量降至0时，游戏应该结束
**Validates: Requirements 13.4**

### Property 15: 帧率稳定性
*For any* 连续100帧的测量，平均帧率应该在55-65fps范围内
**Validates: Requirements 4.1, 17.1**

### Property 16: 敌人内容来源性
*For any* 生成的敌人，其显示文本应该存在于profile数据的技能、课程或项目名称中
**Validates: Requirements 19.1, 19.2, 19.3, 19.4**

### Property 17: UI数据一致性
*For any* 游戏状态，UI显示的血量、导弹数、关卡数应该与实际游戏状态的对应值相等
**Validates: Requirements 14.1, 14.3, 14.4**

