/**
 * useGesture Composable 属性测试
 * 
 * Feature: website-enhancement-v2
 * 
 * 使用 fast-check 进行属性测试，验证手势识别的核心属性：
 * - 属性 9: 手势识别与阈值判断
 * 
 * 测试配置：
 * - 测试框架：Vitest + fast-check
 * - 最小迭代次数：每个属性测试至少运行 100 次
 * - 标签格式：Feature: website-enhancement-v2, Property N: {property_text}
 * 
 * 手势识别逻辑：
 * - 水平滑动距离 >= 50px 且速度 >= 0.3 px/ms 时触发滑动事件
 * - 距离或速度不满足条件时不触发事件
 * - 正确区分左滑和右滑方向
 * 
 * **Validates: Requirements 3.1, 3.2**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  calculateSwipeData,
  detectSwipeDirection,
  DEFAULT_MIN_DISTANCE,
  DEFAULT_MIN_VELOCITY,
  type SwipeDirection,
} from '../useGesture'

// ========== 自定义生成器 ==========

/**
 * 生成屏幕坐标（像素）
 * 约束到合理的屏幕坐标范围：0 - 2000px
 */
const coordinateArb = fc.integer({ min: 0, max: 2000 })

/**
 * 生成时间戳（毫秒）
 * 约束到合理的时间范围：0 - 10000ms
 */
const timestampArb = fc.integer({ min: 0, max: 10000 })


/**
 * 生成正数的时间间隔（毫秒）
 * 确保时间间隔 > 0，避免除以零
 */
const positiveTimeIntervalArb = fc.integer({ min: 1, max: 5000 })

/**
 * 生成满足水平滑动阈值的滑动数据
 * - 水平距离 >= 50px
 * - 速度 >= 0.3 px/ms
 */
const validHorizontalSwipeArb = fc.record({
  startX: coordinateArb,
  startY: coordinateArb,
  // 确保水平位移 >= 50px
  deltaX: fc.integer({ min: DEFAULT_MIN_DISTANCE, max: 500 }),
  // 垂直位移小于水平位移，确保是水平滑动
  deltaY: fc.integer({ min: -49, max: 49 }),
}).chain(({ startX, startY, deltaX, deltaY }) => {
  // 计算需要的最大时间以满足速度阈值
  // 速度 = 距离 / 时间 >= 0.3
  // 时间 <= 距离 / 0.3
  const maxTime = Math.floor(Math.abs(deltaX) / DEFAULT_MIN_VELOCITY)
  return fc.record({
    startX: fc.constant(startX),
    startY: fc.constant(startY),
    endX: fc.constant(startX + deltaX),
    endY: fc.constant(startY + deltaY),
    // 时间间隔确保速度 >= 0.3
    deltaTime: fc.integer({ min: 1, max: Math.max(1, maxTime) }),
  })
})

/**
 * 生成不满足距离阈值的滑动数据
 * - 水平距离 < 50px
 */
const insufficientDistanceSwipeArb = fc.record({
  startX: coordinateArb,
  startY: coordinateArb,
  // 水平位移 < 50px
  deltaX: fc.integer({ min: -49, max: 49 }),
  deltaY: fc.integer({ min: -49, max: 49 }),
  deltaTime: positiveTimeIntervalArb,
}).map(({ startX, startY, deltaX, deltaY, deltaTime }) => ({
  startX,
  startY,
  endX: startX + deltaX,
  endY: startY + deltaY,
  deltaTime,
}))

/**
 * 生成不满足速度阈值的滑动数据
 * - 水平距离 >= 50px
 * - 速度 < 0.3 px/ms
 */
const insufficientVelocitySwipeArb = fc.record({
  startX: coordinateArb,
  startY: coordinateArb,
  // 确保水平位移 >= 50px
  deltaX: fc.integer({ min: DEFAULT_MIN_DISTANCE, max: 500 }),
  deltaY: fc.integer({ min: -49, max: 49 }),
}).chain(({ startX, startY, deltaX, deltaY }) => {
  // 计算需要的最小时间以确保速度 < 0.3
  // 速度 = 距离 / 时间 < 0.3
  // 时间 > 距离 / 0.3
  const minTime = Math.ceil(Math.abs(deltaX) / DEFAULT_MIN_VELOCITY) + 1
  return fc.record({
    startX: fc.constant(startX),
    startY: fc.constant(startY),
    endX: fc.constant(startX + deltaX),
    endY: fc.constant(startY + deltaY),
    // 时间间隔确保速度 < 0.3
    deltaTime: fc.integer({ min: minTime, max: minTime + 5000 }),
  })
})


/**
 * 生成向右滑动的数据（满足阈值）
 * - deltaX > 0
 * - 水平距离 >= 50px
 * - 速度 >= 0.3 px/ms
 */
const validRightSwipeArb = fc.record({
  startX: coordinateArb,
  startY: coordinateArb,
  // 正向水平位移 >= 50px
  deltaX: fc.integer({ min: DEFAULT_MIN_DISTANCE, max: 500 }),
  deltaY: fc.integer({ min: -49, max: 49 }),
}).chain(({ startX, startY, deltaX, deltaY }) => {
  const maxTime = Math.floor(deltaX / DEFAULT_MIN_VELOCITY)
  return fc.record({
    startX: fc.constant(startX),
    startY: fc.constant(startY),
    endX: fc.constant(startX + deltaX),
    endY: fc.constant(startY + deltaY),
    deltaTime: fc.integer({ min: 1, max: Math.max(1, maxTime) }),
  })
})

/**
 * 生成向左滑动的数据（满足阈值）
 * - deltaX < 0
 * - 水平距离 >= 50px
 * - 速度 >= 0.3 px/ms
 */
const validLeftSwipeArb = fc.record({
  startX: fc.integer({ min: DEFAULT_MIN_DISTANCE, max: 2000 }), // 确保有足够空间向左滑动
  startY: coordinateArb,
  // 负向水平位移，绝对值 >= 50px
  deltaX: fc.integer({ min: -500, max: -DEFAULT_MIN_DISTANCE }),
  deltaY: fc.integer({ min: -49, max: 49 }),
}).chain(({ startX, startY, deltaX, deltaY }) => {
  const maxTime = Math.floor(Math.abs(deltaX) / DEFAULT_MIN_VELOCITY)
  return fc.record({
    startX: fc.constant(startX),
    startY: fc.constant(startY),
    endX: fc.constant(startX + deltaX),
    endY: fc.constant(startY + deltaY),
    deltaTime: fc.integer({ min: 1, max: Math.max(1, maxTime) }),
  })
})

/**
 * 生成任意滑动数据（用于通用测试）
 */
const anySwipeArb = fc.record({
  startX: coordinateArb,
  startY: coordinateArb,
  endX: coordinateArb,
  endY: coordinateArb,
  startTime: timestampArb,
}).chain(({ startX, startY, endX, endY, startTime }) => {
  return fc.record({
    startX: fc.constant(startX),
    startY: fc.constant(startY),
    endX: fc.constant(endX),
    endY: fc.constant(endY),
    startTime: fc.constant(startTime),
    // 确保结束时间 > 开始时间
    endTime: fc.integer({ min: startTime + 1, max: startTime + 5000 }),
  })
})


// ========== 测试套件 ==========

describe('useGesture 属性测试', () => {
  /**
   * 属性 9：手势识别与阈值判断
   * 
   * *对于任意* 触摸起点和终点坐标以及时间间隔，只有当水平滑动距离 ≥ 50px 
   * 且速度 ≥ 阈值时，才应触发左右滑动事件。
   * 
   * **Validates: Requirements 3.1, 3.2**
   */
  describe('Feature: website-enhancement-v2, Property 9: 手势识别与阈值判断', () => {
    
    // ========== 子属性 1: 满足阈值时触发滑动事件 ==========
    
    it('水平滑动距离 >= 50px 且速度 >= 0.3 时应触发滑动事件', () => {
      fc.assert(
        fc.property(
          validHorizontalSwipeArb,
          ({ startX, startY, endX, endY, deltaTime }) => {
            const startTime = 0
            const endTime = deltaTime
            
            const swipeData = calculateSwipeData(
              startX, startY, endX, endY, startTime, endTime
            )
            
            const direction = detectSwipeDirection(
              swipeData, DEFAULT_MIN_DISTANCE, DEFAULT_MIN_VELOCITY
            )
            
            // 应该触发滑动事件（方向不为 null）
            expect(direction).not.toBeNull()
            // 应该是水平方向（左或右）
            expect(['left', 'right']).toContain(direction)
          }
        ),
        { numRuns: 100 }
      )
    })

    // ========== 子属性 2: 距离不满足时不触发事件 ==========
    
    it('水平滑动距离 < 50px 时不应触发滑动事件', () => {
      fc.assert(
        fc.property(
          insufficientDistanceSwipeArb,
          ({ startX, startY, endX, endY, deltaTime }) => {
            const startTime = 0
            const endTime = deltaTime
            
            const swipeData = calculateSwipeData(
              startX, startY, endX, endY, startTime, endTime
            )
            
            const direction = detectSwipeDirection(
              swipeData, DEFAULT_MIN_DISTANCE, DEFAULT_MIN_VELOCITY
            )
            
            // 不应该触发滑动事件
            expect(direction).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })

    // ========== 子属性 3: 速度不满足时不触发事件 ==========
    
    it('速度 < 0.3 px/ms 时不应触发滑动事件', () => {
      fc.assert(
        fc.property(
          insufficientVelocitySwipeArb,
          ({ startX, startY, endX, endY, deltaTime }) => {
            const startTime = 0
            const endTime = deltaTime
            
            const swipeData = calculateSwipeData(
              startX, startY, endX, endY, startTime, endTime
            )
            
            const direction = detectSwipeDirection(
              swipeData, DEFAULT_MIN_DISTANCE, DEFAULT_MIN_VELOCITY
            )
            
            // 不应该触发滑动事件
            expect(direction).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })


    // ========== 子属性 4: 正确区分左滑和右滑方向 ==========
    
    it('deltaX > 0 时应识别为向右滑动', () => {
      fc.assert(
        fc.property(
          validRightSwipeArb,
          ({ startX, startY, endX, endY, deltaTime }) => {
            const startTime = 0
            const endTime = deltaTime
            
            const swipeData = calculateSwipeData(
              startX, startY, endX, endY, startTime, endTime
            )
            
            const direction = detectSwipeDirection(
              swipeData, DEFAULT_MIN_DISTANCE, DEFAULT_MIN_VELOCITY
            )
            
            // 应该识别为向右滑动
            expect(direction).toBe('right')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('deltaX < 0 时应识别为向左滑动', () => {
      fc.assert(
        fc.property(
          validLeftSwipeArb,
          ({ startX, startY, endX, endY, deltaTime }) => {
            const startTime = 0
            const endTime = deltaTime
            
            const swipeData = calculateSwipeData(
              startX, startY, endX, endY, startTime, endTime
            )
            
            const direction = detectSwipeDirection(
              swipeData, DEFAULT_MIN_DISTANCE, DEFAULT_MIN_VELOCITY
            )
            
            // 应该识别为向左滑动
            expect(direction).toBe('left')
          }
        ),
        { numRuns: 100 }
      )
    })

    // ========== 子属性 5: 阈值边界条件 ==========
    
    it('刚好满足阈值条件时应触发滑动事件', () => {
      fc.assert(
        fc.property(
          coordinateArb,
          coordinateArb,
          fc.boolean(), // 决定滑动方向
          (startX, startY, isRightSwipe) => {
            // 刚好 50px 距离
            const deltaX = isRightSwipe ? DEFAULT_MIN_DISTANCE : -DEFAULT_MIN_DISTANCE
            const endX = startX + deltaX
            const endY = startY + 10 // 小的垂直位移，确保是水平滑动
            
            // 刚好满足速度阈值：50px / 166ms ≈ 0.301 px/ms
            const deltaTime = Math.floor(DEFAULT_MIN_DISTANCE / DEFAULT_MIN_VELOCITY)
            
            const swipeData = calculateSwipeData(
              startX, startY, endX, endY, 0, deltaTime
            )
            
            const direction = detectSwipeDirection(
              swipeData, DEFAULT_MIN_DISTANCE, DEFAULT_MIN_VELOCITY
            )
            
            // 应该触发滑动事件
            expect(direction).not.toBeNull()
            expect(direction).toBe(isRightSwipe ? 'right' : 'left')
          }
        ),
        { numRuns: 100 }
      )
    })


    // ========== 子属性 6: 滑动数据计算正确性 ==========
    
    it('calculateSwipeData 应正确计算位移和速度', () => {
      fc.assert(
        fc.property(
          anySwipeArb,
          ({ startX, startY, endX, endY, startTime, endTime }) => {
            const swipeData = calculateSwipeData(
              startX, startY, endX, endY, startTime, endTime
            )
            
            // 验证位移计算
            expect(swipeData.deltaX).toBe(endX - startX)
            expect(swipeData.deltaY).toBe(endY - startY)
            
            // 验证时间计算（最小为 1，防止除以零）
            const expectedDeltaTime = Math.max(endTime - startTime, 1)
            expect(swipeData.deltaTime).toBe(expectedDeltaTime)
            
            // 验证速度计算
            expect(swipeData.velocityX).toBe(Math.abs(swipeData.deltaX) / swipeData.deltaTime)
            expect(swipeData.velocityY).toBe(Math.abs(swipeData.deltaY) / swipeData.deltaTime)
            
            // 验证水平/垂直判断
            const isHorizontal = Math.abs(swipeData.deltaX) > Math.abs(swipeData.deltaY)
            expect(swipeData.isHorizontal).toBe(isHorizontal)
          }
        ),
        { numRuns: 100 }
      )
    })

    // ========== 子属性 7: 水平滑动优先于垂直滑动 ==========
    
    it('当水平位移大于垂直位移时应判断为水平滑动', () => {
      fc.assert(
        fc.property(
          fc.record({
            startX: coordinateArb,
            startY: coordinateArb,
            // 确保水平位移 > 垂直位移
            horizontalDelta: fc.integer({ min: 51, max: 500 }),
            verticalDelta: fc.integer({ min: -50, max: 50 }),
            deltaTime: positiveTimeIntervalArb,
          }),
          ({ startX, startY, horizontalDelta, verticalDelta, deltaTime }) => {
            const endX = startX + horizontalDelta
            const endY = startY + verticalDelta
            
            const swipeData = calculateSwipeData(
              startX, startY, endX, endY, 0, deltaTime
            )
            
            // 应该判断为水平滑动
            expect(swipeData.isHorizontal).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('当垂直位移大于水平位移时应判断为垂直滑动', () => {
      fc.assert(
        fc.property(
          fc.record({
            startX: coordinateArb,
            startY: coordinateArb,
            // 确保垂直位移 > 水平位移
            horizontalDelta: fc.integer({ min: -50, max: 50 }),
            verticalDelta: fc.integer({ min: 51, max: 500 }),
            deltaTime: positiveTimeIntervalArb,
          }),
          ({ startX, startY, horizontalDelta, verticalDelta, deltaTime }) => {
            const endX = startX + horizontalDelta
            const endY = startY + verticalDelta
            
            const swipeData = calculateSwipeData(
              startX, startY, endX, endY, 0, deltaTime
            )
            
            // 应该判断为垂直滑动
            expect(swipeData.isHorizontal).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  /**
   * 额外的边界情况测试
   */
  describe('边界情况', () => {
    it('时间间隔为 0 时应防止除以零', () => {
      fc.assert(
        fc.property(
          coordinateArb,
          coordinateArb,
          coordinateArb,
          coordinateArb,
          timestampArb,
          (startX, startY, endX, endY, time) => {
            // 开始时间和结束时间相同
            const swipeData = calculateSwipeData(
              startX, startY, endX, endY, time, time
            )
            
            // deltaTime 应该至少为 1，防止除以零
            expect(swipeData.deltaTime).toBeGreaterThanOrEqual(1)
            // 速度应该是有限数值
            expect(Number.isFinite(swipeData.velocityX)).toBe(true)
            expect(Number.isFinite(swipeData.velocityY)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('原地不动（位移为 0）时不应触发滑动', () => {
      fc.assert(
        fc.property(
          coordinateArb,
          coordinateArb,
          positiveTimeIntervalArb,
          (x, y, deltaTime) => {
            // 起点和终点相同
            const swipeData = calculateSwipeData(x, y, x, y, 0, deltaTime)
            
            const direction = detectSwipeDirection(
              swipeData, DEFAULT_MIN_DISTANCE, DEFAULT_MIN_VELOCITY
            )
            
            // 不应该触发滑动
            expect(direction).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('极快滑动（高速度）应正确触发', () => {
      fc.assert(
        fc.property(
          coordinateArb,
          coordinateArb,
          fc.boolean(),
          (startX, startY, isRightSwipe) => {
            // 100px 在 10ms 内完成 = 10 px/ms（远超阈值）
            const deltaX = isRightSwipe ? 100 : -100
            const endX = startX + deltaX
            const endY = startY + 5
            const deltaTime = 10
            
            const swipeData = calculateSwipeData(
              startX, startY, endX, endY, 0, deltaTime
            )
            
            const direction = detectSwipeDirection(
              swipeData, DEFAULT_MIN_DISTANCE, DEFAULT_MIN_VELOCITY
            )
            
            // 应该触发滑动
            expect(direction).toBe(isRightSwipe ? 'right' : 'left')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('极慢滑动（低速度）不应触发', () => {
      fc.assert(
        fc.property(
          coordinateArb,
          coordinateArb,
          fc.boolean(),
          (startX, startY, isRightSwipe) => {
            // 100px 在 1000ms 内完成 = 0.1 px/ms（低于阈值）
            const deltaX = isRightSwipe ? 100 : -100
            const endX = startX + deltaX
            const endY = startY + 5
            const deltaTime = 1000
            
            const swipeData = calculateSwipeData(
              startX, startY, endX, endY, 0, deltaTime
            )
            
            const direction = detectSwipeDirection(
              swipeData, DEFAULT_MIN_DISTANCE, DEFAULT_MIN_VELOCITY
            )
            
            // 不应该触发滑动
            expect(direction).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  /**
   * 阈值常量验证
   */
  describe('阈值常量', () => {
    it('DEFAULT_MIN_DISTANCE 应为 50', () => {
      expect(DEFAULT_MIN_DISTANCE).toBe(50)
    })

    it('DEFAULT_MIN_VELOCITY 应为 0.3', () => {
      expect(DEFAULT_MIN_VELOCITY).toBe(0.3)
    })
  })

  /**
   * 自定义阈值测试
   */
  describe('自定义阈值', () => {
    it('应支持自定义最小距离阈值', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 200 }), // 自定义最小距离
          coordinateArb,
          coordinateArb,
          (customMinDistance, startX, startY) => {
            // 滑动距离刚好等于自定义阈值
            const endX = startX + customMinDistance
            // 垂直位移必须小于水平位移，确保是水平滑动
            const verticalDelta = Math.min(5, Math.floor(customMinDistance / 2) - 1)
            const endY = startY + verticalDelta
            // 确保速度满足默认阈值
            const deltaTime = Math.floor(customMinDistance / DEFAULT_MIN_VELOCITY)
            
            const swipeData = calculateSwipeData(
              startX, startY, endX, endY, 0, deltaTime
            )
            
            const direction = detectSwipeDirection(
              swipeData, customMinDistance, DEFAULT_MIN_VELOCITY
            )
            
            // 应该触发滑动
            expect(direction).toBe('right')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('应支持自定义最小速度阈值', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.1, max: 2.0, noNaN: true }), // 自定义最小速度
          coordinateArb,
          coordinateArb,
          (customMinVelocity, startX, startY) => {
            // 滑动距离满足默认阈值
            const deltaX = 100
            const endX = startX + deltaX
            const endY = startY + 10
            // 确保速度刚好满足自定义阈值
            const deltaTime = Math.floor(deltaX / customMinVelocity)
            
            const swipeData = calculateSwipeData(
              startX, startY, endX, endY, 0, deltaTime
            )
            
            const direction = detectSwipeDirection(
              swipeData, DEFAULT_MIN_DISTANCE, customMinVelocity
            )
            
            // 应该触发滑动
            expect(direction).toBe('right')
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
