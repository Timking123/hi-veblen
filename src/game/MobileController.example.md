# MobileController 使用示例

## 概述

`MobileController` 类提供了移动端触摸控制功能，包括虚拟摇杆和触摸按钮。

## 基本使用

```typescript
import { MobileController } from '@/game/MobileController'

// 创建 Canvas 元素
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement

// 创建移动端控制器
const mobileController = new MobileController(canvas)

// 初始化（绑定触摸事件）
mobileController.initialize()

// 在游戏循环中获取输入状态
function gameLoop() {
  // 获取摇杆状态
  const joystickState = mobileController.getJoystickState()
  console.log('摇杆方向:', joystickState.x, joystickState.y)
  console.log('摇杆距离:', joystickState.distance)
  
  // 获取按钮状态
  const buttonState = mobileController.getButtonState()
  console.log('开火键:', buttonState.fire)
  console.log('导弹键:', buttonState.missile)
  console.log('核弹键:', buttonState.nuke)
  
  // 渲染虚拟控制器（可选，如果使用 Canvas 渲染）
  const ctx = canvas.getContext('2d')
  if (ctx) {
    mobileController.render(ctx)
  }
  
  requestAnimationFrame(gameLoop)
}

gameLoop()

// 清理资源（组件卸载时）
// mobileController.destroy()
```

## 与游戏引擎集成

```typescript
import { GameEngine } from '@/game/GameEngine'
import { MobileController } from '@/game/MobileController'

class Game {
  private engine: GameEngine
  private mobileController: MobileController
  
  constructor(canvas: HTMLCanvasElement) {
    this.engine = new GameEngine(canvas)
    this.mobileController = new MobileController(canvas)
    
    // 初始化移动端控制器
    this.mobileController.initialize()
  }
  
  update() {
    // 获取移动端输入
    const joystick = this.mobileController.getJoystickState()
    const buttons = this.mobileController.getButtonState()
    
    // 应用到玩家飞机
    if (joystick.active) {
      this.engine.player.move(joystick.x, joystick.y)
    }
    
    if (buttons.fire) {
      this.engine.player.fire()
    }
    
    if (buttons.missile) {
      this.engine.player.fireMissile()
    }
    
    if (buttons.nuke) {
      this.engine.player.fireNuke()
    }
    
    // 更新游戏引擎
    this.engine.update()
  }
  
  render() {
    this.engine.render()
    
    // 渲染移动端控制器
    const ctx = this.engine.canvas.getContext('2d')
    if (ctx && this.mobileController.isMobileDevice) {
      this.mobileController.render(ctx)
    }
  }
  
  destroy() {
    this.mobileController.destroy()
    this.engine.destroy()
  }
}
```

## 响应式配置更新

```typescript
// 监听窗口大小变化
window.addEventListener('resize', () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
  
  // 更新 Canvas 尺寸
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  
  // 更新移动端控制器配置
  mobileController.updateConfig(canvas.width, canvas.height)
})
```

## 设备检测

```typescript
const mobileController = new MobileController(canvas)

// 检测是否为移动设备
if (mobileController.isMobileDevice) {
  console.log('当前是移动设备，显示虚拟控制器')
  mobileController.initialize()
} else {
  console.log('当前是桌面设备，使用键盘控制')
}
```

## 状态查询

```typescript
// 摇杆状态
const joystickState = mobileController.getJoystickState()
// {
//   active: boolean,    // 是否激活
//   x: number,          // X 方向 (-1 到 1)
//   y: number,          // Y 方向 (-1 到 1)
//   angle: number,      // 角度（弧度）
//   distance: number    // 距离 (0 到 1)
// }

// 按钮状态
const buttonState = mobileController.getButtonState()
// {
//   fire: boolean,      // 开火键
//   missile: boolean,   // 导弹键
//   nuke: boolean       // 核弹键
// }
```

## 注意事项

1. **初始化时机**：确保在 Canvas 元素创建后再初始化 MobileController
2. **清理资源**：组件卸载时务必调用 `destroy()` 方法清理事件监听
3. **设备检测**：使用 `ResponsiveDetector` 进行设备类型检测
4. **触摸事件**：自动阻止浏览器默认行为（滚动、缩放等）
5. **多点触控**：支持同时操作摇杆和按钮

## 验证需求

- ✅ 需求 6.1: 移动设备上显示虚拟摇杆
- ✅ 需求 6.2: 摇杆控制飞机移动
- ✅ 需求 6.8: 开火键持续射击
- ✅ 需求 6.9: 导弹键发射导弹
- ✅ 需求 6.10: 核弹键释放核弹
- ✅ 需求 8.1: 多点触控支持
