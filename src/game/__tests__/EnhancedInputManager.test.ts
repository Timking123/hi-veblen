/**
 * EnhancedInputManager 单元测试
 * 测试增强输入管理器的基本功能和移动端集成
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EnhancedInputManager } from '../EnhancedInputManager'

describe('EnhancedInputManager', () => {
  let canvas: HTMLCanvasElement
  let inputManager: EnhancedInputManager

  beforeEach(() => {
    // 创建模拟 canvas
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    
    // 模拟 getBoundingClientRect
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({})
    })
  })

  afterEach(() => {
    if (inputManager) {
      inputManager.destroy()
    }
  })

  describe('构造函数和初始化', () => {
    it('应该成功创建 EnhancedInputManager 实例', () => {
      inputManager = new EnhancedInputManager(canvas)
      expect(inputManager).toBeDefined()
    })

    it('应该在桌面设备上不启用移动端控制器', () => {
      // 模拟桌面设备
      Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 1080, configurable: true })
      
      inputManager = new EnhancedInputManager(canvas)
      const inputState = inputManager.getInputState()
      
      expect(inputState.source).toBe('keyboard')
    })
  })

  describe('getInputState - 键盘输入', () => {
    beforeEach(() => {
      // 模拟桌面设备
      Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 1080, configurable: true })
      
      inputManager = new EnhancedInputManager(canvas)
    })

    it('应该返回空的输入状态（无按键）', () => {
      const inputState = inputManager.getInputState()
      
      expect(inputState.moveX).toBe(0)
      expect(inputState.moveY).toBe(0)
      expect(inputState.fire).toBe(false)
      expect(inputState.missile).toBe(false)
      expect(inputState.nuke).toBe(false)
      expect(inputState.source).toBe('keyboard')
    })

    it('应该检测到向右移动（D 键）', () => {
      // 模拟按下 D 键
      const event = new KeyboardEvent('keydown', { key: 'd' })
      window.dispatchEvent(event)
      
      const inputState = inputManager.getInputState()
      expect(inputState.moveX).toBe(1)
      expect(inputState.source).toBe('keyboard')
    })

    it('应该检测到向左移动（A 键）', () => {
      // 模拟按下 A 键
      const event = new KeyboardEvent('keydown', { key: 'a' })
      window.dispatchEvent(event)
      
      const inputState = inputManager.getInputState()
      expect(inputState.moveX).toBe(-1)
      expect(inputState.source).toBe('keyboard')
    })

    it('应该检测到向上移动（W 键）', () => {
      // 模拟按下 W 键
      const event = new KeyboardEvent('keydown', { key: 'w' })
      window.dispatchEvent(event)
      
      const inputState = inputManager.getInputState()
      expect(inputState.moveY).toBe(-1)
      expect(inputState.source).toBe('keyboard')
    })

    it('应该检测到向下移动（S 键）', () => {
      // 模拟按下 S 键
      const event = new KeyboardEvent('keydown', { key: 's' })
      window.dispatchEvent(event)
      
      const inputState = inputManager.getInputState()
      expect(inputState.moveY).toBe(1)
      expect(inputState.source).toBe('keyboard')
    })
  })

  describe('render - 移动端控制器渲染', () => {
    it('应该在桌面设备上不渲染移动端控制器', () => {
      // 模拟桌面设备
      Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true })
      
      inputManager = new EnhancedInputManager(canvas)
      const ctx = canvas.getContext('2d')!
      
      // 不应该抛出错误
      expect(() => {
        inputManager.render(ctx)
      }).not.toThrow()
    })
  })

  describe('update - 状态更新', () => {
    beforeEach(() => {
      inputManager = new EnhancedInputManager(canvas)
    })

    it('应该清除单帧状态', () => {
      // 模拟按下空格键（核弹）
      const keydownEvent = new KeyboardEvent('keydown', { key: ' ' })
      window.dispatchEvent(keydownEvent)
      
      // 第一帧应该检测到
      expect(inputManager.isKeyJustPressed(' ')).toBe(true)
      
      // 更新后应该清除
      inputManager.update(16)
      expect(inputManager.isKeyJustPressed(' ')).toBe(false)
    })
  })

  describe('destroy - 清理资源', () => {
    it('应该正确清理所有资源', () => {
      inputManager = new EnhancedInputManager(canvas)
      
      // 不应该抛出错误
      expect(() => {
        inputManager.destroy()
      }).not.toThrow()
    })

    it('销毁后不应该响应键盘事件', () => {
      inputManager = new EnhancedInputManager(canvas)
      inputManager.destroy()
      
      // 模拟按键
      const event = new KeyboardEvent('keydown', { key: 'd' })
      window.dispatchEvent(event)
      
      // 不应该检测到按键
      expect(inputManager.isKeyHeld('d')).toBe(false)
    })
  })

  describe('InputState 接口', () => {
    beforeEach(() => {
      inputManager = new EnhancedInputManager(canvas)
    })

    it('应该返回正确的 InputState 类型', () => {
      const inputState = inputManager.getInputState()
      
      expect(inputState).toHaveProperty('moveX')
      expect(inputState).toHaveProperty('moveY')
      expect(inputState).toHaveProperty('fire')
      expect(inputState).toHaveProperty('missile')
      expect(inputState).toHaveProperty('nuke')
      expect(inputState).toHaveProperty('source')
      
      expect(typeof inputState.moveX).toBe('number')
      expect(typeof inputState.moveY).toBe('number')
      expect(typeof inputState.fire).toBe('boolean')
      expect(typeof inputState.missile).toBe('boolean')
      expect(typeof inputState.nuke).toBe('boolean')
      expect(['keyboard', 'touch']).toContain(inputState.source)
    })
  })
})
