/**
 * useReadingProgress Composable 属性测试
 * 
 * Feature: website-enhancement-v2
 * 
 * 使用 fast-check 进行属性测试，验证阅读进度计算的核心属性：
 * - 属性 20: 阅读进度计算
 * 
 * 测试配置：
 * - 测试框架：Vitest + fast-check
 * - 最小迭代次数：每个属性测试至少运行 100 次
 * - 标签格式：Feature: website-enhancement-v2, Property 20: 阅读进度计算
 * 
 * **Validates: Requirements 8.2**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { calculateProgress } from '../useReadingProgress'

// ========== 自定义生成器 ==========

const scrollTopArb = fc.float({ min: 0, max: 100000, noNaN: true })
const docHeightArb = fc.float({ min: 1, max: 100000, noNaN: true })
const viewportHeightArb = fc.float({ min: 1, max: 10000, noNaN: true })

const scrollableDocArb = fc.tuple(
  fc.float({ min: 100, max: 100000, noNaN: true }),
  fc.float({ min: 1, max: 99, noNaN: true })
).map(([docHeight, factor]) => {
  const viewportHeight = Math.max(1, docHeight * (factor / 100))
  return { docHeight, viewportHeight }
})

const nonScrollableDocArb = fc.tuple(
  fc.float({ min: 1, max: 1000, noNaN: true }),
  fc.float({ min: 1, max: 2, noNaN: true })
).map(([docHeight, factor]) => {
  const viewportHeight = docHeight * factor
  return { docHeight, viewportHeight }
})

// ========== 测试套件 ==========

describe('useReadingProgress 属性测试', () => {
  describe('Feature: website-enhancement-v2, Property 20: 阅读进度计算', () => {
    
    it('对于任意滚动位置和文档尺寸，进度值应始终在 [0, 100] 范围内', () => {
      fc.assert(
        fc.property(
          scrollTopArb,
          docHeightArb,
          viewportHeightArb,
          (scrollTop, docHeight, viewportHeight) => {
            const progress = calculateProgress(scrollTop, docHeight, viewportHeight)
            expect(progress).toBeGreaterThanOrEqual(0)
            expect(progress).toBeLessThanOrEqual(100)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('当 scrollTop = 0 时，进度应为 0', () => {
      fc.assert(
        fc.property(
          scrollableDocArb,
          ({ docHeight, viewportHeight }) => {
            const progress = calculateProgress(0, docHeight, viewportHeight)
            expect(progress).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('当 scrollTop = maxScrollDistance 时，进度应为 100', () => {
      fc.assert(
        fc.property(
          scrollableDocArb,
          ({ docHeight, viewportHeight }) => {
            const maxScrollDistance = docHeight - viewportHeight
            const progress = calculateProgress(maxScrollDistance, docHeight, viewportHeight)
            expect(progress).toBe(100)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('当文档高度 <= 视口高度时，进度应为 0', () => {
      fc.assert(
        fc.property(
          nonScrollableDocArb,
          scrollTopArb,
          ({ docHeight, viewportHeight }, scrollTop) => {
            const progress = calculateProgress(scrollTop, docHeight, viewportHeight)
            expect(progress).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('进度计算公式应正确', () => {
      fc.assert(
        fc.property(
          scrollableDocArb,
          fc.float({ min: 0, max: 1, noNaN: true }),
          ({ docHeight, viewportHeight }, scrollRatio) => {
            const maxScrollDistance = docHeight - viewportHeight
            const scrollTop = maxScrollDistance * scrollRatio
            const progress = calculateProgress(scrollTop, docHeight, viewportHeight)
            const expectedProgress = scrollRatio * 100
            expect(progress).toBeCloseTo(expectedProgress, 5)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('进度应随滚动位置单调递增', () => {
      fc.assert(
        fc.property(
          scrollableDocArb,
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.float({ min: 0, max: 1, noNaN: true }),
          ({ docHeight, viewportHeight }, ratio1, ratio2) => {
            const maxScrollDistance = docHeight - viewportHeight
            const scrollTop1 = maxScrollDistance * Math.min(ratio1, ratio2)
            const scrollTop2 = maxScrollDistance * Math.max(ratio1, ratio2)
            const progress1 = calculateProgress(scrollTop1, docHeight, viewportHeight)
            const progress2 = calculateProgress(scrollTop2, docHeight, viewportHeight)
            expect(progress2).toBeGreaterThanOrEqual(progress1)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('负滚动位置应产生 0 进度', () => {
      fc.assert(
        fc.property(
          scrollableDocArb,
          fc.float({ min: Math.fround(-10000), max: Math.fround(-0.001), noNaN: true }),
          ({ docHeight, viewportHeight }, negativeScrollTop) => {
            const progress = calculateProgress(negativeScrollTop, docHeight, viewportHeight)
            expect(progress).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('超出最大滚动距离应产生 100 进度', () => {
      fc.assert(
        fc.property(
          scrollableDocArb,
          fc.integer({ min: 2, max: 10 }),
          ({ docHeight, viewportHeight }, overflowFactor) => {
            const maxScrollDistance = docHeight - viewportHeight
            const scrollTop = maxScrollDistance * overflowFactor
            const progress = calculateProgress(scrollTop, docHeight, viewportHeight)
            expect(progress).toBe(100)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('50% 滚动位置应产生 50% 进度', () => {
      fc.assert(
        fc.property(
          scrollableDocArb,
          ({ docHeight, viewportHeight }) => {
            const maxScrollDistance = docHeight - viewportHeight
            const scrollTop = maxScrollDistance * 0.5
            const progress = calculateProgress(scrollTop, docHeight, viewportHeight)
            expect(progress).toBeCloseTo(50, 5)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('边界值应正确处理', () => {
      const testCases = [
        { scrollTop: 0, docHeight: 1000, viewportHeight: 500, expected: 0 },
        { scrollTop: 500, docHeight: 1000, viewportHeight: 500, expected: 100 },
        { scrollTop: 250, docHeight: 1000, viewportHeight: 500, expected: 50 },
        { scrollTop: 0, docHeight: 500, viewportHeight: 500, expected: 0 },
        { scrollTop: 100, docHeight: 500, viewportHeight: 600, expected: 0 },
        { scrollTop: -100, docHeight: 1000, viewportHeight: 500, expected: 0 },
        { scrollTop: 1000, docHeight: 1000, viewportHeight: 500, expected: 100 },
      ]
      for (const { scrollTop, docHeight, viewportHeight, expected } of testCases) {
        const progress = calculateProgress(scrollTop, docHeight, viewportHeight)
        expect(progress).toBeCloseTo(expected, 5)
      }
    })
  })

  describe('组合属性测试', () => {
    it('相同输入应始终产生相同的进度值', () => {
      fc.assert(
        fc.property(
          scrollTopArb,
          docHeightArb,
          viewportHeightArb,
          fc.integer({ min: 1, max: 10 }),
          (scrollTop, docHeight, viewportHeight, callCount) => {
            const results: number[] = []
            for (let i = 0; i < callCount; i++) {
              results.push(calculateProgress(scrollTop, docHeight, viewportHeight))
            }
            const firstResult = results[0]
            expect(results.every(r => r === firstResult)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('小的滚动变化应产生小的进度变化', () => {
      fc.assert(
        fc.property(
          scrollableDocArb,
          fc.integer({ min: 10, max: 90 }),
          fc.integer({ min: 1, max: 5 }),
          ({ docHeight, viewportHeight }, basePercent, deltaPercent) => {
            const baseRatio = basePercent / 100
            const delta = deltaPercent / 100
            const maxScrollDistance = docHeight - viewportHeight
            const scrollTop1 = maxScrollDistance * baseRatio
            const scrollTop2 = maxScrollDistance * (baseRatio + delta)
            const progress1 = calculateProgress(scrollTop1, docHeight, viewportHeight)
            const progress2 = calculateProgress(scrollTop2, docHeight, viewportHeight)
            const progressDelta = Math.abs(progress2 - progress1)
            const expectedDelta = delta * 100
            expect(progressDelta).toBeCloseTo(expectedDelta, 2)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('进度计算应具有数值稳定性', () => {
      fc.assert(
        fc.property(
          scrollTopArb,
          docHeightArb,
          viewportHeightArb,
          (scrollTop, docHeight, viewportHeight) => {
            const progress = calculateProgress(scrollTop, docHeight, viewportHeight)
            expect(Number.isFinite(progress)).toBe(true)
            expect(Number.isNaN(progress)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('零或负文档高度应安全处理', () => {
      fc.assert(
        fc.property(
          scrollTopArb,
          fc.float({ min: -1000, max: 0, noNaN: true }),
          viewportHeightArb,
          (scrollTop, docHeight, viewportHeight) => {
            const progress = calculateProgress(scrollTop, docHeight, viewportHeight)
            expect(progress).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
