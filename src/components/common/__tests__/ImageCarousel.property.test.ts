/**
 * ImageCarousel 组件属性测试
 * 
 * Feature: website-enhancement-v2
 * 
 * 使用 fast-check 进行属性测试，验证轮播索引计算的核心属性：
 * - 属性 11: 轮播索引计算
 * 
 * 测试配置：
 * - 测试框架：Vitest + fast-check
 * - 最小迭代次数：每个属性测试至少运行 100 次
 * - 标签格式：Feature: website-enhancement-v2, Property 11: 轮播索引计算
 * 
 * 轮播索引计算逻辑：
 * - calculateNextIndex: 向右切换，索引加 1，循环到开头
 * - calculatePrevIndex: 向左切换，索引减 1，循环到末尾
 * 
 * **Validates: Requirements 5.3**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { calculateNextIndex, calculatePrevIndex } from '../ImageCarousel.vue'

// ========== 自定义生成器 ==========

/**
 * 生成有效的图片数组长度（总数量）
 * 约束到合理的轮播图片数量范围：1 - 100
 */
const totalArb = fc.integer({ min: 1, max: 100 })

/**
 * 生成有效的当前索引
 * 索引必须在 [0, total-1] 范围内
 */
const validIndexArb = (total: number) => fc.integer({ min: 0, max: total - 1 })

/**
 * 生成有效的 (current, total) 组合
 * 确保 current 在有效范围内
 */
const validIndexPairArb = totalArb.chain(total =>
  validIndexArb(total).map(current => ({ current, total }))
)

/**
 * 生成边界情况的 total 值
 * 包括 0、1、2 等边界值
 */
const boundaryTotalArb = fc.oneof(
  fc.constant(0),
  fc.constant(1),
  fc.constant(2),
  fc.integer({ min: 3, max: 100 })
)

// ========== 测试套件 ==========

describe('ImageCarousel 属性测试', () => {
  /**
   * 属性 11：轮播索引计算
   * 
   * *对于任意* 图片数组和当前索引，向左切换应该使索引减 1（循环到末尾），
   * 向右切换应该使索引加 1（循环到开头）。
   * 
   * **Validates: Requirements 5.3**
   */
  describe('Feature: website-enhancement-v2, Property 11: 轮播索引计算', () => {
    // ========== calculateNextIndex 测试 ==========
    
    describe('calculateNextIndex 正确计算下一个索引（循环）', () => {
      it('下一个索引应等于 (current + 1) % total', () => {
        fc.assert(
          fc.property(
            validIndexPairArb,
            ({ current, total }) => {
              const result = calculateNextIndex(current, total)
              const expected = (current + 1) % total
              
              expect(result).toBe(expected)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('在最后一个索引时应循环到 0', () => {
        fc.assert(
          fc.property(
            totalArb.filter(t => t >= 1),
            (total) => {
              const lastIndex = total - 1
              const result = calculateNextIndex(lastIndex, total)
              
              expect(result).toBe(0)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('在非最后索引时应返回 current + 1', () => {
        fc.assert(
          fc.property(
            // 确保 total >= 2 且 current 不是最后一个索引
            fc.integer({ min: 2, max: 100 }).chain(total =>
              fc.integer({ min: 0, max: total - 2 }).map(current => ({ current, total }))
            ),
            ({ current, total }) => {
              const result = calculateNextIndex(current, total)
              
              expect(result).toBe(current + 1)
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    // ========== calculatePrevIndex 测试 ==========
    
    describe('calculatePrevIndex 正确计算上一个索引（循环）', () => {
      it('上一个索引应等于 (current - 1 + total) % total', () => {
        fc.assert(
          fc.property(
            validIndexPairArb,
            ({ current, total }) => {
              const result = calculatePrevIndex(current, total)
              const expected = (current - 1 + total) % total
              
              expect(result).toBe(expected)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('在第一个索引时应循环到最后一个索引', () => {
        fc.assert(
          fc.property(
            totalArb.filter(t => t >= 1),
            (total) => {
              const result = calculatePrevIndex(0, total)
              
              expect(result).toBe(total - 1)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('在非第一个索引时应返回 current - 1', () => {
        fc.assert(
          fc.property(
            // 确保 total >= 2 且 current 不是第一个索引
            fc.integer({ min: 2, max: 100 }).chain(total =>
              fc.integer({ min: 1, max: total - 1 }).map(current => ({ current, total }))
            ),
            ({ current, total }) => {
              const result = calculatePrevIndex(current, total)
              
              expect(result).toBe(current - 1)
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    // ========== 索引范围验证 ==========
    
    describe('索引始终在有效范围内 [0, total-1]', () => {
      it('calculateNextIndex 结果应在 [0, total-1] 范围内', () => {
        fc.assert(
          fc.property(
            validIndexPairArb,
            ({ current, total }) => {
              const result = calculateNextIndex(current, total)
              
              expect(result).toBeGreaterThanOrEqual(0)
              expect(result).toBeLessThan(total)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('calculatePrevIndex 结果应在 [0, total-1] 范围内', () => {
        fc.assert(
          fc.property(
            validIndexPairArb,
            ({ current, total }) => {
              const result = calculatePrevIndex(current, total)
              
              expect(result).toBeGreaterThanOrEqual(0)
              expect(result).toBeLessThan(total)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('连续调用 next 多次后索引仍在有效范围内', () => {
        fc.assert(
          fc.property(
            validIndexPairArb,
            fc.integer({ min: 1, max: 200 }),
            ({ current, total }, times) => {
              let index = current
              for (let i = 0; i < times; i++) {
                index = calculateNextIndex(index, total)
                expect(index).toBeGreaterThanOrEqual(0)
                expect(index).toBeLessThan(total)
              }
            }
          ),
          { numRuns: 100 }
        )
      })

      it('连续调用 prev 多次后索引仍在有效范围内', () => {
        fc.assert(
          fc.property(
            validIndexPairArb,
            fc.integer({ min: 1, max: 200 }),
            ({ current, total }, times) => {
              let index = current
              for (let i = 0; i < times; i++) {
                index = calculatePrevIndex(index, total)
                expect(index).toBeGreaterThanOrEqual(0)
                expect(index).toBeLessThan(total)
              }
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    // ========== 往返属性测试 ==========
    
    describe('往返属性：next 后 prev 应该回到原索引', () => {
      it('calculateNextIndex 后 calculatePrevIndex 应返回原索引', () => {
        fc.assert(
          fc.property(
            validIndexPairArb,
            ({ current, total }) => {
              const afterNext = calculateNextIndex(current, total)
              const afterPrev = calculatePrevIndex(afterNext, total)
              
              expect(afterPrev).toBe(current)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('calculatePrevIndex 后 calculateNextIndex 应返回原索引', () => {
        fc.assert(
          fc.property(
            validIndexPairArb,
            ({ current, total }) => {
              const afterPrev = calculatePrevIndex(current, total)
              const afterNext = calculateNextIndex(afterPrev, total)
              
              expect(afterNext).toBe(current)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('多次往返后应返回原索引', () => {
        fc.assert(
          fc.property(
            validIndexPairArb,
            fc.integer({ min: 1, max: 50 }),
            ({ current, total }, times) => {
              let index = current
              
              // 先执行 times 次 next
              for (let i = 0; i < times; i++) {
                index = calculateNextIndex(index, total)
              }
              
              // 再执行 times 次 prev
              for (let i = 0; i < times; i++) {
                index = calculatePrevIndex(index, total)
              }
              
              expect(index).toBe(current)
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    // ========== 循环属性测试 ==========
    
    describe('循环属性', () => {
      it('调用 total 次 next 后应回到原索引', () => {
        fc.assert(
          fc.property(
            validIndexPairArb,
            ({ current, total }) => {
              let index = current
              
              for (let i = 0; i < total; i++) {
                index = calculateNextIndex(index, total)
              }
              
              expect(index).toBe(current)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('调用 total 次 prev 后应回到原索引', () => {
        fc.assert(
          fc.property(
            validIndexPairArb,
            ({ current, total }) => {
              let index = current
              
              for (let i = 0; i < total; i++) {
                index = calculatePrevIndex(index, total)
              }
              
              expect(index).toBe(current)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('next 和 prev 是互逆操作', () => {
        fc.assert(
          fc.property(
            validIndexPairArb,
            ({ current, total }) => {
              // next(prev(x)) = x
              expect(calculateNextIndex(calculatePrevIndex(current, total), total)).toBe(current)
              
              // prev(next(x)) = x
              expect(calculatePrevIndex(calculateNextIndex(current, total), total)).toBe(current)
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    // ========== 边界情况测试 ==========
    
    describe('边界情况', () => {
      it('total 为 0 时应返回 0', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 100 }),
            (current) => {
              expect(calculateNextIndex(current, 0)).toBe(0)
              expect(calculatePrevIndex(current, 0)).toBe(0)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('total 为 1 时 next 和 prev 都应返回 0', () => {
        fc.assert(
          fc.property(
            fc.constant(0),
            (current) => {
              expect(calculateNextIndex(current, 1)).toBe(0)
              expect(calculatePrevIndex(current, 1)).toBe(0)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('total 为 2 时应正确切换', () => {
        // 从 0 开始
        expect(calculateNextIndex(0, 2)).toBe(1)
        expect(calculatePrevIndex(0, 2)).toBe(1)
        
        // 从 1 开始
        expect(calculateNextIndex(1, 2)).toBe(0)
        expect(calculatePrevIndex(1, 2)).toBe(0)
      })

      it('大数组时索引计算应正确', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 50, max: 100 }).chain(total =>
              validIndexArb(total).map(current => ({ current, total }))
            ),
            ({ current, total }) => {
              const nextResult = calculateNextIndex(current, total)
              const prevResult = calculatePrevIndex(current, total)
              
              // 验证结果在有效范围内
              expect(nextResult).toBeGreaterThanOrEqual(0)
              expect(nextResult).toBeLessThan(total)
              expect(prevResult).toBeGreaterThanOrEqual(0)
              expect(prevResult).toBeLessThan(total)
              
              // 验证计算正确性
              expect(nextResult).toBe((current + 1) % total)
              expect(prevResult).toBe((current - 1 + total) % total)
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    // ========== 不变量测试 ==========
    
    describe('不变量', () => {
      it('next 和 prev 的结果永远不相等（除非 total <= 2）', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 3, max: 100 }).chain(total =>
              validIndexArb(total).map(current => ({ current, total }))
            ),
            ({ current, total }) => {
              const nextResult = calculateNextIndex(current, total)
              const prevResult = calculatePrevIndex(current, total)
              
              expect(nextResult).not.toBe(prevResult)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('next 结果与 current 的差值应为 1 或 -(total-1)', () => {
        fc.assert(
          fc.property(
            validIndexPairArb.filter(({ total }) => total >= 1),
            ({ current, total }) => {
              const nextResult = calculateNextIndex(current, total)
              const diff = nextResult - current
              
              // 正常情况：diff = 1
              // 循环情况：diff = -(total - 1)，即从最后一个跳到第一个
              expect(diff === 1 || diff === -(total - 1)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('prev 结果与 current 的差值应为 -1 或 (total-1)', () => {
        fc.assert(
          fc.property(
            validIndexPairArb.filter(({ total }) => total >= 1),
            ({ current, total }) => {
              const prevResult = calculatePrevIndex(current, total)
              const diff = prevResult - current
              
              // 正常情况：diff = -1
              // 循环情况：diff = total - 1，即从第一个跳到最后一个
              expect(diff === -1 || diff === (total - 1)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })
    })
  })
})
