# 游戏 UI 组件

本目录包含游戏相关的 UI 组件，主要用于移动端触摸控制。

## VirtualJoystick（虚拟摇杆）

虚拟摇杆组件用于移动端触摸控制玩家飞机移动。

### 功能特性

- ✅ 触摸拖动控制
- ✅ 方向和距离计算
- ✅ 自动复位（松开触摸时）
- ✅ 视觉反馈（激活状态高亮）
- ✅ 死区支持（避免微小抖动）
- ✅ 边界限制（手柄不会超出底座）
- ✅ 多点触控隔离（只响应第一个触摸点）
- ✅ 阻止浏览器默认行为

### 使用示例

```vue
<template>
  <div class="game-container">
    <!-- 游戏画布 -->
    <canvas ref="gameCanvas"></canvas>
    
    <!-- 虚拟摇杆 -->
    <VirtualJoystick
      :x="100"
      :y="500"
      :radius="60"
      :visible="isMobile"
      :dead-zone="0.1"
      @move="handleJoystickMove"
      @release="handleJoystickRelease"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import VirtualJoystick from '@/game/ui/VirtualJoystick.vue'

const isMobile = ref(window.innerWidth < 768)

function handleJoystickMove(direction: { x: number; y: number; angle: number; distance: number }) {
  // x, y: -1 到 1 的归一化方向向量
  // angle: 弧度角度（0 为向右，Math.PI/2 为向下）
  // distance: 0 到 1 的归一化距离
  
  console.log('摇杆移动:', direction)
  
  // 更新玩家飞机位置
  // player.move(direction.x * speed, direction.y * speed)
}

function handleJoystickRelease() {
  console.log('摇杆释放')
  
  // 停止玩家飞机移动
  // player.stop()
}
</script>
```

### Props（属性）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `x` | `number` | `100` | 摇杆中心 X 坐标（像素） |
| `y` | `number` | `500` | 摇杆中心 Y 坐标（像素，从底部计算） |
| `radius` | `number` | `60` | 摇杆半径（像素） |
| `visible` | `boolean` | `true` | 是否可见 |
| `deadZone` | `number` | `0.1` | 死区半径（0-1），小于此值的移动将被忽略 |

### Events（事件）

#### `move`

当摇杆移动时触发。

**参数：**
```typescript
{
  x: number        // -1 到 1，水平方向（-1 左，1 右）
  y: number        // -1 到 1，垂直方向（-1 上，1 下）
  angle: number    // 弧度角度（0 为向右，顺时针增加）
  distance: number // 0 到 1，归一化距离
}
```

#### `release`

当触摸释放时触发。

**参数：** 无

### 样式定制

组件使用半透明样式，可以通过 CSS 变量或直接修改组件样式来定制外观：

```css
/* 底座样式 */
.joystick-base {
  background-color: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.4);
}

/* 手柄样式（未激活） */
.joystick-stick {
  background-color: rgba(0, 217, 255, 0.6);
  border: 2px solid rgba(0, 217, 255, 1);
}

/* 手柄样式（激活） */
.joystick-stick:active {
  background-color: rgba(0, 217, 255, 0.8);
  box-shadow: 0 0 10px rgba(0, 217, 255, 0.6);
}
```

### 技术细节

#### 坐标系统

- 使用固定定位（`position: fixed`）
- Y 坐标从底部计算（`bottom` 属性）
- 触摸坐标使用 `clientX` 和 `clientY`

#### 方向计算

```typescript
// 计算触摸点相对于摇杆中心的偏移
const deltaX = touchX - centerX
const deltaY = touchY - centerY

// 计算距离和角度
const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
const angle = Math.atan2(deltaY, deltaX)

// 归一化方向向量
const x = Math.cos(angle) * normalizedDistance
const y = Math.sin(angle) * normalizedDistance
```

#### 死区处理

死区用于避免微小的手指抖动导致的意外移动：

```typescript
if (normalizedDistance < deadZone) {
  effectiveDistance = 0
} else {
  // 重新映射死区外的距离到 0-1
  effectiveDistance = (normalizedDistance - deadZone) / (1 - deadZone)
}
```

#### 边界限制

手柄移动被限制在底座半径的 60% 范围内：

```typescript
const maxDistance = radius * 0.6
const clampedDistance = Math.min(distance, maxDistance)
```

### 性能优化

- 使用 `touchmove` 事件的 `preventDefault()` 阻止页面滚动
- 使用 `touch-action: none` CSS 属性提升性能
- 通过 `touchId` 跟踪特定触摸点，避免多点触控干扰
- 使用 CSS `transition` 实现平滑的视觉反馈

### 浏览器兼容性

- ✅ iOS Safari 14+
- ✅ Android Chrome 90+
- ✅ 支持触摸事件的现代浏览器

### 测试覆盖

组件包含完整的单元测试，覆盖以下场景：

- ✅ 组件渲染
- ✅ 触摸事件处理
- ✅ 方向计算
- ✅ 死区处理
- ✅ 多点触控处理
- ✅ 边界限制
- ✅ 样式和视觉反馈
- ✅ 事件阻止

运行测试：

```bash
npm run test -- src/game/ui/__tests__/VirtualJoystick.test.ts
```

### 验证需求

本组件验证以下需求：

- **需求 6.1**: 移动设备上显示半透明虚拟摇杆
- **需求 6.2**: 触摸拖动控制玩家飞机移动
- **需求 6.11**: 松开触摸时摇杆返回中心位置

---

## TouchButton（触摸按钮）

触摸按钮组件用于移动端触摸控制游戏操作（开火、导弹、核弹等）。

### 功能特性

- ✅ 触摸按下/释放事件
- ✅ 视觉反馈（按下时颜色变化和缩放动画）
- ✅ 触觉反馈（振动 API 支持）
- ✅ 半透明圆形按钮设计
- ✅ 自定义颜色和标签
- ✅ 多点触控隔离（只响应第一个触摸点）
- ✅ 阻止浏览器默认行为

### 使用示例

```vue
<template>
  <div class="game-container">
    <!-- 游戏画布 -->
    <canvas ref="gameCanvas"></canvas>
    
    <!-- 开火按钮 -->
    <TouchButton
      :x="80"
      :y="120"
      :size="70"
      label="开火"
      color="#00D9FF"
      :visible="isMobile"
      @press="handleFirePress"
      @release="handleFireRelease"
    />
    
    <!-- 导弹按钮 -->
    <TouchButton
      :x="80"
      :y="220"
      :size="70"
      label="导弹"
      color="#7B61FF"
      :visible="isMobile"
      @press="handleMissilePress"
      @release="handleMissileRelease"
    />
    
    <!-- 核弹按钮 -->
    <TouchButton
      :x="80"
      :y="320"
      :size="70"
      label="核弹"
      color="#FF6B9D"
      :visible="isMobile"
      @press="handleNukePress"
      @release="handleNukeRelease"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TouchButton from '@/game/ui/TouchButton.vue'

const isMobile = ref(window.innerWidth < 768)

function handleFirePress() {
  console.log('开火按钮按下')
  // 开始持续发射机炮
  // player.startFiring()
}

function handleFireRelease() {
  console.log('开火按钮释放')
  // 停止发射机炮
  // player.stopFiring()
}

function handleMissilePress() {
  console.log('导弹按钮按下')
  // 发射导弹
  // player.fireMissile()
}

function handleMissileRelease() {
  console.log('导弹按钮释放')
}

function handleNukePress() {
  console.log('核弹按钮按下')
  // 释放核弹
  // player.fireNuke()
}

function handleNukeRelease() {
  console.log('核弹按钮释放')
}
</script>
```

### Props（属性）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `x` | `number` | `100` | 按钮中心 X 坐标（像素，从右侧计算） |
| `y` | `number` | `100` | 按钮中心 Y 坐标（像素，从底部计算） |
| `size` | `number` | `60` | 按钮尺寸（像素） |
| `label` | `string` | `''` | 按钮标签文字 |
| `color` | `string` | `'#00D9FF'` | 按钮颜色（支持任何 CSS 颜色值） |
| `visible` | `boolean` | `true` | 是否可见 |

### Events（事件）

#### `press`

当按钮被按下时触发。

**参数：** 无

#### `release`

当按钮被释放时触发。

**参数：** 无

### 样式定制

组件使用半透明圆形设计，可以通过 props 自定义颜色：

```vue
<!-- 青色按钮 -->
<TouchButton color="#00D9FF" label="A" />

<!-- 紫色按钮 -->
<TouchButton color="#7B61FF" label="B" />

<!-- 粉色按钮 -->
<TouchButton color="#FF6B9D" label="C" />
```

按钮样式特性：

- **正常状态**：40% 透明度，正常尺寸
- **按下状态**：80% 透明度，缩小到 90%，增强发光效果
- **过渡动画**：0.15 秒平滑过渡

### 技术细节

#### 坐标系统

- 使用固定定位（`position: fixed`）
- X 坐标从右侧计算（`right` 属性）
- Y 坐标从底部计算（`bottom` 属性）

#### 视觉反馈

按下时的视觉变化：

```typescript
// 正常状态
backgroundColor: `${color}66`  // 40% 透明度
transform: 'scale(1)'
boxShadow: `0 0 8px ${color}66`

// 按下状态
backgroundColor: `${color}CC`  // 80% 透明度
transform: 'scale(0.9)'        // 缩小到 90%
boxShadow: `0 0 15px ${color}AA, inset 0 0 10px ${color}66`
```

#### 触觉反馈

使用 Vibration API 提供触觉反馈：

```typescript
if ('vibrate' in navigator) {
  navigator.vibrate(50)  // 振动 50 毫秒
}
```

- 自动检测设备是否支持振动
- 不支持时静默失败，不影响功能
- 振动时长：50 毫秒（短促反馈）

#### 多点触控处理

通过 `touchId` 跟踪特定触摸点：

```typescript
// 只响应第一个触摸点
if (touchId.value !== null) return

// 记录触摸点 ID
touchId.value = touch.identifier

// 只处理匹配的触摸点结束事件
const touch = Array.from(event.changedTouches)
  .find(t => t.identifier === touchId.value)
```

### 性能优化

- 使用 `touchstart/touchend` 事件的 `preventDefault()` 阻止默认行为
- 使用 `touch-action: none` CSS 属性提升性能
- 按下时禁用过渡动画，提升响应速度
- 使用 CSS `transform` 实现缩放动画（GPU 加速）

### 浏览器兼容性

- ✅ iOS Safari 14+
- ✅ Android Chrome 90+
- ✅ 支持触摸事件的现代浏览器
- ⚠️ 振动 API 在某些设备上可能不支持（会静默失败）

### 测试覆盖

组件包含完整的单元测试，覆盖以下场景：

- ✅ 组件渲染
- ✅ 触摸事件处理
- ✅ 视觉反馈
- ✅ 多点触控处理
- ✅ 标签样式
- ✅ 事件阻止
- ✅ 触觉反馈兼容性
- ✅ CSS 类和样式
- ✅ 圆形按钮样式

运行测试：

```bash
npm run test -- src/game/ui/__tests__/TouchButton.test.ts
```

### 验证需求

本组件验证以下需求：

- **需求 6.3**: 屏幕右侧显示三个半透明触摸按钮
- **需求 6.4**: 显示开火键按钮
- **需求 6.5**: 显示导弹键按钮
- **需求 6.6**: 显示核弹键按钮
- **需求 6.7**: 按下时显示视觉反馈效果
- **需求 8.3**: 提供触觉反馈（振动）

### 后续集成

触摸按钮组件已创建完成，后续需要：

1. ✅ 创建 `VirtualJoystick.vue` 组件（虚拟摇杆）
2. ✅ 创建 `TouchButton.vue` 组件（触摸按钮）
3. 创建 `MobileController.ts` 类（移动端控制器）
4. 集成到 `EnhancedInputManager.ts`（增强输入管理器）
5. 在游戏引擎中启用移动端控制

### 相关文档

- [设计文档](../../../.kiro/specs/website-v3-major-update/design.md)
- [需求文档](../../../.kiro/specs/website-v3-major-update/requirements.md)
- [任务列表](../../../.kiro/specs/website-v3-major-update/tasks.md)
