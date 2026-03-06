/**
 * useRipple Composable 单元测试
 * 
 * 测试涟漪效果功能的核心逻辑：
 * - 涟漪位置计算
 * - 涟漪大小计算
 * - 涟漪生命周期管理（600ms 后自动清除）
 * - 多个涟漪同时存在
 * 
 * 验证需求：
 * - 需求 2.1: 用户点击按钮时从点击位置向外扩散涟漪动画
 * - 需求 2.2: 涟漪效果在 600ms 内完成动画并自动清除
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useRipple, calculateRipplePosition, RIPPLE_DURATION } from '../useRipple'

/**
 * 创建模拟的 MouseEvent
 */
function createMockMouseEvent(
  clientX: number,
  clientY: number,
  target: HTMLElement
): MouseEvent {
  const event = new MouseEvent('click', {
    clientX,
    clientY,
    bubbles: true,
    cancelable: true,
  })
  
  // 设置 currentTarget
  Object.defineProperty(event, 'currentTarget', {
    value: target,
    writable: false,
  })
  
  return event
}

/**
 * 创建模拟的 HTMLElement
 */
function createMockElement(
  width: number,
  height: number,
  left: number = 0,
  top: number = 0
): HTMLElement {
  const element = document.createElement('button')
  
  // Mock getBoundingClientRect
  element.getBoundingClientRect = vi.fn().mockReturnValue({
    width,
    height,
    left,
    top,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
  })
  
  return element
}

describe('useRipple', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('初始状态', () => {
    it('初始时涟漪列表应为空', () => {
      const { ripples } = useRipple()
      expect(ripples.value).toEqual([])
    })
  })

  describe('createRipple', () => {
    it('应创建涟漪实例并添加到列表', () => {
      const { ripples, createRipple } = useRipple()
      const element = createMockElement(100, 50, 10, 20)
      const event = createMockMouseEvent(60, 45, element)
      
      createRipple(event)
      
      expect(ripples.value).toHaveLength(1)
      expect(ripples.value[0]).toMatchObject({
        id: expect.any(Number),
        x: expect.any(Number),
        y: expect.any(Number),
        size: expect.any(Number),
      })
    })

    it('应支持多个涟漪同时存在', () => {
      const { ripples, createRipple } = useRipple()
      const element = createMockElement(100, 50)
      
      createRipple(createMockMouseEvent(30, 25, element))
      createRipple(createMockMouseEvent(70, 25, element))
      createRipple(createMockMouseEvent(50, 40, element))
      
      expect(ripples.value).toHaveLength(3)
    })

    it('每个涟漪应有唯一的 ID', () => {
      const { ripples, createRipple, reset } = useRipple()
      reset()
      const element = createMockElement(100, 50)
      
      createRipple(createMockMouseEvent(30, 25, element))
      createRipple(createMockMouseEvent(70, 25, element))
      
      const ids = ripples.value.map(r => r.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('600ms 后应自动清除涟漪', () => {
      const { ripples, createRipple } = useRipple()
      const element = createMockElement(100, 50)
      const event = createMockMouseEvent(50, 25, element)
      
      createRipple(event)
      expect(ripples.value).toHaveLength(1)
      
      // 前进 599ms，涟漪应该还在
      vi.advanceTimersByTime(599)
      expect(ripples.value).toHaveLength(1)
      
      // 再前进 1ms（总共 600ms），涟漪应该被清除
      vi.advanceTimersByTime(1)
      expect(ripples.value).toHaveLength(0)
    })

    it('多个涟漪应按各自的时间独立清除', () => {
      const { ripples, createRipple } = useRipple()
      const element = createMockElement(100, 50)
      
      // 创建第一个涟漪
      createRipple(createMockMouseEvent(30, 25, element))
      expect(ripples.value).toHaveLength(1)
      
      // 300ms 后创建第二个涟漪
      vi.advanceTimersByTime(300)
      createRipple(createMockMouseEvent(70, 25, element))
      expect(ripples.value).toHaveLength(2)
      
      // 再过 300ms（第一个涟漪应该被清除）
      vi.advanceTimersByTime(300)
      expect(ripples.value).toHaveLength(1)
      
      // 再过 300ms（第二个涟漪应该被清除）
      vi.advanceTimersByTime(300)
      expect(ripples.value).toHaveLength(0)
    })

    it('当 currentTarget 为 null 时不应创建涟漪', () => {
      const { ripples, createRipple } = useRipple()
      const event = new MouseEvent('click', { clientX: 50, clientY: 25 })
      
      // currentTarget 默认为 null
      createRipple(event)
      
      expect(ripples.value).toHaveLength(0)
    })
  })

  describe('clearRipples', () => {
    it('应清除所有涟漪', () => {
      const { ripples, createRipple, clearRipples } = useRipple()
      const element = createMockElement(100, 50)
      
      createRipple(createMockMouseEvent(30, 25, element))
      createRipple(createMockMouseEvent(70, 25, element))
      expect(ripples.value).toHaveLength(2)
      
      clearRipples()
      
      expect(ripples.value).toHaveLength(0)
    })
  })

  describe('reset', () => {
    it('应清除所有涟漪并重置 ID 计数器', () => {
      const { ripples, createRipple, reset } = useRipple()
      const element = createMockElement(100, 50)
      
      createRipple(createMockMouseEvent(30, 25, element))
      createRipple(createMockMouseEvent(70, 25, element))
      
      reset()
      
      expect(ripples.value).toHaveLength(0)
      
      // 创建新涟漪，ID 应该从 0 开始
      createRipple(createMockMouseEvent(50, 25, element))
      expect(ripples.value[0].id).toBe(0)
    })
  })
})

describe('calculateRipplePosition', () => {
  it('应正确计算涟漪位置（点击在元素中心）', () => {
    const element = createMockElement(100, 50, 10, 20)
    // 点击位置：元素中心 (60, 45)
    const event = createMockMouseEvent(60, 45, element)
    
    const result = calculateRipplePosition(event)
    
    expect(result).not.toBeNull()
    // 涟漪大小 = max(100, 50) * 2 = 200
    expect(result!.size).toBe(200)
    // x = 60 - 10 - 200/2 = -50
    expect(result!.x).toBe(-50)
    // y = 45 - 20 - 200/2 = -75
    expect(result!.y).toBe(-75)
  })

  it('应正确计算涟漪位置（点击在元素左上角）', () => {
    const element = createMockElement(100, 50, 10, 20)
    // 点击位置：元素左上角 (10, 20)
    const event = createMockMouseEvent(10, 20, element)
    
    const result = calculateRipplePosition(event)
    
    expect(result).not.toBeNull()
    // 涟漪大小 = max(100, 50) * 2 = 200
    expect(result!.size).toBe(200)
    // x = 10 - 10 - 200/2 = -100
    expect(result!.x).toBe(-100)
    // y = 20 - 20 - 200/2 = -100
    expect(result!.y).toBe(-100)
  })

  it('应正确计算涟漪位置（点击在元素右下角）', () => {
    const element = createMockElement(100, 50, 10, 20)
    // 点击位置：元素右下角 (110, 70)
    const event = createMockMouseEvent(110, 70, element)
    
    const result = calculateRipplePosition(event)
    
    expect(result).not.toBeNull()
    // 涟漪大小 = max(100, 50) * 2 = 200
    expect(result!.size).toBe(200)
    // x = 110 - 10 - 200/2 = 0
    expect(result!.x).toBe(0)
    // y = 70 - 20 - 200/2 = -50
    expect(result!.y).toBe(-50)
  })

  it('涟漪大小应基于元素的最大边长', () => {
    // 宽度大于高度
    const wideElement = createMockElement(200, 50)
    const wideEvent = createMockMouseEvent(100, 25, wideElement)
    const wideResult = calculateRipplePosition(wideEvent)
    expect(wideResult!.size).toBe(400) // 200 * 2

    // 高度大于宽度
    const tallElement = createMockElement(50, 200)
    const tallEvent = createMockMouseEvent(25, 100, tallElement)
    const tallResult = calculateRipplePosition(tallEvent)
    expect(tallResult!.size).toBe(400) // 200 * 2

    // 正方形
    const squareElement = createMockElement(100, 100)
    const squareEvent = createMockMouseEvent(50, 50, squareElement)
    const squareResult = calculateRipplePosition(squareEvent)
    expect(squareResult!.size).toBe(200) // 100 * 2
  })

  it('当 currentTarget 为 null 时应返回 null', () => {
    const event = new MouseEvent('click', { clientX: 50, clientY: 25 })
    
    const result = calculateRipplePosition(event)
    
    expect(result).toBeNull()
  })
})

describe('RIPPLE_DURATION', () => {
  it('涟漪持续时间应为 600ms', () => {
    expect(RIPPLE_DURATION).toBe(600)
  })
})
