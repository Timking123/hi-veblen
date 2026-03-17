# 设计文档 - Website V3 大版本更新

## 项目信息

| 属性 | 值 |
|-----|-----|
| 功能名称 | website-v3-major-update |
| 优先级 | P0（最高优先级） |
| 设计版本 | 1.0.0 |
| 创建日期 | 2026-03-05 |
| 最后更新 | 2026-03-05 |

---

## Overview（概述）

### 设计目标

本设计文档针对 Vue3 个人作品集网站的 V3 大版本更新，旨在解决以下核心问题：

1. **背景显示修复**：修复教育经历、工作经历、技能展示页面的动态粒子背景显示问题
2. **亮色主题适配**：实现完整的亮色主题支持，确保所有页面元素在亮色模式下正确显示
3. **彩蛋游戏优化**：提升游戏性能，增强武器系统，修复掉落物 Bug
4. **移动端适配**：为游戏添加虚拟摇杆和触摸控制，实现完整的移动端支持

### 设计原则

1. **向后兼容**：所有更新不破坏现有功能，桌面端体验保持不变
2. **渐进增强**：移动端功能作为增强特性，不影响桌面端
3. **性能优先**：优化必须在不降低性能的前提下进行
4. **用户体验**：所有改动以提升用户体验为核心目标

### 技术栈

- **前端框架**：Vue 3.5.24 + TypeScript 5.9.3
- **构建工具**：Vite 7.2.5
- **状态管理**：Pinia 3.0.4
- **样式方案**：TailwindCSS 4.1.18 + CSS Variables
- **游戏引擎**：自研 Canvas 2D 游戏引擎
- **测试框架**：Vitest 4.0.18 + Playwright 1.58.0 + fast-check 4.5.3

---

## Architecture（架构）

### 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        Vue 3 应用层                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  页面组件层       │  │  游戏系统层       │  │  主题系统层   │ │
│  │                  │  │                  │  │              │ │
│  │  - Education.vue │  │  - GameEngine    │  │  - useTheme  │ │
│  │  - Experience.vue│  │  - InputManager  │  │  - CSS Vars  │ │
│  │  - Skills.vue    │  │  - MobileControl │  │  - Theme CSS │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│           │                     │                     │         │
│           └─────────────────────┼─────────────────────┘         │
│                                 ▼                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              通用组件和工具层                            │   │
│  │                                                         │   │
│  │  - ParticleBackground（背景渲染）                       │   │
│  │  - VirtualJoystick（虚拟摇杆）                          │   │
│  │  - TouchButton（触摸按钮）                              │   │
│  │  - ResponsiveDetector（响应式检测）                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                 │                               │
│                                 ▼                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   浏览器 API 层                          │   │
│  │                                                         │   │
│  │  - Canvas 2D API                                        │   │
│  │  - Touch Events API                                     │   │
│  │  - LocalStorage API                                     │   │
│  │  - MediaQuery API                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 模块划分

#### 1. 背景显示修复模块

**职责**：修复特定页面的背景显示问题

**核心组件**：
- `ParticleBackground.vue`：粒子背景组件
- `Education.vue`、`Experience.vue`、`Skills.vue`：页面组件

**关键修改**：
- 移除页面级别的背景覆盖样式
- 确保 `ParticleBackground` 组件在所有页面正确渲染
- 调整 z-index 层级关系

#### 2. 亮色主题适配模块

**职责**：实现完整的亮色主题支持

**核心组件**：
- `useTheme.ts`：主题管理 Composable
- `variables.css`：CSS 变量定义
- `ParticleBackground.vue`：背景组件（需要主题适配）

**关键功能**：
- 亮色主题 CSS 变量定义
- 背景粒子颜色动态调整
- 文字颜色对比度优化
- 主题切换动画

#### 3. 彩蛋游戏优化模块

**职责**：优化游戏性能和武器系统

**核心组件**：
- `PlayerAircraft.ts`：玩家飞机实体
- `Missile.ts`：导弹实体
- `EffectSystem.ts`：效果系统

**关键优化**：
- 玩家移动速度提升 2 倍
- 导弹爆炸范围和伤害提升 1.5 倍
- 爆炸特效尺寸提升 1.5 倍
- 掉落物系统修复

#### 4. 移动端适配模块

**职责**：为游戏添加移动端控制支持

**核心组件**：
- `MobileController.ts`：移动端控制器
- `VirtualJoystick.vue`：虚拟摇杆组件
- `TouchButton.vue`：触摸按钮组件
- `EnhancedInputManager.ts`：增强输入管理器

**关键功能**：
- 虚拟摇杆控制飞机移动
- 触摸按钮控制武器发射
- 多点触控支持
- 响应式布局适配

---

## Components and Interfaces（组件和接口）

### 1. 背景显示修复相关组件

#### ParticleBackground 组件

**现有实现**：已存在，位于 `src/components/effects/ParticleBackground.vue`

**需要的修改**：
- 添加主题感知能力，根据当前主题调整粒子颜色
- 优化性能，确保在低端设备上也能流畅运行

**接口定义**：

```typescript
interface ParticleConfig {
  count?: number              // 粒子数量，默认 80
  color?: string              // 粒子颜色，默认 '#00D9FF'
  speed?: number              // 粒子速度，默认 0.5
  size?: number               // 粒子大小，默认 2
  connectionDistance?: number // 连接距离，默认 150
  theme?: 'dark' | 'light'    // 新增：主题模式
}
```

#### 页面组件修改

**Education.vue、Experience.vue、Skills.vue**

**需要的修改**：
- 移除页面级别的背景覆盖样式（如 `background: var(--bg-primary)`）
- 确保内容区域使用半透明背景，让粒子背景可见
- 调整 z-index 确保内容在背景之上

### 2. 亮色主题适配相关组件

#### useTheme Composable

**现有实现**：已存在，位于 `src/composables/useTheme.ts`

**需要的增强**：
- 确保主题切换时触发全局事件，通知所有组件更新
- 添加主题切换动画支持

**接口定义**：

```typescript
export type ThemeMode = 'dark' | 'light' | 'system'

export interface ThemeConfig {
  mode: ThemeMode
  resolvedTheme: 'dark' | 'light'
}

export interface UseThemeReturn {
  mode: Ref<ThemeMode>
  systemPrefersDark: Ref<boolean>
  resolvedTheme: ComputedRef<'dark' | 'light'>
  setTheme: (newMode: ThemeMode) => void
  cycleTheme: () => void
  initTheme: () => void
  cleanup: () => void
  reset: () => void
}
```

#### CSS Variables 扩展

**文件位置**：`src/styles/variables.css`

**需要添加的亮色主题变量**：

```css
[data-theme='light'] {
  /* 背景色 */
  --bg-primary: #f5f7fa;
  --bg-secondary: #ffffff;
  --bg-tertiary: #e8ecf1;
  
  /* 文字颜色 */
  --text-primary: #1a202c;
  --text-secondary: #4a5568;
  --text-tertiary: #718096;
  
  /* 主题色（保持不变，但需要调整透明度使用） */
  --primary: #00d9ff;
  --secondary: #7b61ff;
  --accent: #ff6b9d;
  
  /* 边框和分隔线 */
  --border-color: rgba(0, 0, 0, 0.1);
  --divider-color: rgba(0, 0, 0, 0.05);
  
  /* 卡片和容器 */
  --card-bg: rgba(255, 255, 255, 0.8);
  --card-border: rgba(0, 0, 0, 0.1);
  
  /* 粒子背景 */
  --particle-color: #00d9ff;
  --particle-opacity: 0.6;
}
```

### 3. 彩蛋游戏优化相关组件

#### PlayerAircraft 类

**现有实现**：已存在，位于 `src/game/entities/PlayerAircraft.ts`

**需要的修改**：
- 修改 `speed` 属性的初始值，从当前值提升到 2 倍
- 或者修改 `move()` 方法中的移动距离计算

**接口定义**：

```typescript
export class PlayerAircraft implements Entity {
  id: string
  x: number
  y: number
  width: number
  height: number
  isActive: boolean
  health: number
  maxHealth: number
  speed: number  // 需要提升到原来的 2 倍
  
  move(dx: number, dy: number): void
  takeDamage(amount: number): void
  heal(amount: number): void
  // ... 其他方法
}
```

#### Missile 类

**现有实现**：已存在，位于 `src/game/entities/Missile.ts`

**需要的修改**：
- 修改 `explosionRadius` 属性，提升到原来的 1.5 倍
- 修改 `damage` 属性，提升到原来的 1.5 倍
- 修改爆炸特效渲染，尺寸提升到原来的 1.5 倍

**接口定义**：

```typescript
export class Missile implements Entity {
  id: string
  x: number
  y: number
  width: number
  height: number
  isActive: boolean
  damage: number           // 需要提升到原来的 1.5 倍
  speed: number
  explosionRadius: number  // 需要提升到原来的 1.5 倍
  owner: 'player' | 'enemy'
  hasExploded: boolean
  
  explode(entities: Entity[]): void
  // ... 其他方法
}
```

#### EffectSystem 类

**现有实现**：已存在，位于 `src/game/EffectSystem.ts`

**需要的修改**：
- 修改爆炸特效的渲染尺寸，提升到原来的 1.5 倍

### 4. 移动端适配相关组件

#### MobileController 类（新增）

**文件位置**：`src/game/MobileController.ts`

**职责**：
- 检测设备类型（移动端/平板/桌面）
- 管理虚拟摇杆和触摸按钮的显示/隐藏
- 处理触摸事件并转换为游戏输入
- 支持多点触控

**接口定义**：

```typescript
export interface TouchPoint {
  id: number
  x: number
  y: number
  startX: number
  startY: number
  startTime: number
}

export interface JoystickState {
  active: boolean
  x: number  // -1 到 1
  y: number  // -1 到 1
  angle: number
  distance: number
}

export interface ButtonState {
  fire: boolean      // 开火键
  missile: boolean   // 导弹键
  nuke: boolean      // 核弹键
}

export class MobileController {
  private canvas: HTMLCanvasElement
  private isMobile: boolean
  private joystickState: JoystickState
  private buttonState: ButtonState
  private touchPoints: Map<number, TouchPoint>
  
  constructor(canvas: HTMLCanvasElement)
  
  // 检测是否为移动设备
  detectMobile(): boolean
  
  // 初始化触摸事件监听
  initialize(): void
  
  // 获取摇杆状态
  getJoystickState(): JoystickState
  
  // 获取按钮状态
  getButtonState(): ButtonState
  
  // 渲染虚拟控制器
  render(ctx: CanvasRenderingContext2D): void
  
  // 清理
  destroy(): void
}
```

#### VirtualJoystick 组件（新增）

**文件位置**：`src/game/ui/VirtualJoystick.vue`

**职责**：
- 渲染虚拟摇杆 UI
- 处理触摸拖动事件
- 计算摇杆方向和距离
- 提供视觉反馈

**接口定义**：

```typescript
interface VirtualJoystickProps {
  x: number          // 摇杆中心 X 坐标
  y: number          // 摇杆中心 Y 坐标
  radius: number     // 摇杆半径
  visible: boolean   // 是否可见
}

interface VirtualJoystickEmits {
  (e: 'move', direction: { x: number; y: number }): void
  (e: 'release'): void
}
```

#### TouchButton 组件（新增）

**文件位置**：`src/game/ui/TouchButton.vue`

**职责**：
- 渲染触摸按钮 UI
- 处理按下/释放事件
- 提供视觉和触觉反馈
- 支持长按和点击

**接口定义**：

```typescript
interface TouchButtonProps {
  x: number          // 按钮中心 X 坐标
  y: number          // 按钮中心 Y 坐标
  size: number       // 按钮尺寸
  label: string      // 按钮标签
  color: string      // 按钮颜色
  visible: boolean   // 是否可见
}

interface TouchButtonEmits {
  (e: 'press'): void
  (e: 'release'): void
}
```

#### EnhancedInputManager 类（增强）

**现有实现**：已存在，位于 `src/game/EnhancedInputManager.ts`

**需要的增强**：
- 集成 MobileController
- 统一处理键盘和触摸输入
- 提供统一的输入查询接口

**接口定义**：

```typescript
export interface InputState {
  // 移动方向
  moveX: number  // -1, 0, 1
  moveY: number  // -1, 0, 1
  
  // 武器按键
  fire: boolean
  missile: boolean
  nuke: boolean
  
  // 输入源
  source: 'keyboard' | 'touch'
}

export class EnhancedInputManager {
  private inputManager: InputManager
  private mobileController: MobileController | null
  
  constructor(canvas: HTMLCanvasElement)
  
  // 获取当前输入状态
  getInputState(): InputState
  
  // 初始化
  initialize(): void
  
  // 更新（每帧调用）
  update(): void
  
  // 渲染移动端控制器
  render(ctx: CanvasRenderingContext2D): void
  
  // 清理
  destroy(): void
}
```

### 5. 响应式检测工具

#### ResponsiveDetector 工具类（新增）

**文件位置**：`src/utils/responsiveDetector.ts`

**职责**：
- 检测设备类型（移动端/平板/桌面）
- 检测屏幕方向（横屏/竖屏）
- 监听屏幕尺寸变化
- 提供响应式断点查询

**接口定义**：

```typescript
export type DeviceType = 'mobile' | 'tablet' | 'desktop'
export type Orientation = 'portrait' | 'landscape'

export interface ScreenInfo {
  width: number
  height: number
  deviceType: DeviceType
  orientation: Orientation
  isTouchDevice: boolean
  pixelRatio: number
}

export class ResponsiveDetector {
  private static instance: ResponsiveDetector
  private screenInfo: ScreenInfo
  private listeners: Set<(info: ScreenInfo) => void>
  
  static getInstance(): ResponsiveDetector
  
  // 获取当前屏幕信息
  getScreenInfo(): ScreenInfo
  
  // 检测设备类型
  detectDeviceType(): DeviceType
  
  // 检测屏幕方向
  detectOrientation(): Orientation
  
  // 检测是否为触摸设备
  isTouchDevice(): boolean
  
  // 添加监听器
  addListener(callback: (info: ScreenInfo) => void): void
  
  // 移除监听器
  removeListener(callback: (info: ScreenInfo) => void): void
}
```

---

## Data Models（数据模型）

### 1. 主题配置模型

```typescript
// 主题模式
export type ThemeMode = 'dark' | 'light' | 'system'

// 主题配置
export interface ThemeConfig {
  mode: ThemeMode
  resolvedTheme: 'dark' | 'light'
}

// 主题颜色配置
export interface ThemeColors {
  // 背景色
  bgPrimary: string
  bgSecondary: string
  bgTertiary: string
  
  // 文字颜色
  textPrimary: string
  textSecondary: string
  textTertiary: string
  
  // 主题色
  primary: string
  secondary: string
  accent: string
  
  // 边框和分隔线
  borderColor: string
  dividerColor: string
  
  // 卡片和容器
  cardBg: string
  cardBorder: string
  
  // 粒子背景
  particleColor: string
  particleOpacity: number
}
```

### 2. 游戏配置模型

```typescript
// 玩家配置
export interface PlayerConfig {
  initialHealth: number
  initialSpeed: number      // 需要提升到原来的 2 倍
  moveDistance: number
  width: number
  height: number
}

// 导弹配置
export interface MissileConfig {
  damage: number            // 需要提升到原来的 1.5 倍
  speed: number
  explosionRadius: number   // 需要提升到原来的 1.5 倍
  explosionDuration: number
  width: number
  height: number
}

// 爆炸效果配置
export interface ExplosionConfig {
  small: number
  medium: number
  large: number
  huge: number              // 所有尺寸需要提升到原来的 1.5 倍
}

// 游戏常量（需要更新）
export const GAME_CONFIG = {
  PLAYER_INITIAL_SPEED: 8,  // 从 4 提升到 8（2 倍）
  // ... 其他配置
}

export const MISSILE_CONFIG = {
  PLAYER_MISSILE_DAMAGE: 75,        // 从 50 提升到 75（1.5 倍）
  PLAYER_MISSILE_EXPLOSION_RADIUS: 7.5,  // 从 5 提升到 7.5（1.5 倍）
  // ... 其他配置
}
```

### 3. 移动端控制模型

```typescript
// 触摸点
export interface TouchPoint {
  id: number
  x: number
  y: number
  startX: number
  startY: number
  startTime: number
}

// 摇杆状态
export interface JoystickState {
  active: boolean
  x: number          // -1 到 1
  y: number          // -1 到 1
  angle: number      // 0 到 2π
  distance: number   // 0 到 1
}

// 按钮状态
export interface ButtonState {
  fire: boolean
  missile: boolean
  nuke: boolean
}

// 输入状态
export interface InputState {
  moveX: number      // -1, 0, 1
  moveY: number      // -1, 0, 1
  fire: boolean
  missile: boolean
  nuke: boolean
  source: 'keyboard' | 'touch'
}

// 移动端控制器配置
export interface MobileControllerConfig {
  // 摇杆配置
  joystick: {
    x: number
    y: number
    radius: number
    deadZone: number
  }
  
  // 按钮配置
  buttons: {
    fire: { x: number; y: number; size: number; label: string; color: string }
    missile: { x: number; y: number; size: number; label: string; color: string }
    nuke: { x: number; y: number; size: number; label: string; color: string }
  }
  
  // 样式配置
  style: {
    opacity: number
    activeOpacity: number
    vibration: boolean
  }
}
```

### 4. 响应式配置模型

```typescript
// 设备类型
export type DeviceType = 'mobile' | 'tablet' | 'desktop'

// 屏幕方向
export type Orientation = 'portrait' | 'landscape'

// 屏幕信息
export interface ScreenInfo {
  width: number
  height: number
  deviceType: DeviceType
  orientation: Orientation
  isTouchDevice: boolean
  pixelRatio: number
}

// 响应式断点
export interface ResponsiveBreakpoints {
  mobile: number    // < 768px
  tablet: number    // 768px - 1024px
  desktop: number   // > 1024px
}

// 游戏画布配置（响应式）
export interface GameCanvasConfig {
  width: number
  height: number
  scale: number
  uiScale: number
}
```

### 5. 掉落物模型（修复相关）

```typescript
// 掉落物类型
export type PickupType = 'health' | 'weapon' | 'speed' | 'shield'

// 掉落物配置
export interface PickupConfig {
  type: PickupType
  value: number
  duration: number  // 持续时间（毫秒）
  sprite: string    // 精灵图标识
}

// 掉落物实体
export interface Pickup extends Entity {
  id: string
  x: number
  y: number
  width: number
  height: number
  isActive: boolean
  type: PickupType
  value: number
  
  // 需要修复的方法
  onPickup(player: PlayerAircraft): void
  update(deltaTime: number): void
  render(ctx: CanvasRenderingContext2D): void
}
```

---

## Correctness Properties（正确性属性）

*属性（Property）是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性反思

在分析验收标准后，我识别出以下冗余并进行了合并：

1. **需求 5.5 和 6.7 重复**：都是测试触摸按钮的视觉反馈，合并为属性 5
2. **需求 3.6 和 10.3 重复**：都是测试桌面端游戏帧率 60 FPS，合并为属性 8
3. **需求 1.1、1.2、1.3 合并**：都是测试特定页面的背景显示，合并为一个综合测试

### 背景显示修复属性

#### 属性 1：页面背景渲染一致性

*对于任意*需要显示动态背景的页面（教育经历、工作经历、技能展示），访问该页面时，应该渲染与首页相同的 ParticleBackground 组件，且 Canvas 元素应该存在并正在执行动画。

**验证：需求 1.1, 1.2, 1.3**

#### 属性 2：背景无遮罩覆盖

*对于任意*需要显示动态背景的页面，页面容器元素不应该有纯色背景样式覆盖在 ParticleBackground 之上，确保粒子背景可见。

**验证：需求 1.4**

#### 属性 3：背景动画帧率保证

*对于任意*显示 ParticleBackground 的页面，背景动画的帧率应该不低于 30 FPS，确保流畅的视觉体验。

**验证：需求 1.5**

### 亮色主题适配属性

#### 属性 4：主题切换背景颜色适配

*对于任意*主题模式（深色/亮色），切换主题后，ParticleBackground 组件的粒子颜色应该调整为适合该主题的配色方案。

**验证：需求 2.1**


#### 属性 5：主题切换文字颜色适配

*对于任意*文字元素，切换到亮色主题后，文字颜色应该调整为深色，确保在亮色背景下可读。

**验证：需求 2.2**

#### 属性 6：主题切换 UI 元素颜色适配

*对于任意*UI 元素（按钮、卡片、边框等），切换到亮色主题后，颜色应该调整为适配亮色背景的配色方案。

**验证：需求 2.3**

#### 属性 7：亮色主题对比度符合标准

*对于任意*文字元素，在亮色主题下，文字与背景的颜色对比度应该至少为 4.5:1，符合 WCAG AA 标准。

**验证：需求 2.4**

#### 属性 8：主题偏好持久化往返

*对于任意*主题选择（dark/light/system），设置主题后，localStorage 应该保存该选择；刷新页面后，应该从 localStorage 读取并恢复该主题。

**验证：需求 2.6**

### 彩蛋游戏优化属性

#### 属性 9：玩家移动速度提升

*对于任意*玩家飞机移动操作，移动速度应该是原来的 2 倍（从 4 提升到 8）。

**验证：需求 3.1**

#### 属性 10：导弹爆炸范围提升

*对于任意*导弹爆炸，爆炸范围应该是原来的 1.5 倍（从 5 提升到 7.5）。

**验证：需求 3.2**

#### 属性 11：导弹爆炸伤害提升

*对于任意*导弹爆炸，对敌人造成的伤害应该是原来的 1.5 倍（从 50 提升到 75）。

**验证：需求 3.3**

#### 属性 12：爆炸特效尺寸提升

*对于任意*导弹爆炸，爆炸特效的渲染尺寸应该是原来的 1.5 倍。

**验证：需求 3.4**


#### 属性 13：爆炸范围伤害正确性

*对于任意*导弹爆炸和任意敌人位置，如果敌人在爆炸范围内（距离爆炸中心小于爆炸半径），敌人应该受到伤害。

**验证：需求 3.5**

#### 属性 14：游戏帧率稳定性

*对于任意*游戏运行状态，在桌面端游戏帧率应该稳定在 60 FPS，在移动端应该稳定在 30 FPS 以上。

**验证：需求 3.6, 10.3, 10.4**

### 彩蛋游戏 Bug 修复属性

#### 属性 15：掉落物生成正确性

*对于任意*被摧毁的敌人，应该根据配置的概率正确生成掉落物。

**验证：需求 4.2**

#### 属性 16：掉落物拾取触发

*对于任意*掉落物和玩家飞机的碰撞，应该触发拾取效果，掉落物应该被标记为不活跃。

**验证：需求 4.3**

#### 属性 17：生命值掉落物效果

*对于任意*生命值掉落物，拾取后玩家的生命值应该增加对应的数值（不超过最大生命值）。

**验证：需求 4.4**

#### 属性 18：武器掉落物效果

*对于任意*武器掉落物，拾取后玩家应该获得对应的武器强化效果（如火力提升、射速提升等）。

**验证：需求 4.5**

#### 属性 19：掉落物显示和移动

*对于任意*掉落物，应该在屏幕范围内正确渲染，并按照配置的速度向下移动。

**验证：需求 4.6**

### 移动端控制属性

#### 属性 20：虚拟摇杆方向控制

*对于任意*虚拟摇杆拖动方向（角度和距离），玩家飞机应该向对应方向移动，移动速度与摇杆距离成正比。

**验证：需求 6.2**


#### 属性 21：触摸按钮视觉反馈

*对于任意*触摸按钮，按下时应该显示视觉反馈效果（如颜色变化、缩放动画等）。

**验证：需求 5.5, 6.7**

#### 属性 22：开火键持续射击

*对于任意*开火键按住操作，玩家飞机应该持续发射机炮子弹，直到松开按键。

**验证：需求 6.8**

#### 属性 23：导弹键发射导弹

*对于任意*导弹键点击操作，玩家飞机应该发射一枚导弹（如果导弹数量充足）。

**验证：需求 6.9**

#### 属性 24：核弹键释放核弹

*对于任意*核弹键点击操作，玩家飞机应该释放核弹攻击（如果核弹进度已满）。

**验证：需求 6.10**

#### 属性 25：虚拟摇杆复位

*对于任意*虚拟摇杆拖动操作，松开触摸后，摇杆应该返回中心位置，玩家飞机停止移动。

**验证：需求 6.11**

#### 属性 26：触摸控制响应延迟

*对于任意*触摸操作（摇杆拖动或按钮点击），从触摸事件触发到游戏响应的延迟应该不超过 50 毫秒。

**验证：需求 6.12**

### 响应式布局属性

#### 属性 27：游戏画布自适应

*对于任意*屏幕尺寸，游戏画布应该自动调整大小以适配屏幕，保持合适的宽高比。

**验证：需求 7.1**

#### 属性 28：控制器尺寸自适应

*对于任意*屏幕尺寸，虚拟摇杆和触摸按钮的大小应该根据屏幕尺寸自动调整，保持合适的比例。

**验证：需求 7.4**


#### 属性 29：控制器不遮挡游戏画面

*对于任意*虚拟摇杆和触摸按钮的位置，应该不遮挡重要的游戏画面区域（如玩家飞机、敌人、UI 信息等）。

**验证：需求 7.5**

#### 属性 30：UI 元素响应式调整

*对于任意*屏幕尺寸，游戏 UI 元素（生命值条、分数显示、武器状态等）的位置和大小应该自动调整以适配屏幕。

**验证：需求 7.6**

#### 属性 31：触摸目标最小尺寸

*对于任意*触摸目标（按钮、摇杆等），最小尺寸应该为 44x44 像素，符合可访问性标准。

**验证：需求 7.8**

### 移动端触摸体验属性

#### 属性 32：多点触控支持

*对于任意*同时触摸虚拟摇杆和按钮的操作，两者应该都能正常工作，互不干扰。

**验证：需求 8.1**

#### 属性 33：虚拟摇杆即时响应

*对于任意*虚拟摇杆触摸操作，摇杆应该立即响应，延迟应该小于 50 毫秒。

**验证：需求 8.2**

#### 属性 34：触觉反馈支持

*对于任意*触摸按钮按下操作，如果设备支持振动 API，应该触发触觉反馈（振动）。

**验证：需求 8.3**

#### 属性 35：快速连续输入处理

*对于任意*快速连续点击按钮的操作，所有输入事件都应该被正确处理，不应该丢失事件。

**验证：需求 8.4**

#### 属性 36：阻止浏览器默认行为

*对于任意*触摸操作，不应该触发浏览器的默认行为（如页面滚动、缩放、文本选择、长按菜单等）。

**验证：需求 8.5**


#### 属性 37：摇杆边界行为

*对于任意*虚拟摇杆拖动操作，当用户手指移出摇杆区域时，摇杆应该保持最后的方向输入，直到松开触摸。

**验证：需求 8.6**

#### 属性 38：暂停时禁用控制

*对于任意*游戏暂停状态，所有触摸控制（摇杆和按钮）应该被禁用，不响应触摸事件。

**验证：需求 8.7**

### 性能属性

#### 属性 39：首屏加载时间

*对于任意*设备类型，桌面端首屏加载时间应该不超过 3 秒，移动端应该不超过 5 秒。

**验证：需求 10.1, 10.2**

#### 属性 40：构建产物体积控制

*对于任意*生产构建，构建产物的总体积应该不超过原体积的 120%。

**验证：需求 10.7**

---

## Error Handling（错误处理）

### 1. 主题系统错误处理

#### LocalStorage 不可用

**场景**：用户浏览器禁用了 LocalStorage 或处于隐私模式

**处理策略**：
- 使用内存中的主题状态，不进行持久化
- 在控制台输出警告信息
- 使用系统主题作为默认值
- 不影响主题切换功能的正常使用

**代码示例**：
```typescript
try {
  localStorage.setItem(STORAGE_KEY, newMode)
} catch (error) {
  console.warn('[useTheme] localStorage 不可用，主题偏好不会被持久化')
}
```

#### MediaQuery API 不支持

**场景**：旧版浏览器不支持 `matchMedia` API

**处理策略**：
- 检测 API 是否存在
- 降级到默认深色主题
- 禁用系统主题跟随功能


### 2. 游戏系统错误处理

#### Canvas 上下文获取失败

**场景**：浏览器不支持 Canvas 2D 或 Canvas 初始化失败

**处理策略**：
- 抛出明确的错误信息
- 显示友好的错误提示给用户
- 建议用户升级浏览器或使用其他浏览器

**代码示例**：
```typescript
const ctx = canvas.getContext('2d')
if (!ctx) {
  throw new Error('无法获取 Canvas 2D 上下文，请检查浏览器兼容性')
}
```

#### 音频系统初始化失败

**场景**：浏览器不支持 Web Audio API 或音频文件加载失败

**处理策略**：
- 捕获初始化错误
- 游戏继续运行，但禁用音频功能
- 在控制台输出错误信息
- 不影响游戏核心玩法

**代码示例**：
```typescript
try {
  await this.audioSystem.initialize()
} catch (error) {
  console.error('[游戏引擎] 音频系统初始化失败:', error)
  // 游戏继续运行，音频功能禁用
}
```

#### 实体碰撞检测异常

**场景**：实体数据异常导致碰撞检测失败

**处理策略**：
- 使用 try-catch 包裹碰撞检测逻辑
- 记录异常实体信息
- 跳过异常实体，继续处理其他实体
- 防止单个实体异常导致整个游戏崩溃

### 3. 移动端控制错误处理

#### Touch Events API 不支持

**场景**：旧版浏览器不支持 Touch Events API

**处理策略**：
- 检测 API 是否存在
- 降级到鼠标事件处理
- 或者显示提示信息，建议使用支持触摸的设备

**代码示例**：
```typescript
if ('ontouchstart' in window) {
  // 使用触摸事件
  canvas.addEventListener('touchstart', this.handleTouchStart)
} else {
  // 降级到鼠标事件
  canvas.addEventListener('mousedown', this.handleMouseDown)
}
```


#### Vibration API 不支持

**场景**：设备或浏览器不支持 Vibration API

**处理策略**：
- 检测 API 是否存在
- 如果不支持，跳过振动功能
- 不影响触摸控制的其他功能

**代码示例**：
```typescript
if ('vibrate' in navigator) {
  navigator.vibrate(50)
} else {
  // 设备不支持振动，跳过
}
```

#### 多点触控冲突

**场景**：多个触摸点同时操作导致状态冲突

**处理策略**：
- 使用 Map 存储每个触摸点的状态
- 通过 touch identifier 区分不同的触摸点
- 确保每个触摸点独立处理，互不干扰

### 4. 响应式布局错误处理

#### 屏幕尺寸异常

**场景**：获取到的屏幕尺寸为 0 或异常值

**处理策略**：
- 使用默认的最小尺寸（如 320x568）
- 在控制台输出警告信息
- 监听 resize 事件，等待正确的尺寸

#### 设备类型检测失败

**场景**：无法准确检测设备类型

**处理策略**：
- 使用保守的默认值（假设为移动设备）
- 提供手动切换控制模式的选项
- 根据屏幕尺寸进行降级判断

### 5. 性能降级策略

#### 低端设备检测

**场景**：检测到设备性能较低（如帧率持续低于阈值）

**处理策略**：
- 降低粒子数量
- 减少特效复杂度
- 降低游戏更新频率
- 简化渲染效果

**代码示例**：
```typescript
if (this.fps < 20) {
  // 降低粒子数量
  this.particleCount = Math.max(20, this.particleCount * 0.5)
  console.warn('[性能优化] 检测到低帧率，降低粒子数量')
}
```

---

## Testing Strategy（测试策略）

### 测试方法论

本项目采用**双重测试方法**：

1. **单元测试（Unit Tests）**：验证具体示例、边缘情况和错误条件
2. **属性测试（Property-Based Tests）**：验证通用属性在所有输入下的正确性

两种测试方法互补，共同确保全面的测试覆盖。


### 单元测试策略

#### 测试范围

单元测试专注于：
- **具体示例**：特定页面的背景显示、特定按钮的功能
- **边缘情况**：空值处理、边界值、异常输入
- **错误条件**：API 不可用、资源加载失败、异常状态
- **集成点**：组件之间的交互、事件传递

#### 测试工具

- **Vitest 4.0.18**：单元测试框架
- **@vue/test-utils**：Vue 组件测试工具
- **jsdom**：DOM 环境模拟

#### 单元测试示例

**背景显示测试**：
```typescript
describe('ParticleBackground', () => {
  it('应该在教育经历页面显示', async () => {
    const wrapper = mount(Education)
    await nextTick()
    
    const background = wrapper.findComponent(ParticleBackground)
    expect(background.exists()).toBe(true)
  })
  
  it('应该在亮色主题下使用浅色粒子', async () => {
    const { setTheme } = useTheme()
    setTheme('light')
    
    const wrapper = mount(ParticleBackground)
    await nextTick()
    
    const canvas = wrapper.find('canvas')
    // 验证粒子颜色
  })
})
```

**移动端控制测试**：
```typescript
describe('MobileController', () => {
  it('应该在移动设备上显示虚拟摇杆', () => {
    // 模拟移动设备
    Object.defineProperty(window, 'innerWidth', { value: 375 })
    
    const controller = new MobileController(canvas)
    controller.initialize()
    
    expect(controller.isMobile).toBe(true)
    // 验证摇杆显示
  })
  
  it('应该在桌面设备上隐藏虚拟摇杆', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1920 })
    
    const controller = new MobileController(canvas)
    controller.initialize()
    
    expect(controller.isMobile).toBe(false)
  })
})
```

### 属性测试策略

#### 测试范围

属性测试专注于：
- **通用属性**：适用于所有输入的规则
- **不变量**：系统状态的不变性
- **往返属性**：操作的可逆性
- **关系属性**：输入输出之间的关系

#### 测试工具

- **fast-check 4.5.3**：属性测试库
- **最小迭代次数**：100 次（由于随机化）


#### 属性测试配置

每个属性测试必须：
- 运行至少 100 次迭代
- 使用注释标签引用设计文档中的属性
- 标签格式：`Feature: website-v3-major-update, Property {number}: {property_text}`

#### 属性测试示例

**主题往返属性测试**：
```typescript
import fc from 'fast-check'

describe('Theme System Properties', () => {
  // Feature: website-v3-major-update, Property 8: 主题偏好持久化往返
  it('主题设置后应该能从 localStorage 恢复', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('dark', 'light', 'system'),
        (themeMode) => {
          const { setTheme, initTheme, mode } = useTheme()
          
          // 设置主题
          setTheme(themeMode)
          
          // 验证 localStorage
          const saved = localStorage.getItem('theme-preference')
          expect(saved).toBe(themeMode)
          
          // 重新初始化
          initTheme()
          
          // 验证恢复
          expect(mode.value).toBe(themeMode)
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

**导弹爆炸范围属性测试**：
```typescript
describe('Missile System Properties', () => {
  // Feature: website-v3-major-update, Property 13: 爆炸范围伤害正确性
  it('爆炸范围内的所有敌人都应该受到伤害', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 800 }), // 导弹 X
        fc.float({ min: 0, max: 600 }), // 导弹 Y
        fc.array(fc.record({
          x: fc.float({ min: 0, max: 800 }),
          y: fc.float({ min: 0, max: 600 }),
          health: fc.integer({ min: 1, max: 100 })
        }), { minLength: 1, maxLength: 10 }), // 敌人数组
        (missileX, missileY, enemies) => {
          const missile = new Missile(missileX, missileY, 75, 12, 7.5, 'player')
          const entities = enemies.map(e => new Enemy(e.x, e.y, e.health))
          
          // 记录初始血量
          const initialHealths = entities.map(e => e.health)
          
          // 触发爆炸
          missile.explode(entities)
          
          // 验证：范围内的敌人应该受到伤害
          entities.forEach((enemy, i) => {
            const distance = Math.sqrt(
              (enemy.x - missileX) ** 2 + (enemy.y - missileY) ** 2
            )
            
            if (distance <= 75) { // 爆炸半径 7.5 * 10
              expect(enemy.health).toBeLessThan(initialHealths[i])
            }
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})
```


**虚拟摇杆控制属性测试**：
```typescript
describe('Virtual Joystick Properties', () => {
  // Feature: website-v3-major-update, Property 20: 虚拟摇杆方向控制
  it('摇杆方向应该正确控制飞机移动', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 2 * Math.PI }), // 角度
        fc.float({ min: 0, max: 1 }), // 距离
        (angle, distance) => {
          const controller = new MobileController(canvas)
          const player = new PlayerAircraft(400, 300)
          
          // 模拟摇杆输入
          controller.setJoystickState({ angle, distance })
          
          const initialX = player.x
          const initialY = player.y
          
          // 更新玩家位置
          const input = controller.getInputState()
          player.move(input.moveX, input.moveY)
          
          // 验证移动方向
          const actualAngle = Math.atan2(
            player.y - initialY,
            player.x - initialX
          )
          
          // 允许一定的误差
          const angleDiff = Math.abs(actualAngle - angle)
          expect(angleDiff).toBeLessThan(0.1)
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### E2E 测试策略

#### 测试范围

E2E 测试覆盖：
- **用户流程**：完整的用户交互流程
- **跨页面交互**：页面导航、状态保持
- **真实浏览器环境**：不同浏览器和设备的兼容性
- **视觉回归**：UI 变化检测

#### 测试工具

- **Playwright 1.58.0**：E2E 测试框架
- **支持的浏览器**：Chromium、Firefox、WebKit

#### E2E 测试示例

**背景显示 E2E 测试**：
```typescript
import { test, expect } from '@playwright/test'

test.describe('背景显示修复', () => {
  test('教育经历页面应该显示动态背景', async ({ page }) => {
    await page.goto('/education')
    
    // 验证 ParticleBackground 组件存在
    const canvas = page.locator('.particle-canvas')
    await expect(canvas).toBeVisible()
    
    // 验证动画正在运行（检查 canvas 内容变化）
    const frame1 = await canvas.screenshot()
    await page.waitForTimeout(100)
    const frame2 = await canvas.screenshot()
    
    expect(frame1).not.toEqual(frame2)
  })
})
```


**主题切换 E2E 测试**：
```typescript
test.describe('亮色主题适配', () => {
  test('切换到亮色主题后文字应该变为深色', async ({ page }) => {
    await page.goto('/')
    
    // 切换到亮色主题
    await page.click('[data-testid="theme-toggle"]')
    await page.click('[data-testid="theme-light"]')
    
    // 验证 data-theme 属性
    const theme = await page.getAttribute('html', 'data-theme')
    expect(theme).toBe('light')
    
    // 验证文字颜色
    const textColor = await page.locator('.page-title').evaluate(
      el => window.getComputedStyle(el).color
    )
    
    // 深色文字的 RGB 值应该较小
    const rgb = textColor.match(/\d+/g)?.map(Number)
    expect(rgb).toBeDefined()
    expect(rgb![0]).toBeLessThan(100) // R
    expect(rgb![1]).toBeLessThan(100) // G
    expect(rgb![2]).toBeLessThan(100) // B
  })
})
```

**移动端控制 E2E 测试**：
```typescript
test.describe('移动端游戏控制', () => {
  test.use({ viewport: { width: 375, height: 667 } })
  
  test('移动设备上应该显示虚拟摇杆', async ({ page }) => {
    await page.goto('/game')
    
    // 触发游戏开始
    await page.click('[data-testid="start-game"]')
    
    // 验证虚拟摇杆显示
    const joystick = page.locator('[data-testid="virtual-joystick"]')
    await expect(joystick).toBeVisible()
    
    // 验证触摸按钮显示
    const fireButton = page.locator('[data-testid="fire-button"]')
    await expect(fireButton).toBeVisible()
  })
  
  test('虚拟摇杆应该控制飞机移动', async ({ page }) => {
    await page.goto('/game')
    await page.click('[data-testid="start-game"]')
    
    // 获取玩家初始位置
    const initialPos = await page.evaluate(() => {
      const player = document.querySelector('[data-entity="player"]')
      return {
        x: parseFloat(player?.getAttribute('data-x') || '0'),
        y: parseFloat(player?.getAttribute('data-y') || '0')
      }
    })
    
    // 模拟摇杆拖动
    const joystick = page.locator('[data-testid="virtual-joystick"]')
    await joystick.dragTo(joystick, {
      targetPosition: { x: 50, y: 0 } // 向右拖动
    })
    
    await page.waitForTimeout(500)
    
    // 获取玩家新位置
    const newPos = await page.evaluate(() => {
      const player = document.querySelector('[data-entity="player"]')
      return {
        x: parseFloat(player?.getAttribute('data-x') || '0'),
        y: parseFloat(player?.getAttribute('data-y') || '0')
      }
    })
    
    // 验证飞机向右移动
    expect(newPos.x).toBeGreaterThan(initialPos.x)
  })
})
```


### 性能测试策略

#### 测试指标

- **帧率（FPS）**：背景动画和游戏帧率
- **响应延迟**：触摸控制响应时间
- **加载时间**：首屏加载时间
- **内存使用**：长时间运行的内存占用

#### 性能测试工具

- **Lighthouse**：页面性能评分
- **Chrome DevTools Performance**：性能分析
- **自定义性能监控**：游戏内 FPS 计数器

#### 性能测试示例

**帧率监控测试**：
```typescript
describe('性能测试', () => {
  it('背景动画帧率应该不低于 30 FPS', async () => {
    const wrapper = mount(ParticleBackground)
    await nextTick()
    
    // 监控 1 秒内的帧率
    const fps = await new Promise<number>((resolve) => {
      let frameCount = 0
      const startTime = performance.now()
      
      const countFrame = () => {
        frameCount++
        const elapsed = performance.now() - startTime
        
        if (elapsed >= 1000) {
          resolve(frameCount)
        } else {
          requestAnimationFrame(countFrame)
        }
      }
      
      requestAnimationFrame(countFrame)
    })
    
    expect(fps).toBeGreaterThanOrEqual(30)
  })
})
```

### 测试覆盖率目标

- **单元测试覆盖率**：70% 以上
- **关键路径覆盖**：100%（主题切换、游戏控制、背景渲染）
- **属性测试**：每个设计属性至少一个测试
- **E2E 测试**：主要用户流程全覆盖

### 测试执行计划

#### 开发阶段

1. **TDD 开发**：先写测试，再写实现
2. **持续集成**：每次提交自动运行单元测试
3. **本地测试**：开发时运行相关测试

#### 集成阶段

1. **完整测试套件**：运行所有单元测试和属性测试
2. **E2E 测试**：在多个浏览器上运行 E2E 测试
3. **性能测试**：验证性能指标

#### 发布前

1. **回归测试**：完整的测试套件
2. **跨浏览器测试**：Chrome、Firefox、Safari、Edge
3. **跨设备测试**：桌面、移动、平板
4. **性能基准测试**：与基线版本对比

---

## 实现优先级和阶段划分

### 阶段 1：背景显示修复和亮色主题适配（P0）

**优先级**：最高

**工作内容**：
1. 修复教育经历、工作经历、技能展示页面的背景显示
2. 实现完整的亮色主题 CSS 变量
3. 适配 ParticleBackground 组件支持主题切换
4. 确保所有页面在亮色主题下的可读性

**预计工期**：3-5 天

**验收标准**：
- 所有页面背景正确显示
- 亮色主题下所有元素颜色正确
- 对比度符合 WCAG AA 标准
- 主题切换流畅无闪烁

### 阶段 2：彩蛋游戏优化和 Bug 修复（P0）

**优先级**：高

**工作内容**：
1. 提升玩家移动速度到 2 倍
2. 提升导弹爆炸范围和伤害到 1.5 倍
3. 提升爆炸特效尺寸到 1.5 倍
4. 修复掉落物生成和拾取 Bug
5. 隐藏游戏介绍页面滚动条

**预计工期**：2-3 天

**验收标准**：
- 游戏性能提升明显
- 掉落物系统正常工作
- 游戏帧率稳定在 60 FPS
- 无明显 Bug

### 阶段 3：移动端基础控制（P1）

**优先级**：中高

**工作内容**：
1. 实现设备类型检测（ResponsiveDetector）
2. 实现虚拟摇杆组件（VirtualJoystick）
3. 实现触摸按钮组件（TouchButton）
4. 实现移动端控制器（MobileController）
5. 集成到游戏引擎

**预计工期**：5-7 天

**验收标准**：
- 移动设备上显示虚拟控制器
- 摇杆和按钮响应正常
- 多点触控支持
- 响应延迟小于 50ms

### 阶段 4：移动端界面优化（P1）

**优先级**：中

**工作内容**：
1. 实现响应式布局系统
2. 优化游戏画布自适应
3. 调整 UI 元素位置和大小
4. 优化触摸目标尺寸
5. 实现横屏/竖屏适配

**预计工期**：3-4 天

**验收标准**：
- 所有屏幕尺寸下界面正常
- 触摸目标符合可访问性标准
- 横屏和竖屏都能正常游玩
- UI 元素不遮挡游戏画面


### 阶段 5：移动端体验优化（P2）

**优先级**：中低

**工作内容**：
1. 实现触觉反馈（振动）
2. 优化触摸事件处理
3. 防止浏览器默认行为
4. 优化快速连续输入处理
5. 实现暂停时禁用控制

**预计工期**：2-3 天

**验收标准**：
- 触觉反馈正常工作
- 无浏览器默认行为干扰
- 快速输入不丢失事件
- 暂停时控制正确禁用

### 阶段 6：测试和优化（P0）

**优先级**：最高

**工作内容**：
1. 编写单元测试
2. 编写属性测试
3. 编写 E2E 测试
4. 性能测试和优化
5. 跨浏览器兼容性测试
6. 跨设备兼容性测试

**预计工期**：5-7 天

**验收标准**：
- 测试覆盖率达到 70%
- 所有属性测试通过
- E2E 测试通过
- 性能指标达标
- 所有目标浏览器和设备兼容

---

## 技术决策和权衡

### 1. 虚拟控制器实现方式

**选项 A：Canvas 渲染**
- 优点：性能好，与游戏渲染统一
- 缺点：无法使用 CSS 样式，可访问性差

**选项 B：DOM 元素 + CSS**
- 优点：易于样式化，可访问性好，易于调试
- 缺点：可能有性能开销

**决策**：选择选项 B（DOM 元素 + CSS）

**理由**：
- 虚拟控制器不需要每帧渲染，性能开销可接受
- CSS 样式化更灵活，易于实现视觉反馈
- 更好的可访问性和调试体验
- 可以使用 Vue 组件，代码更清晰

### 2. 主题切换实现方式

**选项 A：CSS 类切换**
- 优点：简单直接
- 缺点：需要重复定义样式

**选项 B：CSS 变量**
- 优点：灵活，易于维护，支持动态切换
- 缺点：需要浏览器支持

**决策**：选择选项 B（CSS 变量）

**理由**：
- 现代浏览器都支持 CSS 变量
- 更易于维护和扩展
- 支持平滑的主题切换动画
- 已有的代码使用 CSS 变量


### 3. 设备检测方式

**选项 A：User Agent 检测**
- 优点：简单
- 缺点：不可靠，易被伪造

**选项 B：屏幕尺寸 + Touch Events 检测**
- 优点：更可靠，基于实际能力
- 缺点：需要综合判断

**决策**：选择选项 B（屏幕尺寸 + Touch Events 检测）

**理由**：
- 更准确地反映设备能力
- 不依赖可能被伪造的 User Agent
- 可以检测到混合设备（如触摸屏笔记本）
- 更符合渐进增强的理念

### 4. 游戏参数调整方式

**选项 A：直接修改常量**
- 优点：简单直接
- 缺点：不易回滚，难以 A/B 测试

**选项 B：配置文件 + 运行时调整**
- 优点：灵活，易于调整和测试
- 缺点：增加复杂度

**决策**：选择选项 A（直接修改常量）

**理由**：
- 这是一次性的参数调整，不需要频繁修改
- 简单直接，减少复杂度
- 如果需要回滚，可以通过 Git 版本控制
- 性能更好，无运行时开销

### 5. 触摸事件处理方式

**选项 A：原生 Touch Events**
- 优点：性能好，控制精确
- 缺点：需要处理兼容性

**选项 B：Pointer Events**
- 优点：统一处理触摸和鼠标，兼容性好
- 缺点：部分旧浏览器不支持

**决策**：选择选项 A（原生 Touch Events）+ 降级到鼠标事件

**理由**：
- 移动端主要使用 Touch Events，性能更好
- 可以精确控制多点触控
- 提供降级方案，确保兼容性
- 游戏场景对性能要求高

---

## 风险和缓解措施

### 风险 1：性能下降

**描述**：新增的移动端控制器可能影响游戏性能

**影响**：高

**缓解措施**：
- 虚拟控制器使用 DOM 渲染，不占用游戏 Canvas
- 触摸事件处理优化，避免频繁触发
- 性能监控，及时发现问题
- 提供降级方案，低端设备自动简化

### 风险 2：跨浏览器兼容性

**描述**：不同浏览器对 CSS 变量、Touch Events 的支持可能不同

**影响**：中

**缓解措施**：
- 使用 Autoprefixer 自动添加浏览器前缀
- 提供降级方案（如 localStorage 不可用时使用内存）
- 充分的跨浏览器测试
- 使用 Polyfill 填补 API 差异


### 风险 3：移动端体验不佳

**描述**：虚拟控制器可能不如物理按键好用

**影响**：中

**缓解措施**：
- 充分的用户测试，收集反馈
- 优化触摸反馈（视觉和触觉）
- 调整控制器尺寸和位置
- 提供自定义选项（如果时间允许）

### 风险 4：主题切换闪烁

**描述**：主题切换时可能出现短暂的样式闪烁

**影响**：低

**缓解措施**：
- 使用 CSS 过渡动画平滑切换
- 在 HTML 加载时立即应用主题
- 避免在主题切换时重新渲染大量组件
- 使用 `theme-transition` 类控制过渡

### 风险 5：掉落物 Bug 复现困难

**描述**：掉落物 Bug 可能难以稳定复现

**影响**：中

**缓解措施**：
- 详细的日志记录
- 属性测试覆盖掉落物逻辑
- 代码审查，检查逻辑错误
- 增加单元测试覆盖边缘情况

---

## 部署和发布计划

### 部署策略

采用**分阶段发布**策略：

#### 阶段 1：内部测试（Alpha）

**时间**：开发完成后 1-2 天

**范围**：
- 开发团队内部测试
- 功能验证
- 性能测试
- Bug 修复

#### 阶段 2：小范围测试（Beta）

**时间**：Alpha 测试通过后 2-3 天

**范围**：
- 邀请部分用户测试
- 收集用户反馈
- 优化用户体验
- 修复发现的问题

#### 阶段 3：正式发布（Production）

**时间**：Beta 测试通过后

**范围**：
- 全量发布
- 监控性能和错误
- 快速响应问题

### 发布检查清单

- [ ] 所有单元测试通过
- [ ] 所有属性测试通过
- [ ] 所有 E2E 测试通过
- [ ] 性能指标达标
- [ ] 跨浏览器测试通过
- [ ] 跨设备测试通过
- [ ] 代码审查完成
- [ ] 文档更新完成
- [ ] 变更日志编写完成
- [ ] 回滚方案准备完成


### 回滚方案

如果发布后出现严重问题，执行以下回滚步骤：

1. **立即回滚到上一个稳定版本**
   ```bash
   git revert <commit-hash>
   npm run build
   # 部署到生产环境
   ```

2. **通知用户**
   - 在网站显示维护通知
   - 说明问题和预计修复时间

3. **问题修复**
   - 在开发环境修复问题
   - 完整测试后重新发布

4. **事后分析**
   - 分析问题原因
   - 更新测试用例
   - 改进发布流程

---

## 监控和维护

### 性能监控

**监控指标**：
- 页面加载时间（首屏、完整加载）
- 游戏帧率（平均、最低、最高）
- 触摸响应延迟
- 内存使用情况
- 错误率

**监控工具**：
- Google Analytics：用户行为分析
- Sentry：错误监控和报告
- 自定义性能监控：游戏内 FPS 计数器

### 错误监控

**监控内容**：
- JavaScript 错误
- 网络请求失败
- 资源加载失败
- 游戏崩溃
- 主题切换失败

**处理流程**：
1. 自动收集错误信息
2. 按严重程度分类
3. 及时通知开发团队
4. 分析和修复
5. 发布补丁

### 用户反馈

**收集渠道**：
- 网站内反馈表单
- GitHub Issues
- 邮件反馈
- 社交媒体

**处理流程**：
1. 收集和分类反馈
2. 优先级排序
3. 纳入开发计划
4. 实现和测试
5. 通知用户

---

## 文档更新计划

### 需要更新的文档

1. **用户文档**
   - 添加亮色主题使用说明
   - 添加移动端游戏操作指南
   - 更新游戏玩法说明（新的武器参数）

2. **开发文档**
   - 更新组件文档（新增组件）
   - 更新 API 文档
   - 更新架构图

3. **部署文档**
   - 更新构建配置说明
   - 更新环境变量说明
   - 更新性能优化建议

4. **测试文档**
   - 添加属性测试指南
   - 更新测试覆盖率报告
   - 添加移动端测试指南


---

## 附录

### A. 相关文档

- [需求文档](./requirements.md)
- [项目概述](../../PROJECT_OVERVIEW.md)
- [游戏文档](../../../docs/GAME_DOCUMENTATION.md)
- [开发标准](../../../docs/DEVELOPMENT_STANDARDS.md)
- [维护指南](../../../docs/MAINTENANCE_GUIDE.md)

### B. 技术参考

#### CSS 变量参考

**深色主题**：
```css
[data-theme='dark'] {
  --bg-primary: #0a0e27;
  --bg-secondary: #151932;
  --text-primary: #ffffff;
  --text-secondary: #a0aec0;
  --primary: #00d9ff;
  --secondary: #7b61ff;
  --particle-color: #00d9ff;
}
```

**亮色主题**：
```css
[data-theme='light'] {
  --bg-primary: #f5f7fa;
  --bg-secondary: #ffffff;
  --text-primary: #1a202c;
  --text-secondary: #4a5568;
  --primary: #00d9ff;
  --secondary: #7b61ff;
  --particle-color: #00d9ff;
}
```

#### 游戏参数参考

**原始参数**：
```typescript
PLAYER_INITIAL_SPEED: 4
PLAYER_MISSILE_DAMAGE: 50
PLAYER_MISSILE_EXPLOSION_RADIUS: 5
```

**新参数（V3）**：
```typescript
PLAYER_INITIAL_SPEED: 8  // 2 倍
PLAYER_MISSILE_DAMAGE: 75  // 1.5 倍
PLAYER_MISSILE_EXPLOSION_RADIUS: 7.5  // 1.5 倍
```

#### 响应式断点参考

```typescript
const BREAKPOINTS = {
  mobile: 768,    // < 768px
  tablet: 1024,   // 768px - 1024px
  desktop: 1024   // > 1024px
}
```

#### 触摸目标尺寸参考

根据 WCAG 2.1 AAA 标准和 Apple/Google 设计指南：
- 最小尺寸：44x44 像素
- 推荐尺寸：48x48 像素
- 按钮间距：至少 8 像素

### C. 代码示例

#### 主题切换完整示例

```typescript
// composables/useTheme.ts
import { ref, computed } from 'vue'

export type ThemeMode = 'dark' | 'light' | 'system'

const mode = ref<ThemeMode>('system')
const systemPrefersDark = ref(true)

export function useTheme() {
  const resolvedTheme = computed<'dark' | 'light'>(() => {
    if (mode.value === 'system') {
      return systemPrefersDark.value ? 'dark' : 'light'
    }
    return mode.value
  })

  const setTheme = (newMode: ThemeMode): void => {
    mode.value = newMode
    localStorage.setItem('theme-preference', newMode)
    applyTheme()
  }

  const applyTheme = (): void => {
    const theme = resolvedTheme.value
    document.documentElement.setAttribute('data-theme', theme)
  }

  const initTheme = (): void => {
    const saved = localStorage.getItem('theme-preference') as ThemeMode
    if (saved) mode.value = saved

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemPrefersDark.value = mediaQuery.matches

    mediaQuery.addEventListener('change', (e) => {
      systemPrefersDark.value = e.matches
      if (mode.value === 'system') applyTheme()
    })

    applyTheme()
  }

  return { mode, resolvedTheme, setTheme, initTheme }
}
```


#### 移动端控制器完整示例

```typescript
// game/MobileController.ts
export class MobileController {
  private canvas: HTMLCanvasElement
  private isMobile: boolean = false
  private joystickState: JoystickState = {
    active: false,
    x: 0,
    y: 0,
    angle: 0,
    distance: 0
  }
  private buttonState: ButtonState = {
    fire: false,
    missile: false,
    nuke: false
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.isMobile = this.detectMobile()
  }

  detectMobile(): boolean {
    // 检测屏幕尺寸
    const isMobileSize = window.innerWidth < 768
    // 检测触摸支持
    const hasTouchSupport = 'ontouchstart' in window
    
    return isMobileSize && hasTouchSupport
  }

  initialize(): void {
    if (!this.isMobile) return

    this.canvas.addEventListener('touchstart', this.handleTouchStart)
    this.canvas.addEventListener('touchmove', this.handleTouchMove)
    this.canvas.addEventListener('touchend', this.handleTouchEnd)
    
    // 防止默认行为
    this.canvas.addEventListener('touchstart', (e) => e.preventDefault())
  }

  private handleTouchStart = (e: TouchEvent): void => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      const x = touch.clientX
      const y = touch.clientY
      
      // 判断触摸位置（左侧为摇杆，右侧为按钮）
      if (x < this.canvas.width / 2) {
        this.handleJoystickTouch(x, y)
      } else {
        this.handleButtonTouch(x, y)
      }
    }
  }

  private handleJoystickTouch(x: number, y: number): void {
    // 计算摇杆方向和距离
    const centerX = 100
    const centerY = this.canvas.height - 100
    const dx = x - centerX
    const dy = y - centerY
    
    const distance = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx)
    
    this.joystickState = {
      active: true,
      x: Math.cos(angle),
      y: Math.sin(angle),
      angle,
      distance: Math.min(distance / 50, 1)
    }
  }

  getInputState(): InputState {
    return {
      moveX: this.joystickState.x,
      moveY: this.joystickState.y,
      fire: this.buttonState.fire,
      missile: this.buttonState.missile,
      nuke: this.buttonState.nuke,
      source: 'touch'
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.isMobile) return

    // 渲染虚拟摇杆
    this.renderJoystick(ctx)
    
    // 渲染触摸按钮
    this.renderButtons(ctx)
  }

  private renderJoystick(ctx: CanvasRenderingContext2D): void {
    const centerX = 100
    const centerY = this.canvas.height - 100
    const radius = 50

    // 绘制摇杆底座
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fill()

    // 绘制摇杆
    if (this.joystickState.active) {
      const stickX = centerX + this.joystickState.x * 30
      const stickY = centerY + this.joystickState.y * 30
      
      ctx.fillStyle = 'rgba(0, 217, 255, 0.6)'
      ctx.beginPath()
      ctx.arc(stickX, stickY, 25, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private renderButtons(ctx: CanvasRenderingContext2D): void {
    // 绘制开火键、导弹键、核弹键
    // 实现略...
  }

  destroy(): void {
    this.canvas.removeEventListener('touchstart', this.handleTouchStart)
    this.canvas.removeEventListener('touchmove', this.handleTouchMove)
    this.canvas.removeEventListener('touchend', this.handleTouchEnd)
  }
}
```

### D. 术语表

| 术语 | 英文 | 说明 |
|-----|------|------|
| 粒子背景 | Particle Background | 动态粒子特效背景组件 |
| 主题管理器 | Theme Manager | 管理深色/亮色主题切换的系统 |
| 虚拟摇杆 | Virtual Joystick | 移动端触摸控制的虚拟摇杆 |
| 触摸按钮 | Touch Button | 移动端触摸控制的按钮 |
| 响应式检测器 | Responsive Detector | 检测设备类型和屏幕尺寸的工具 |
| 属性测试 | Property-Based Testing | 基于属性的测试方法 |
| 往返属性 | Round-Trip Property | 操作可逆性的测试属性 |
| 不变量 | Invariant | 系统状态的不变性质 |

---

**文档版本**：1.0.0  
**创建日期**：2026-03-05  
**最后更新**：2026-03-05  
**状态**：待审核  
**作者**：开发团队

