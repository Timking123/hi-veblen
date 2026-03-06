/**
 * useGesture Composable 单元测试
 * 
 * 测试手势处理功能的核心逻辑：
 * - 滑动数据计算
 * - 滑动方向检测
 * - 距离和速度阈值判断
 * - 触觉反馈触发
 * - 事件监听器绑定/解绑
 * 
 * 验证需求：
 * - 需求 3.1: 用户在移动端左右滑动时切换到上一页或下一页
 * - 需求 3.2: 滑动距离超过 50px 且速度超过阈值才触发页面切换
 * - 需求 3.3: 用户触摸交互元素时提供触觉反馈（如果设备支持）
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  useGesture,
  calculateSwipeData,
  detectSwipeDirection,
  triggerHapticFeedback,
  DEFAULT_MIN_DISTANCE,
  DEFAULT_MIN_VELOCITY,
  HAPTIC_FEEDBACK_DURATION,
  type SwipeData,
} from '../useGesture'

describe('useGesture', () => {
  describe('初始状态', () => {
    it('初始时 isSwiping 应为 false', () => {
      const { isSwiping } = useGesture()
      expect(isSwiping.value).toBe(false)
    })

    it('初始时 lastSwipeDirection 应为 null', () => {
      const { lastSwipeDirection } = useGesture()
      expect(lastSwipeDirection.value).toBeNull()
    })

    it('初始时 elementRef 应为 null', () => {
      const { elementRef } = useGesture()
      expect(elementRef.value).toBeNull()
    })
  })

  describe('reset', () => {
    it('应重置所有状态', () => {
      const { isSwiping, lastSwipeDirection, reset } = useGesture()
      
      // 模拟一些状态变化
      isSwiping.value = true
      lastSwipeDirection.value = 'left'
      
      reset()
      
      expect(isSwiping.value).toBe(false)
      expect(lastSwipeDirection.value).toBeNull()
    })
  })
})

describe('calculateSwipeData', () => {
  it('应正确计算水平向右滑动数据', () => {
    const result = calculateSwipeData(0, 100, 100, 100, 0, 200)
    
    expect(result.deltaX).toBe(100)
    expect(result.deltaY).toBe(0)
    expect(result.deltaTime).toBe(200)
    expect(result.velocityX).toBe(0.5) // 100 / 200
    expect(result.velocityY).toBe(0)
    expect(result.isHorizontal).toBe(true)
  })

  it('应正确计算水平向左滑动数据', () => {
    const result = calculateSwipeData(100, 100, 0, 100, 0, 200)
    
    expect(result.deltaX).toBe(-100)
    expect(result.deltaY).toBe(0)
    expect(result.isHorizontal).toBe(true)
  })

  it('应正确计算垂直向下滑动数据', () => {
    const result = calculateSwipeData(100, 0, 100, 100, 0, 200)
    
    expect(result.deltaX).toBe(0)
    expect(result.deltaY).toBe(100)
    expect(result.velocityX).toBe(0)
    expect(result.velocityY).toBe(0.5) // 100 / 200
    expect(result.isHorizontal).toBe(false)
  })

  it('应正确计算垂直向上滑动数据', () => {
    const result = calculateSwipeData(100, 100, 100, 0, 0, 200)
    
    expect(result.deltaX).toBe(0)
    expect(result.deltaY).toBe(-100)
    expect(result.isHorizontal).toBe(false)
  })

  it('应正确判断对角线滑动的主方向（水平优先）', () => {
    // 水平位移大于垂直位移
    const result = calculateSwipeData(0, 0, 100, 50, 0, 200)
    
    expect(result.deltaX).toBe(100)
    expect(result.deltaY).toBe(50)
    expect(result.isHorizontal).toBe(true)
  })

  it('应正确判断对角线滑动的主方向（垂直优先）', () => {
    // 垂直位移大于水平位移
    const result = calculateSwipeData(0, 0, 50, 100, 0, 200)
    
    expect(result.deltaX).toBe(50)
    expect(result.deltaY).toBe(100)
    expect(result.isHorizontal).toBe(false)
  })

  it('当时间差为 0 时应防止除以零', () => {
    const result = calculateSwipeData(0, 0, 100, 0, 100, 100)
    
    expect(result.deltaTime).toBe(1) // 最小值为 1
    expect(result.velocityX).toBe(100) // 100 / 1
  })

  it('应正确计算快速滑动的速度', () => {
    // 100px 在 100ms 内完成 = 1 px/ms
    const result = calculateSwipeData(0, 0, 100, 0, 0, 100)
    
    expect(result.velocityX).toBe(1)
  })

  it('应正确计算慢速滑动的速度', () => {
    // 100px 在 1000ms 内完成 = 0.1 px/ms
    const result = calculateSwipeData(0, 0, 100, 0, 0, 1000)
    
    expect(result.velocityX).toBe(0.1)
  })
})

describe('detectSwipeDirection', () => {
  const minDistance = DEFAULT_MIN_DISTANCE // 50
  const minVelocity = DEFAULT_MIN_VELOCITY // 0.3

  describe('水平滑动', () => {
    it('应检测向右滑动（满足阈值）', () => {
      const swipeData: SwipeData = {
        deltaX: 60,
        deltaY: 10,
        deltaTime: 100,
        velocityX: 0.6,
        velocityY: 0.1,
        isHorizontal: true,
      }
      
      const result = detectSwipeDirection(swipeData, minDistance, minVelocity)
      expect(result).toBe('right')
    })

    it('应检测向左滑动（满足阈值）', () => {
      const swipeData: SwipeData = {
        deltaX: -60,
        deltaY: 10,
        deltaTime: 100,
        velocityX: 0.6,
        velocityY: 0.1,
        isHorizontal: true,
      }
      
      const result = detectSwipeDirection(swipeData, minDistance, minVelocity)
      expect(result).toBe('left')
    })

    it('距离不足时不应触发滑动', () => {
      const swipeData: SwipeData = {
        deltaX: 40, // 小于 50
        deltaY: 10,
        deltaTime: 100,
        velocityX: 0.4,
        velocityY: 0.1,
        isHorizontal: true,
      }
      
      const result = detectSwipeDirection(swipeData, minDistance, minVelocity)
      expect(result).toBeNull()
    })

    it('速度不足时不应触发滑动', () => {
      const swipeData: SwipeData = {
        deltaX: 60,
        deltaY: 10,
        deltaTime: 300,
        velocityX: 0.2, // 小于 0.3
        velocityY: 0.03,
        isHorizontal: true,
      }
      
      const result = detectSwipeDirection(swipeData, minDistance, minVelocity)
      expect(result).toBeNull()
    })

    it('刚好满足阈值时应触发滑动', () => {
      const swipeData: SwipeData = {
        deltaX: 50, // 刚好等于 50
        deltaY: 10,
        deltaTime: 166,
        velocityX: 0.3, // 刚好等于 0.3
        velocityY: 0.06,
        isHorizontal: true,
      }
      
      const result = detectSwipeDirection(swipeData, minDistance, minVelocity)
      expect(result).toBe('right')
    })
  })

  describe('垂直滑动', () => {
    it('应检测向下滑动（满足阈值）', () => {
      const swipeData: SwipeData = {
        deltaX: 10,
        deltaY: 60,
        deltaTime: 100,
        velocityX: 0.1,
        velocityY: 0.6,
        isHorizontal: false,
      }
      
      const result = detectSwipeDirection(swipeData, minDistance, minVelocity)
      expect(result).toBe('down')
    })

    it('应检测向上滑动（满足阈值）', () => {
      const swipeData: SwipeData = {
        deltaX: 10,
        deltaY: -60,
        deltaTime: 100,
        velocityX: 0.1,
        velocityY: 0.6,
        isHorizontal: false,
      }
      
      const result = detectSwipeDirection(swipeData, minDistance, minVelocity)
      expect(result).toBe('up')
    })

    it('距离不足时不应触发滑动', () => {
      const swipeData: SwipeData = {
        deltaX: 10,
        deltaY: 40, // 小于 50
        deltaTime: 100,
        velocityX: 0.1,
        velocityY: 0.4,
        isHorizontal: false,
      }
      
      const result = detectSwipeDirection(swipeData, minDistance, minVelocity)
      expect(result).toBeNull()
    })

    it('速度不足时不应触发滑动', () => {
      const swipeData: SwipeData = {
        deltaX: 10,
        deltaY: 60,
        deltaTime: 300,
        velocityX: 0.03,
        velocityY: 0.2, // 小于 0.3
        isHorizontal: false,
      }
      
      const result = detectSwipeDirection(swipeData, minDistance, minVelocity)
      expect(result).toBeNull()
    })
  })

  describe('自定义阈值', () => {
    it('应支持自定义最小距离', () => {
      const swipeData: SwipeData = {
        deltaX: 80,
        deltaY: 10,
        deltaTime: 100,
        velocityX: 0.8,
        velocityY: 0.1,
        isHorizontal: true,
      }
      
      // 使用更大的最小距离
      const result = detectSwipeDirection(swipeData, 100, minVelocity)
      expect(result).toBeNull() // 80 < 100
    })

    it('应支持自定义最小速度', () => {
      const swipeData: SwipeData = {
        deltaX: 60,
        deltaY: 10,
        deltaTime: 100,
        velocityX: 0.6,
        velocityY: 0.1,
        isHorizontal: true,
      }
      
      // 使用更大的最小速度
      const result = detectSwipeDirection(swipeData, minDistance, 1.0)
      expect(result).toBeNull() // 0.6 < 1.0
    })
  })
})

describe('triggerHapticFeedback', () => {
  let originalVibrate: typeof navigator.vibrate | undefined

  beforeEach(() => {
    // 保存原始的 vibrate 方法
    originalVibrate = navigator.vibrate
  })

  afterEach(() => {
    // 恢复原始的 vibrate 方法
    if (originalVibrate !== undefined) {
      Object.defineProperty(navigator, 'vibrate', {
        value: originalVibrate,
        writable: true,
        configurable: true,
      })
    }
  })

  it('当设备支持 vibrate 时应触发触觉反馈', () => {
    const mockVibrate = vi.fn().mockReturnValue(true)
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      writable: true,
      configurable: true,
    })
    
    const result = triggerHapticFeedback()
    
    expect(result).toBe(true)
    expect(mockVibrate).toHaveBeenCalledWith(HAPTIC_FEEDBACK_DURATION)
  })

  it('当设备不支持 vibrate 时应返回 false', () => {
    // 删除 vibrate 属性
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'vibrate')
    if (descriptor) {
      delete (navigator as { vibrate?: typeof navigator.vibrate }).vibrate
    }
    
    const result = triggerHapticFeedback()
    
    expect(result).toBe(false)
  })

  it('当 vibrate 抛出异常时应静默处理并返回 false', () => {
    const mockVibrate = vi.fn().mockImplementation(() => {
      throw new Error('Vibration not allowed')
    })
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      writable: true,
      configurable: true,
    })
    
    const result = triggerHapticFeedback()
    
    expect(result).toBe(false)
  })
})

describe('常量', () => {
  it('DEFAULT_MIN_DISTANCE 应为 50', () => {
    expect(DEFAULT_MIN_DISTANCE).toBe(50)
  })

  it('DEFAULT_MIN_VELOCITY 应为 0.3', () => {
    expect(DEFAULT_MIN_VELOCITY).toBe(0.3)
  })

  it('HAPTIC_FEEDBACK_DURATION 应为 10', () => {
    expect(HAPTIC_FEEDBACK_DURATION).toBe(10)
  })
})
