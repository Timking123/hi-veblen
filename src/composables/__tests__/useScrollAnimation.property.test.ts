/**
 * useScrollAnimation Composable 属性测试
 * 
 * Feature: website-enhancement-v2
 * 
 * 使用 fast-check 进行属性测试，验证滚动动画的核心属性：
 * - 属性 8: 滚动动画配置
 * 
 * 测试配置：
 * - 测试框架：Vitest + fast-check
 * - 最小迭代次数：每个属性测试至少运行 100 次
 * - 标签格式：Feature: website-enhancement-v2, Property N: {property_text}
 * 
 * 滚动动画配置逻辑：
 * - 动画类型：fade-in, slide-up, slide-left, scale-in
 * - 延迟时间：以毫秒为单位
 * - 阈值：0-1 范围，表示元素进入视口的比例
 * 
 * **Validates: Requirements 2.8**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  generateAnimationClass,
  generateAnimationStyle,
  isValidAnimationType,
  normalizeOptions,
  ANIMATION_TYPES,
  DEFAULT_ANIMATION_TYPE,
  DEFAULT_DELAY,
  DEFAULT_THRESHOLD,
  DEFAULT_ONCE,
  type AnimationType,
  type ScrollAnimationOptions,
} from '../useScrollAnimation'

// ========== 自定义生成器 ==========

/**
 * 生成有效的动画类型
 * 约束到 'fade-in' | 'slide-up' | 'slide-left' | 'scale-in' 四种有效值
 */
const animationTypeArb = fc.constantFrom<AnimationType>('fade-in', 'slide-up', 'slide-left', 'scale-in')

/**
 * 生成无效的动画类型字符串
 * 用于测试类型验证
 */
const invalidAnimationTypeArb = fc.string().filter(s => !ANIMATION_TYPES.includes(s as AnimationType))

/**
 * 生成动画延迟时间（毫秒）
 * 约束到合理的范围：0 - 5000ms
 */
const delayArb = fc.integer({ min: 0, max: 5000 })

/**
 * 生成负数延迟时间
 * 用于测试边界情况
 */
const negativeDelayArb = fc.integer({ min: -5000, max: -1 })

/**
 * 生成阈值（0-1 范围）
 * 表示元素进入视口的比例
 */
const thresholdArb = fc.double({ min: 0, max: 1, noNaN: true })

/**
 * 生成布尔值（用于 isVisible 和 once 参数）
 */
const booleanArb = fc.boolean()

/**
 * 生成完整的滚动动画配置选项
 */
const scrollAnimationOptionsArb = fc.record({
  type: fc.option(animationTypeArb, { nil: undefined }),
  delay: fc.option(delayArb, { nil: undefined }),
  threshold: fc.option(thresholdArb, { nil: undefined }),
  once: fc.option(booleanArb, { nil: undefined }),
})

/**
 * 生成部分滚动动画配置选项
 * 用于测试默认值填充
 */
const partialOptionsArb = fc.oneof(
  fc.constant({}),
  fc.record({ type: animationTypeArb }),
  fc.record({ delay: delayArb }),
  fc.record({ threshold: thresholdArb }),
  fc.record({ once: booleanArb }),
  fc.record({ type: animationTypeArb, delay: delayArb }),
  fc.record({ type: animationTypeArb, threshold: thresholdArb }),
  fc.record({ delay: delayArb, once: booleanArb }),
)

// ========== 测试套件 ==========

describe('useScrollAnimation 属性测试', () => {
  /**
   * 属性 8：滚动动画配置
   * 
   * *对于任意* 滚动动画配置（类型、延迟、阈值），生成的 CSS 类名和样式应该正确反映配置值。
   * 
   * **Validates: Requirements 2.8**
   */
  describe('Feature: website-enhancement-v2, Property 8: 滚动动画配置', () => {
    
    // ========== CSS 类名生成测试 ==========

    describe('CSS 类名生成', () => {
      it('对于任意有效动画类型和可见状态，生成的类名应包含正确的动画类型类', () => {
        fc.assert(
          fc.property(
            animationTypeArb,
            booleanArb,
            (type, isVisible) => {
              const result = generateAnimationClass(type, isVisible)
              
              // 应该始终包含基础类
              expect(result['scroll-animate']).toBe(true)
              
              // 应该包含对应的动画类型类
              expect(result[`scroll-animate--${type}`]).toBe(true)
              
              // 可见状态类应该与 isVisible 参数一致
              expect(result['scroll-animate--visible']).toBe(isVisible)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('生成的类名对象应始终包含 scroll-animate 基础类', () => {
        fc.assert(
          fc.property(
            animationTypeArb,
            booleanArb,
            (type, isVisible) => {
              const result = generateAnimationClass(type, isVisible)
              
              expect(result).toHaveProperty('scroll-animate')
              expect(result['scroll-animate']).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('当 isVisible 为 true 时，类名应包含 scroll-animate--visible', () => {
        fc.assert(
          fc.property(
            animationTypeArb,
            (type) => {
              const result = generateAnimationClass(type, true)
              
              expect(result['scroll-animate--visible']).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('当 isVisible 为 false 时，类名不应包含 scroll-animate--visible', () => {
        fc.assert(
          fc.property(
            animationTypeArb,
            (type) => {
              const result = generateAnimationClass(type, false)
              
              expect(result['scroll-animate--visible']).toBe(false)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('每种动画类型应生成唯一的类名', () => {
        fc.assert(
          fc.property(
            booleanArb,
            (isVisible) => {
              const results = ANIMATION_TYPES.map(type => generateAnimationClass(type, isVisible))
              
              // 验证每种类型生成的类名不同
              for (let i = 0; i < results.length; i++) {
                for (let j = i + 1; j < results.length; j++) {
                  const type1 = ANIMATION_TYPES[i]
                  const type2 = ANIMATION_TYPES[j]
                  
                  // 类型特定的类应该不同
                  expect(results[i][`scroll-animate--${type1}`]).toBe(true)
                  expect(results[j][`scroll-animate--${type2}`]).toBe(true)
                  expect(results[i][`scroll-animate--${type2}`]).toBeUndefined()
                  expect(results[j][`scroll-animate--${type1}`]).toBeUndefined()
                }
              }
            }
          ),
          { numRuns: 100 }
        )
      })

      it('类名对象应只包含布尔值', () => {
        fc.assert(
          fc.property(
            animationTypeArb,
            booleanArb,
            (type, isVisible) => {
              const result = generateAnimationClass(type, isVisible)
              
              // 验证所有值都是布尔类型
              for (const key of Object.keys(result)) {
                expect(typeof result[key]).toBe('boolean')
              }
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    // ========== CSS 样式生成测试 ==========

    describe('CSS 样式生成', () => {
      it('对于任意延迟时间，生成的样式应包含正确的 transitionDelay', () => {
        fc.assert(
          fc.property(
            delayArb,
            (delay) => {
              const result = generateAnimationStyle(delay)
              
              // 应该包含 transitionDelay 属性
              expect(result).toHaveProperty('transitionDelay')
              
              // transitionDelay 应该是正确的格式
              expect(result.transitionDelay).toBe(`${delay}ms`)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('延迟为 0 时，transitionDelay 应为 "0ms"', () => {
        const result = generateAnimationStyle(0)
        expect(result.transitionDelay).toBe('0ms')
      })

      it('延迟时间应正确转换为毫秒字符串格式', () => {
        fc.assert(
          fc.property(
            delayArb,
            (delay) => {
              const result = generateAnimationStyle(delay)
              
              // 验证格式：数字 + "ms"
              const match = result.transitionDelay.match(/^(-?\d+)ms$/)
              expect(match).not.toBeNull()
              expect(parseInt(match![1], 10)).toBe(delay)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('负数延迟时间也应正确处理', () => {
        fc.assert(
          fc.property(
            negativeDelayArb,
            (delay) => {
              const result = generateAnimationStyle(delay)
              
              // 即使是负数，也应该正确格式化
              expect(result.transitionDelay).toBe(`${delay}ms`)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('样式对象应只包含 transitionDelay 属性', () => {
        fc.assert(
          fc.property(
            delayArb,
            (delay) => {
              const result = generateAnimationStyle(delay)
              
              // 验证只有一个属性
              const keys = Object.keys(result)
              expect(keys).toHaveLength(1)
              expect(keys[0]).toBe('transitionDelay')
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    // ========== 动画类型验证测试 ==========

    describe('动画类型验证', () => {
      it('所有预定义的动画类型应被识别为有效', () => {
        fc.assert(
          fc.property(
            animationTypeArb,
            (type) => {
              expect(isValidAnimationType(type)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('无效的动画类型字符串应被识别为无效', () => {
        fc.assert(
          fc.property(
            invalidAnimationTypeArb,
            (invalidType) => {
              expect(isValidAnimationType(invalidType)).toBe(false)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('ANIMATION_TYPES 常量应包含所有四种动画类型', () => {
        expect(ANIMATION_TYPES).toHaveLength(4)
        expect(ANIMATION_TYPES).toContain('fade-in')
        expect(ANIMATION_TYPES).toContain('slide-up')
        expect(ANIMATION_TYPES).toContain('slide-left')
        expect(ANIMATION_TYPES).toContain('scale-in')
      })

      it('空字符串应被识别为无效动画类型', () => {
        expect(isValidAnimationType('')).toBe(false)
      })

      it('大小写敏感：大写变体应被识别为无效', () => {
        fc.assert(
          fc.property(
            animationTypeArb,
            (type) => {
              const upperCase = type.toUpperCase()
              // 只有当大写版本与原版本不同时才测试
              if (upperCase !== type) {
                expect(isValidAnimationType(upperCase)).toBe(false)
              }
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    // ========== 选项规范化测试 ==========

    describe('选项规范化', () => {
      it('空选项对象应返回所有默认值', () => {
        const result = normalizeOptions({})
        
        expect(result.type).toBe(DEFAULT_ANIMATION_TYPE)
        expect(result.delay).toBe(DEFAULT_DELAY)
        expect(result.threshold).toBe(DEFAULT_THRESHOLD)
        expect(result.once).toBe(DEFAULT_ONCE)
      })

      it('undefined 选项应返回所有默认值', () => {
        const result = normalizeOptions(undefined)
        
        expect(result.type).toBe(DEFAULT_ANIMATION_TYPE)
        expect(result.delay).toBe(DEFAULT_DELAY)
        expect(result.threshold).toBe(DEFAULT_THRESHOLD)
        expect(result.once).toBe(DEFAULT_ONCE)
      })

      it('提供的选项值应覆盖默认值', () => {
        fc.assert(
          fc.property(
            animationTypeArb,
            delayArb,
            thresholdArb,
            booleanArb,
            (type, delay, threshold, once) => {
              const options: ScrollAnimationOptions = { type, delay, threshold, once }
              const result = normalizeOptions(options)
              
              expect(result.type).toBe(type)
              expect(result.delay).toBe(delay)
              expect(result.threshold).toBe(threshold)
              expect(result.once).toBe(once)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('部分选项应与默认值合并', () => {
        fc.assert(
          fc.property(
            partialOptionsArb,
            (partialOptions) => {
              const result = normalizeOptions(partialOptions as ScrollAnimationOptions)
              
              // 验证所有字段都有值
              expect(result.type).toBeDefined()
              expect(result.delay).toBeDefined()
              expect(result.threshold).toBeDefined()
              expect(result.once).toBeDefined()
              
              // 验证提供的值被保留
              if ('type' in partialOptions && partialOptions.type !== undefined) {
                expect(result.type).toBe(partialOptions.type)
              } else {
                expect(result.type).toBe(DEFAULT_ANIMATION_TYPE)
              }
              
              if ('delay' in partialOptions && partialOptions.delay !== undefined) {
                expect(result.delay).toBe(partialOptions.delay)
              } else {
                expect(result.delay).toBe(DEFAULT_DELAY)
              }
              
              if ('threshold' in partialOptions && partialOptions.threshold !== undefined) {
                expect(result.threshold).toBe(partialOptions.threshold)
              } else {
                expect(result.threshold).toBe(DEFAULT_THRESHOLD)
              }
              
              if ('once' in partialOptions && partialOptions.once !== undefined) {
                expect(result.once).toBe(partialOptions.once)
              } else {
                expect(result.once).toBe(DEFAULT_ONCE)
              }
            }
          ),
          { numRuns: 100 }
        )
      })

      it('规范化后的选项应始终包含所有必需字段', () => {
        fc.assert(
          fc.property(
            scrollAnimationOptionsArb,
            (options) => {
              const result = normalizeOptions(options as ScrollAnimationOptions)
              
              // 验证返回的对象包含所有必需字段
              expect(result).toHaveProperty('type')
              expect(result).toHaveProperty('delay')
              expect(result).toHaveProperty('threshold')
              expect(result).toHaveProperty('once')
              
              // 验证类型正确
              expect(typeof result.type).toBe('string')
              expect(typeof result.delay).toBe('number')
              expect(typeof result.threshold).toBe('number')
              expect(typeof result.once).toBe('boolean')
            }
          ),
          { numRuns: 100 }
        )
      })

      it('规范化后的 type 应始终是有效的动画类型', () => {
        fc.assert(
          fc.property(
            scrollAnimationOptionsArb,
            (options) => {
              const result = normalizeOptions(options as ScrollAnimationOptions)
              
              expect(isValidAnimationType(result.type)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('规范化后的 threshold 应在 [0, 1] 范围内（当提供有效值时）', () => {
        fc.assert(
          fc.property(
            thresholdArb,
            (threshold) => {
              const result = normalizeOptions({ threshold })
              
              expect(result.threshold).toBeGreaterThanOrEqual(0)
              expect(result.threshold).toBeLessThanOrEqual(1)
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    // ========== 默认值常量测试 ==========

    describe('默认值常量', () => {
      it('DEFAULT_ANIMATION_TYPE 应为 "fade-in"', () => {
        expect(DEFAULT_ANIMATION_TYPE).toBe('fade-in')
      })

      it('DEFAULT_DELAY 应为 0', () => {
        expect(DEFAULT_DELAY).toBe(0)
      })

      it('DEFAULT_THRESHOLD 应为 0.1', () => {
        expect(DEFAULT_THRESHOLD).toBe(0.1)
      })

      it('DEFAULT_ONCE 应为 true', () => {
        expect(DEFAULT_ONCE).toBe(true)
      })

      it('DEFAULT_ANIMATION_TYPE 应是有效的动画类型', () => {
        expect(isValidAnimationType(DEFAULT_ANIMATION_TYPE)).toBe(true)
      })

      it('DEFAULT_THRESHOLD 应在有效范围内 [0, 1]', () => {
        expect(DEFAULT_THRESHOLD).toBeGreaterThanOrEqual(0)
        expect(DEFAULT_THRESHOLD).toBeLessThanOrEqual(1)
      })
    })

    // ========== 配置一致性测试 ==========

    describe('配置一致性', () => {
      it('相同的配置应生成相同的类名', () => {
        fc.assert(
          fc.property(
            animationTypeArb,
            booleanArb,
            (type, isVisible) => {
              const result1 = generateAnimationClass(type, isVisible)
              const result2 = generateAnimationClass(type, isVisible)
              
              expect(result1).toEqual(result2)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('相同的延迟应生成相同的样式', () => {
        fc.assert(
          fc.property(
            delayArb,
            (delay) => {
              const result1 = generateAnimationStyle(delay)
              const result2 = generateAnimationStyle(delay)
              
              expect(result1).toEqual(result2)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('相同的选项应规范化为相同的结果', () => {
        fc.assert(
          fc.property(
            scrollAnimationOptionsArb,
            (options) => {
              const result1 = normalizeOptions(options as ScrollAnimationOptions)
              const result2 = normalizeOptions(options as ScrollAnimationOptions)
              
              expect(result1).toEqual(result2)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('类名和样式应与规范化后的配置一致', () => {
        fc.assert(
          fc.property(
            scrollAnimationOptionsArb,
            booleanArb,
            (options, isVisible) => {
              const normalized = normalizeOptions(options as ScrollAnimationOptions)
              
              const animationClass = generateAnimationClass(normalized.type, isVisible)
              const animationStyle = generateAnimationStyle(normalized.delay)
              
              // 验证类名包含正确的动画类型
              expect(animationClass[`scroll-animate--${normalized.type}`]).toBe(true)
              
              // 验证样式包含正确的延迟
              expect(animationStyle.transitionDelay).toBe(`${normalized.delay}ms`)
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    // ========== 边界情况测试 ==========

    describe('边界情况', () => {
      it('极大延迟值应正确处理', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 10000, max: 100000 }),
            (largeDelay) => {
              const result = generateAnimationStyle(largeDelay)
              
              expect(result.transitionDelay).toBe(`${largeDelay}ms`)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('阈值边界值 0 和 1 应正确处理', () => {
        const result0 = normalizeOptions({ threshold: 0 })
        const result1 = normalizeOptions({ threshold: 1 })
        
        expect(result0.threshold).toBe(0)
        expect(result1.threshold).toBe(1)
      })

      it('所有动画类型都应能生成有效的类名', () => {
        for (const type of ANIMATION_TYPES) {
          const resultVisible = generateAnimationClass(type, true)
          const resultHidden = generateAnimationClass(type, false)
          
          expect(resultVisible['scroll-animate']).toBe(true)
          expect(resultVisible[`scroll-animate--${type}`]).toBe(true)
          expect(resultVisible['scroll-animate--visible']).toBe(true)
          
          expect(resultHidden['scroll-animate']).toBe(true)
          expect(resultHidden[`scroll-animate--${type}`]).toBe(true)
          expect(resultHidden['scroll-animate--visible']).toBe(false)
        }
      })
    })
  })
})
