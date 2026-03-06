/**
 * useGreeting Composable 属性测试
 * 
 * Feature: website-enhancement-v2
 * 
 * 使用 fast-check 进行属性测试，验证问候语系统的核心属性：
 * - 属性 19: 问候语时间判断
 * 
 * 测试配置：
 * - 测试框架：Vitest + fast-check
 * - 最小迭代次数：每个属性测试至少运行 100 次
 * - 标签格式：Feature: website-enhancement-v2, Property 19: 问候语时间判断
 * 
 * **Validates: Requirements 8.1**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { getGreetingByHour, useGreeting, type GreetingConfig } from '../useGreeting'

// ========== 自定义生成器 ==========

/**
 * 生成有效的小时值 (0-23)
 */
const hourArb = fc.integer({ min: 0, max: 23 })

/**
 * 生成早上时间段的小时值 (5-11)
 */
const morningHourArb = fc.integer({ min: 5, max: 11 })

/**
 * 生成下午时间段的小时值 (12-17)
 */
const afternoonHourArb = fc.integer({ min: 12, max: 17 })

/**
 * 生成晚上时间段的小时值 (18-21)
 */
const eveningHourArb = fc.integer({ min: 18, max: 21 })

/**
 * 生成深夜时间段的小时值 (22-23 或 0-4)
 */
const nightHourArb = fc.oneof(
  fc.integer({ min: 22, max: 23 }),
  fc.integer({ min: 0, max: 4 })
)

/**
 * 生成自定义问候语配置
 */
const greetingConfigArb = fc.record({
  morning: fc.string({ minLength: 1, maxLength: 20 }),
  afternoon: fc.string({ minLength: 1, maxLength: 20 }),
  evening: fc.string({ minLength: 1, maxLength: 20 }),
  night: fc.string({ minLength: 1, maxLength: 20 }),
})

/**
 * 默认问候语配置
 */
const DEFAULT_CONFIG: GreetingConfig = {
  morning: '早上好',
  afternoon: '下午好',
  evening: '晚上好',
  night: '夜深了',
}

// ========== 测试套件 ==========

describe('useGreeting 属性测试', () => {
  beforeEach(() => {
    // 使用 fake timers
    vi.useFakeTimers()
  })

  afterEach(() => {
    // 恢复真实 timers
    vi.useRealTimers()
  })

  /**
   * 辅助函数：设置特定小时的系统时间
   */
  const setSystemHour = (hour: number) => {
    const mockDate = new Date(2024, 0, 1, hour, 0, 0)
    vi.setSystemTime(mockDate)
  }

  /**
   * 属性 19：问候语时间判断
   * 
   * *对于任意* 小时值（0-23），问候语应该根据时间段返回正确的问候：
   * - 5-11 点返回"早上好"
   * - 12-17 点返回"下午好"
   * - 18-21 点返回"晚上好"
   * - 其他时间返回"夜深了"
   * 
   * **Validates: Requirements 8.1**
   */
  describe('Feature: website-enhancement-v2, Property 19: 问候语时间判断', () => {
    
    /**
     * 测试 1: 5-11 点返回"早上好"
     */
    it('对于任意早上时间段 (5-11点)，应返回"早上好"', () => {
      fc.assert(
        fc.property(
          morningHourArb,
          (hour) => {
            const greeting = getGreetingByHour(hour, DEFAULT_CONFIG)
            expect(greeting).toBe('早上好')
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 测试 2: 12-17 点返回"下午好"
     */
    it('对于任意下午时间段 (12-17点)，应返回"下午好"', () => {
      fc.assert(
        fc.property(
          afternoonHourArb,
          (hour) => {
            const greeting = getGreetingByHour(hour, DEFAULT_CONFIG)
            expect(greeting).toBe('下午好')
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 测试 3: 18-21 点返回"晚上好"
     */
    it('对于任意晚上时间段 (18-21点)，应返回"晚上好"', () => {
      fc.assert(
        fc.property(
          eveningHourArb,
          (hour) => {
            const greeting = getGreetingByHour(hour, DEFAULT_CONFIG)
            expect(greeting).toBe('晚上好')
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 测试 4: 22-4 点返回"夜深了"
     */
    it('对于任意深夜时间段 (22-4点)，应返回"夜深了"', () => {
      fc.assert(
        fc.property(
          nightHourArb,
          (hour) => {
            const greeting = getGreetingByHour(hour, DEFAULT_CONFIG)
            expect(greeting).toBe('夜深了')
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 测试 5: 对于任意有效小时值，返回的问候语应属于四种之一
     */
    it('对于任意有效小时值 (0-23)，返回的问候语应属于四种预定义问候语之一', () => {
      fc.assert(
        fc.property(
          hourArb,
          (hour) => {
            const greeting = getGreetingByHour(hour, DEFAULT_CONFIG)
            const validGreetings = ['早上好', '下午好', '晚上好', '夜深了']
            expect(validGreetings).toContain(greeting)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 测试 6: 时间段边界测试 - 确保边界值正确处理
     */
    it('时间段边界值应正确处理', () => {
      // 边界值测试
      const boundaryTests = [
        { hour: 4, expected: '夜深了' },   // 深夜结束边界
        { hour: 5, expected: '早上好' },   // 早上开始边界
        { hour: 11, expected: '早上好' },  // 早上结束边界
        { hour: 12, expected: '下午好' },  // 下午开始边界
        { hour: 17, expected: '下午好' },  // 下午结束边界
        { hour: 18, expected: '晚上好' },  // 晚上开始边界
        { hour: 21, expected: '晚上好' },  // 晚上结束边界
        { hour: 22, expected: '夜深了' },  // 深夜开始边界
        { hour: 23, expected: '夜深了' },  // 23点
        { hour: 0, expected: '夜深了' },   // 午夜
      ]

      for (const { hour, expected } of boundaryTests) {
        const greeting = getGreetingByHour(hour, DEFAULT_CONFIG)
        expect(greeting).toBe(expected)
      }
    })

    /**
     * 测试 7: 自定义配置正确应用
     */
    it('对于任意自定义配置，应正确应用配置的问候语', () => {
      fc.assert(
        fc.property(
          greetingConfigArb,
          hourArb,
          (config, hour) => {
            const greeting = getGreetingByHour(hour, config)
            
            // 根据小时确定期望的问候语
            let expectedGreeting: string
            if (hour >= 5 && hour < 12) {
              expectedGreeting = config.morning
            } else if (hour >= 12 && hour < 18) {
              expectedGreeting = config.afternoon
            } else if (hour >= 18 && hour < 22) {
              expectedGreeting = config.evening
            } else {
              expectedGreeting = config.night
            }
            
            expect(greeting).toBe(expectedGreeting)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 测试 8: useGreeting Composable 集成测试
     */
    it('useGreeting Composable 应根据当前时间返回正确的问候语', () => {
      fc.assert(
        fc.property(
          hourArb,
          (hour) => {
            // 设置特定小时
            setSystemHour(hour)
            
            const { greeting } = useGreeting()
            
            // 根据小时确定期望的问候语
            let expectedGreeting: string
            if (hour >= 5 && hour < 12) {
              expectedGreeting = '早上好'
            } else if (hour >= 12 && hour < 18) {
              expectedGreeting = '下午好'
            } else if (hour >= 18 && hour < 22) {
              expectedGreeting = '晚上好'
            } else {
              expectedGreeting = '夜深了'
            }
            
            expect(greeting.value).toBe(expectedGreeting)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 测试 9: useGreeting 支持部分自定义配置
     */
    it('useGreeting 应支持部分自定义配置，未指定的使用默认值', () => {
      fc.assert(
        fc.property(
          // 生成部分配置：只包含 morning 字段，可能有值也可能没有
          fc.oneof(
            // 情况 1: 提供自定义 morning 配置
            fc.string({ minLength: 1, maxLength: 20 }).map(morning => ({ 
              config: { morning }, 
              expectedMorning: morning 
            })),
            // 情况 2: 不提供 morning 配置（使用默认值）
            fc.constant({ 
              config: {}, 
              expectedMorning: '早上好' 
            }),
            // 情况 3: 只提供 afternoon 配置
            fc.string({ minLength: 1, maxLength: 20 }).map(afternoon => ({ 
              config: { afternoon }, 
              expectedMorning: '早上好' 
            }))
          ),
          morningHourArb,
          ({ config, expectedMorning }, hour) => {
            setSystemHour(hour)
            
            const { greeting } = useGreeting(config)
            
            // 早上时间段应返回期望的问候语
            expect(greeting.value).toBe(expectedMorning)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 测试 10: 小时值规范化 - 处理超出范围的值
     */
    it('getGreetingByHour 应正确处理超出范围的小时值（规范化到 0-23）', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -100, max: 100 }),
          (hour) => {
            const greeting = getGreetingByHour(hour, DEFAULT_CONFIG)
            const validGreetings = ['早上好', '下午好', '晚上好', '夜深了']
            
            // 无论输入什么值，都应返回有效的问候语
            expect(validGreetings).toContain(greeting)
            
            // 验证规范化逻辑：((hour % 24) + 24) % 24
            const normalizedHour = ((hour % 24) + 24) % 24
            let expectedGreeting: string
            if (normalizedHour >= 5 && normalizedHour < 12) {
              expectedGreeting = '早上好'
            } else if (normalizedHour >= 12 && normalizedHour < 18) {
              expectedGreeting = '下午好'
            } else if (normalizedHour >= 18 && normalizedHour < 22) {
              expectedGreeting = '晚上好'
            } else {
              expectedGreeting = '夜深了'
            }
            
            expect(greeting).toBe(expectedGreeting)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * 额外的组合属性测试
   */
  describe('组合属性测试', () => {
    /**
     * 测试: 时间段覆盖完整性 - 24 小时都有对应的问候语
     */
    it('24 小时中的每个小时都应有对应的问候语', () => {
      for (let hour = 0; hour < 24; hour++) {
        const greeting = getGreetingByHour(hour, DEFAULT_CONFIG)
        const validGreetings = ['早上好', '下午好', '晚上好', '夜深了']
        expect(validGreetings).toContain(greeting)
      }
    })

    /**
     * 测试: 时间段不重叠 - 每个小时只属于一个时间段
     */
    it('每个小时应只属于一个时间段', () => {
      fc.assert(
        fc.property(
          hourArb,
          (hour) => {
            // 计算该小时属于哪些时间段
            const isMorning = hour >= 5 && hour < 12
            const isAfternoon = hour >= 12 && hour < 18
            const isEvening = hour >= 18 && hour < 22
            const isNight = hour >= 22 || hour < 5
            
            // 确保只属于一个时间段
            const belongsToCount = [isMorning, isAfternoon, isEvening, isNight]
              .filter(Boolean).length
            
            expect(belongsToCount).toBe(1)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 测试: 相同小时应始终返回相同问候语（确定性）
     */
    it('相同小时值应始终返回相同的问候语', () => {
      fc.assert(
        fc.property(
          hourArb,
          fc.integer({ min: 1, max: 10 }), // 调用次数
          (hour, callCount) => {
            const results: string[] = []
            
            for (let i = 0; i < callCount; i++) {
              results.push(getGreetingByHour(hour, DEFAULT_CONFIG))
            }
            
            // 所有结果应该相同
            const firstResult = results[0]
            expect(results.every(r => r === firstResult)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 测试: 自定义配置的独立性
     */
    it('不同的自定义配置应返回各自配置的问候语', () => {
      fc.assert(
        fc.property(
          greetingConfigArb,
          greetingConfigArb,
          hourArb,
          (config1, config2, hour) => {
            const greeting1 = getGreetingByHour(hour, config1)
            const greeting2 = getGreetingByHour(hour, config2)
            
            // 根据小时确定应该使用哪个配置字段
            let field: keyof GreetingConfig
            if (hour >= 5 && hour < 12) {
              field = 'morning'
            } else if (hour >= 12 && hour < 18) {
              field = 'afternoon'
            } else if (hour >= 18 && hour < 22) {
              field = 'evening'
            } else {
              field = 'night'
            }
            
            expect(greeting1).toBe(config1[field])
            expect(greeting2).toBe(config2[field])
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
