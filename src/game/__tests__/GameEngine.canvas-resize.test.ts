/**
 * GameEngine 画布自适应测试
 * 测试画布根据屏幕尺寸自动调整的功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GameEngine } from '../GameEngine'
import { GAME_CONFIG } from '../constants'

// Mock Canvas 2D Context
class MockCanvasRenderingContext2D {
  canvas: HTMLCanvasElement
  fillStyle: string | CanvasGradient | CanvasPattern = '#000'
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000'
  lineWidth: number = 1
  font: string = '10px sans-serif'
  textAlign: CanvasTextAlign = 'start'
  textBaseline: CanvasTextBaseline = 'alphabetic'
  globalAlpha: number = 1

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
  }

  clearRect() {}
  fillRect() {}
  strokeRect() {}
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  arc() {}
  fill() {}
  stroke() {}
  save() {}
  restore() {}
  translate() {}
  rotate() {}
  scale() {}
  fillText() {}
  strokeText() {}
  measureText() {
    return { width: 0 } as TextMetrics
  }
  drawImage() {}
  createLinearGradient() {
    return {} as CanvasGradient
  }
  createRadialGradient() {
    return {} as CanvasGradient
  }
}

describe('GameEngine - 画布自适应', () => {
  let canvas: HTMLCanvasElement
  let gameEngine: GameEngine
  let originalInnerWidth: number
  let originalInnerHeight: number

  beforeEach(() => {
    // 保存原始窗口尺寸
    originalInnerWidth = window.innerWidth
    originalInnerHeight = window.innerHeight

    // 创建 Canvas 元素
    canvas = document.createElement('canvas')
    
    // Mock getContext 方法
    canvas.getContext = vi.fn((contextType: string) => {
      if (contextType === '2d') {
        return new MockCanvasRenderingContext2D(canvas) as any
      }
      return null
    })
    
    document.body.appendChild(canvas)
  })

  afterEach(() => {
    // 恢复原始窗口尺寸
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight
    })

    // 清理
    if (gameEngine) {
      gameEngine.stop()
    }
    document.body.removeChild(canvas)
  })

  it('应该在初始化时根据屏幕尺寸调整画布', () => {
    // 模拟桌面屏幕尺寸
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1080
    })

    gameEngine = new GameEngine(canvas)

    // 验证画布尺寸已设置
    expect(canvas.width).toBeGreaterThan(0)
    expect(canvas.height).toBeGreaterThan(0)

    // 验证宽高比接近 4:3
    const aspectRatio = canvas.width / canvas.height
    const expectedAspectRatio = GAME_CONFIG.CANVAS_WIDTH / GAME_CONFIG.CANVAS_HEIGHT
    expect(Math.abs(aspectRatio - expectedAspectRatio)).toBeLessThan(0.1)
  })

  it('应该在移动设备上调整画布尺寸', () => {
    // 模拟移动设备屏幕尺寸
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667
    })

    gameEngine = new GameEngine(canvas)

    // 验证画布尺寸已设置且不超过屏幕尺寸
    expect(canvas.width).toBeGreaterThan(0)
    expect(canvas.width).toBeLessThanOrEqual(375 * 0.9)
    expect(canvas.height).toBeGreaterThan(0)
    expect(canvas.height).toBeLessThanOrEqual(667 * 0.9)

    // 验证宽高比接近 4:3
    const aspectRatio = canvas.width / canvas.height
    const expectedAspectRatio = GAME_CONFIG.CANVAS_WIDTH / GAME_CONFIG.CANVAS_HEIGHT
    expect(Math.abs(aspectRatio - expectedAspectRatio)).toBeLessThan(0.1)
  })

  it('应该在平板设备上调整画布尺寸', () => {
    // 模拟平板设备屏幕尺寸
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1024
    })

    gameEngine = new GameEngine(canvas)

    // 验证画布尺寸已设置且不超过屏幕尺寸
    expect(canvas.width).toBeGreaterThan(0)
    expect(canvas.width).toBeLessThanOrEqual(768 * 0.9)
    expect(canvas.height).toBeGreaterThan(0)
    expect(canvas.height).toBeLessThanOrEqual(1024 * 0.9)

    // 验证宽高比接近 4:3
    const aspectRatio = canvas.width / canvas.height
    const expectedAspectRatio = GAME_CONFIG.CANVAS_WIDTH / GAME_CONFIG.CANVAS_HEIGHT
    expect(Math.abs(aspectRatio - expectedAspectRatio)).toBeLessThan(0.1)
  })

  it('应该保持 4:3 的宽高比', () => {
    // 测试多种屏幕尺寸
    const screenSizes = [
      { width: 1920, height: 1080 }, // 桌面 16:9
      { width: 1366, height: 768 },  // 笔记本 16:9
      { width: 375, height: 667 },   // iPhone SE
      { width: 414, height: 896 },   // iPhone 11
      { width: 768, height: 1024 },  // iPad
      { width: 1024, height: 768 }   // iPad 横屏
    ]

    const expectedAspectRatio = GAME_CONFIG.CANVAS_WIDTH / GAME_CONFIG.CANVAS_HEIGHT

    screenSizes.forEach(({ width, height }) => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width
      })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: height
      })

      const testCanvas = document.createElement('canvas')
      // Mock getContext 方法
      testCanvas.getContext = vi.fn((contextType: string) => {
        if (contextType === '2d') {
          return new MockCanvasRenderingContext2D(testCanvas) as any
        }
        return null
      })
      document.body.appendChild(testCanvas)
      const testEngine = new GameEngine(testCanvas)

      const aspectRatio = testCanvas.width / testCanvas.height
      expect(Math.abs(aspectRatio - expectedAspectRatio)).toBeLessThan(0.1)

      testEngine.stop()
      document.body.removeChild(testCanvas)
    })
  })

  it('应该在调用 resizeCanvas 方法时重新调整画布尺寸', () => {
    // 初始化时使用桌面尺寸
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1080
    })

    gameEngine = new GameEngine(canvas)
    const initialWidth = canvas.width
    const initialHeight = canvas.height

    // 改变窗口尺寸为移动设备
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667
    })

    // 调用 resizeCanvas 方法
    gameEngine.resizeCanvas()

    // 验证画布尺寸已改变
    expect(canvas.width).not.toBe(initialWidth)
    expect(canvas.height).not.toBe(initialHeight)

    // 验证新尺寸不超过屏幕尺寸
    expect(canvas.width).toBeLessThanOrEqual(375 * 0.9)
    expect(canvas.height).toBeLessThanOrEqual(667 * 0.9)

    // 验证宽高比仍然保持
    const aspectRatio = canvas.width / canvas.height
    const expectedAspectRatio = GAME_CONFIG.CANVAS_WIDTH / GAME_CONFIG.CANVAS_HEIGHT
    expect(Math.abs(aspectRatio - expectedAspectRatio)).toBeLessThan(0.1)
  })

  it('应该在横屏模式下正确调整画布', () => {
    // 模拟横屏模式（宽度大于高度）
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 896
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 414
    })

    gameEngine = new GameEngine(canvas)

    // 验证画布尺寸已设置
    expect(canvas.width).toBeGreaterThan(0)
    expect(canvas.height).toBeGreaterThan(0)

    // 验证画布不超过屏幕尺寸
    expect(canvas.width).toBeLessThanOrEqual(896 * 0.9)
    expect(canvas.height).toBeLessThanOrEqual(414 * 0.9)

    // 验证宽高比
    const aspectRatio = canvas.width / canvas.height
    const expectedAspectRatio = GAME_CONFIG.CANVAS_WIDTH / GAME_CONFIG.CANVAS_HEIGHT
    expect(Math.abs(aspectRatio - expectedAspectRatio)).toBeLessThan(0.1)
  })

  it('应该在竖屏模式下正确调整画布', () => {
    // 模拟竖屏模式（高度大于宽度）
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 414
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 896
    })

    gameEngine = new GameEngine(canvas)

    // 验证画布尺寸已设置
    expect(canvas.width).toBeGreaterThan(0)
    expect(canvas.height).toBeGreaterThan(0)

    // 验证画布不超过屏幕尺寸
    expect(canvas.width).toBeLessThanOrEqual(414 * 0.9)
    expect(canvas.height).toBeLessThanOrEqual(896 * 0.9)

    // 验证宽高比
    const aspectRatio = canvas.width / canvas.height
    const expectedAspectRatio = GAME_CONFIG.CANVAS_WIDTH / GAME_CONFIG.CANVAS_HEIGHT
    expect(Math.abs(aspectRatio - expectedAspectRatio)).toBeLessThan(0.1)
  })

  it('应该在小屏幕设备上限制最小尺寸', () => {
    // 模拟非常小的屏幕
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 320
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 568
    })

    gameEngine = new GameEngine(canvas)

    // 验证画布尺寸已设置且合理
    expect(canvas.width).toBeGreaterThan(0)
    expect(canvas.height).toBeGreaterThan(0)

    // 验证画布不超过屏幕尺寸
    expect(canvas.width).toBeLessThanOrEqual(320 * 0.9)
    expect(canvas.height).toBeLessThanOrEqual(568 * 0.9)

    // 验证宽高比
    const aspectRatio = canvas.width / canvas.height
    const expectedAspectRatio = GAME_CONFIG.CANVAS_WIDTH / GAME_CONFIG.CANVAS_HEIGHT
    expect(Math.abs(aspectRatio - expectedAspectRatio)).toBeLessThan(0.1)
  })

  it('应该在超大屏幕上限制最大尺寸', () => {
    // 模拟超大屏幕（4K）
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 3840
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 2160
    })

    gameEngine = new GameEngine(canvas, { scaleMultiplier: 1.5 })

    // 验证画布尺寸已设置
    expect(canvas.width).toBeGreaterThan(0)
    expect(canvas.height).toBeGreaterThan(0)

    // 验证画布不超过基础尺寸 * 缩放倍数
    const maxWidth = GAME_CONFIG.CANVAS_WIDTH * 1.5
    const maxHeight = GAME_CONFIG.CANVAS_HEIGHT * 1.5
    expect(canvas.width).toBeLessThanOrEqual(maxWidth)
    expect(canvas.height).toBeLessThanOrEqual(maxHeight)

    // 验证宽高比
    const aspectRatio = canvas.width / canvas.height
    const expectedAspectRatio = GAME_CONFIG.CANVAS_WIDTH / GAME_CONFIG.CANVAS_HEIGHT
    expect(Math.abs(aspectRatio - expectedAspectRatio)).toBeLessThan(0.1)
  })
})
