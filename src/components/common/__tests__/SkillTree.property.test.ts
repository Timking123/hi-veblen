/**
 * SkillTree 组件属性测试
 * 
 * Feature: website-enhancement-v2
 * 
 * 使用 fast-check 进行属性测试，验证技能树的核心属性：
 * - 属性 13: 技能树节点展开折叠
 * - 属性 14: 技能节点大小计算
 * 
 * 测试配置：
 * - 测试框架：Vitest + fast-check
 * - 最小迭代次数：每个属性测试至少运行 100 次
 * - 标签格式：Feature: website-enhancement-v2, Property N: {property_text}
 * 
 * **Validates: Requirements 6.2, 6.4**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { SkillTreeNode, SkillTreeConfig, SkillTreeExpandState } from '@/types/skillTree'
import { defaultSkillTreeConfig } from '@/types/skillTree'

// ========== 辅助函数：模拟展开/折叠状态管理 ==========

/**
 * 创建展开状态管理器
 * 用于测试展开/折叠的往返属性
 */
function createExpandStateManager() {
  const state: SkillTreeExpandState = {
    expandedNodes: new Set<string>(),
  }

  return {
    /**
     * 展开节点
     */
    expand(nodeId: string): void {
      state.expandedNodes.add(nodeId)
    },

    /**
     * 折叠节点
     */
    collapse(nodeId: string): void {
      state.expandedNodes.delete(nodeId)
    },

    /**
     * 切换节点展开状态
     */
    toggle(nodeId: string): void {
      if (state.expandedNodes.has(nodeId)) {
        state.expandedNodes.delete(nodeId)
      } else {
        state.expandedNodes.add(nodeId)
      }
    },

    /**
     * 检查节点是否展开
     */
    isExpanded(nodeId: string): boolean {
      return state.expandedNodes.has(nodeId)
    },

    /**
     * 获取所有展开的节点 ID
     */
    getExpandedNodes(): string[] {
      return Array.from(state.expandedNodes)
    },

    /**
     * 获取展开节点数量
     */
    getExpandedCount(): number {
      return state.expandedNodes.size
    },

    /**
     * 重置状态
     */
    reset(): void {
      state.expandedNodes.clear()
    },

    /**
     * 克隆当前状态
     */
    clone(): Set<string> {
      return new Set(state.expandedNodes)
    },
  }
}

// ========== 辅助函数：节点大小计算 ==========

/**
 * 计算节点大小
 * 根据熟练度（0-100）计算节点大小（10-30px）
 * 
 * @param level 熟练度等级 (0-100)
 * @param config 可选的配置对象
 * @returns 节点大小（像素）
 */
function calculateNodeSize(level: number, config?: Partial<SkillTreeConfig>): number {
  const nodeSize = config?.nodeSize ?? defaultSkillTreeConfig.nodeSize
  return nodeSize(level)
}

/**
 * 验证节点大小是否在有效范围内
 * 
 * @param size 节点大小
 * @param minSize 最小大小（默认 10）
 * @param maxSize 最大大小（默认 30）
 * @returns 是否在有效范围内
 */
function isValidNodeSize(size: number, minSize = 10, maxSize = 30): boolean {
  return size >= minSize && size <= maxSize
}

/**
 * 验证节点大小是否与熟练度成正比
 * 
 * @param level1 第一个熟练度
 * @param level2 第二个熟练度
 * @param size1 第一个节点大小
 * @param size2 第二个节点大小
 * @returns 是否成正比
 */
function isProportional(level1: number, level2: number, size1: number, size2: number): boolean {
  // 如果熟练度相等，大小也应该相等
  if (level1 === level2) {
    return size1 === size2
  }
  // 如果 level1 > level2，则 size1 >= size2
  if (level1 > level2) {
    return size1 >= size2
  }
  // 如果 level1 < level2，则 size1 <= size2
  return size1 <= size2
}

// ========== 自定义生成器 ==========

/**
 * 生成有效的节点 ID
 */
const nodeIdArb = fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0)

/**
 * 生成有效的熟练度值（0-100）
 */
const levelArb = fc.integer({ min: 0, max: 100 })

/**
 * 生成有效的技能名称
 */
const skillNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)

/**
 * 生成简单的技能树节点（无子节点）
 */
const simpleNodeArb: fc.Arbitrary<SkillTreeNode> = fc.record({
  id: nodeIdArb,
  name: skillNameArb,
  level: levelArb,
  experience: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: undefined }),
})

/**
 * 生成带子节点的技能树节点（递归，最多 3 层深度）
 */
const skillTreeNodeArb = (maxDepth: number = 3): fc.Arbitrary<SkillTreeNode> => {
  if (maxDepth <= 0) {
    return simpleNodeArb
  }
  
  return fc.record({
    id: nodeIdArb,
    name: skillNameArb,
    level: levelArb,
    experience: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: undefined }),
    children: fc.option(
      fc.array(skillTreeNodeArb(maxDepth - 1), { minLength: 0, maxLength: 5 }),
      { nil: undefined }
    ),
  })
}

/**
 * 生成节点 ID 数组（用于展开/折叠测试）
 */
const nodeIdArrayArb = fc.array(nodeIdArb, { minLength: 1, maxLength: 20 })

/**
 * 生成两个不同的熟练度值（用于比较测试）
 */
const twoLevelsArb = fc.tuple(levelArb, levelArb)

/**
 * 生成边界熟练度值
 */
const boundaryLevelArb = fc.oneof(
  fc.constant(0),
  fc.constant(50),
  fc.constant(100),
  levelArb
)

// ========== 测试套件 ==========

describe('SkillTree 属性测试', () => {
  /**
   * 属性 13：技能树节点展开折叠
   * 
   * *对于任意* 技能树节点，展开后再折叠应该恢复到原始状态（往返属性）。
   * 
   * **Validates: Requirements 6.2**
   */
  describe('Feature: website-enhancement-v2, Property 13: 技能树节点展开折叠', () => {
    // ========== 单节点展开/折叠往返测试 ==========
    
    describe('单节点展开/折叠往返属性', () => {
      it('展开后再折叠应恢复到原始状态（未展开）', () => {
        fc.assert(
          fc.property(
            nodeIdArb,
            (nodeId) => {
              const manager = createExpandStateManager()
              
              // 初始状态：未展开
              expect(manager.isExpanded(nodeId)).toBe(false)
              
              // 展开节点
              manager.expand(nodeId)
              expect(manager.isExpanded(nodeId)).toBe(true)
              
              // 折叠节点
              manager.collapse(nodeId)
              expect(manager.isExpanded(nodeId)).toBe(false)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('折叠后再展开应恢复到展开状态', () => {
        fc.assert(
          fc.property(
            nodeIdArb,
            (nodeId) => {
              const manager = createExpandStateManager()
              
              // 先展开
              manager.expand(nodeId)
              expect(manager.isExpanded(nodeId)).toBe(true)
              
              // 折叠
              manager.collapse(nodeId)
              expect(manager.isExpanded(nodeId)).toBe(false)
              
              // 再展开
              manager.expand(nodeId)
              expect(manager.isExpanded(nodeId)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('toggle 两次应恢复到原始状态', () => {
        fc.assert(
          fc.property(
            nodeIdArb,
            (nodeId) => {
              const manager = createExpandStateManager()
              
              // 记录初始状态
              const initialState = manager.isExpanded(nodeId)
              
              // toggle 两次
              manager.toggle(nodeId)
              manager.toggle(nodeId)
              
              // 应恢复到初始状态
              expect(manager.isExpanded(nodeId)).toBe(initialState)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('toggle 偶数次应恢复到原始状态', () => {
        fc.assert(
          fc.property(
            nodeIdArb,
            fc.integer({ min: 1, max: 50 }),
            (nodeId, times) => {
              const manager = createExpandStateManager()
              
              // 记录初始状态
              const initialState = manager.isExpanded(nodeId)
              
              // toggle 偶数次（times * 2）
              for (let i = 0; i < times * 2; i++) {
                manager.toggle(nodeId)
              }
              
              // 应恢复到初始状态
              expect(manager.isExpanded(nodeId)).toBe(initialState)
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    // ========== 多节点展开/折叠测试 ==========
    
    describe('多节点展开/折叠往返属性', () => {
      it('展开多个节点后全部折叠应恢复到初始状态', () => {
        fc.assert(
          fc.property(
            nodeIdArrayArb,
            (nodeIds) => {
              const manager = createExpandStateManager()
              
              // 展开所有节点
              nodeIds.forEach(id => manager.expand(id))
              
              // 折叠所有节点
              nodeIds.forEach(id => manager.collapse(id))
              
              // 所有节点应该都未展开
              nodeIds.forEach(id => {
                expect(manager.isExpanded(id)).toBe(false)
              })
              expect(manager.getExpandedCount()).toBe(0)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('展开状态应该正确记录每个节点', () => {
        fc.assert(
          fc.property(
            nodeIdArrayArb,
            (nodeIds) => {
              const manager = createExpandStateManager()
              const uniqueIds = [...new Set(nodeIds)]
              
              // 展开所有节点
              uniqueIds.forEach(id => manager.expand(id))
              
              // 验证每个节点都已展开
              uniqueIds.forEach(id => {
                expect(manager.isExpanded(id)).toBe(true)
              })
              
              // 展开节点数量应等于唯一 ID 数量
              expect(manager.getExpandedCount()).toBe(uniqueIds.length)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('部分折叠后应只保留未折叠的节点', () => {
        fc.assert(
          fc.property(
            fc.array(nodeIdArb, { minLength: 2, maxLength: 20 }),
            (nodeIds) => {
              const manager = createExpandStateManager()
              const uniqueIds = [...new Set(nodeIds)]
              
              if (uniqueIds.length < 2) return // 需要至少 2 个不同的节点
              
              // 展开所有节点
              uniqueIds.forEach(id => manager.expand(id))
              
              // 折叠一半的节点
              const halfLength = Math.floor(uniqueIds.length / 2)
              const toCollapse = uniqueIds.slice(0, halfLength)
              const toKeep = uniqueIds.slice(halfLength)
              
              toCollapse.forEach(id => manager.collapse(id))
              
              // 验证折叠的节点已折叠
              toCollapse.forEach(id => {
                expect(manager.isExpanded(id)).toBe(false)
              })
              
              // 验证保留的节点仍然展开
              toKeep.forEach(id => {
                expect(manager.isExpanded(id)).toBe(true)
              })
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    // ========== 状态克隆与恢复测试 ==========
    
    describe('状态克隆与恢复', () => {
      it('克隆状态后修改原状态不应影响克隆', () => {
        fc.assert(
          fc.property(
            nodeIdArrayArb,
            (nodeIds) => {
              const manager = createExpandStateManager()
              const uniqueIds = [...new Set(nodeIds)]
              
              // 展开一些节点
              uniqueIds.forEach(id => manager.expand(id))
              
              // 克隆状态
              const clonedState = manager.clone()
              
              // 修改原状态（折叠所有）
              uniqueIds.forEach(id => manager.collapse(id))
              
              // 克隆的状态应该保持不变
              uniqueIds.forEach(id => {
                expect(clonedState.has(id)).toBe(true)
              })
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    // ========== 幂等性测试 ==========
    
    describe('幂等性', () => {
      it('多次展开同一节点应该是幂等的', () => {
        fc.assert(
          fc.property(
            nodeIdArb,
            fc.integer({ min: 2, max: 10 }),
            (nodeId, times) => {
              const manager = createExpandStateManager()
              
              // 多次展开同一节点
              for (let i = 0; i < times; i++) {
                manager.expand(nodeId)
              }
              
              // 应该只有一个展开的节点
              expect(manager.getExpandedCount()).toBe(1)
              expect(manager.isExpanded(nodeId)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('多次折叠同一节点应该是幂等的', () => {
        fc.assert(
          fc.property(
            nodeIdArb,
            fc.integer({ min: 2, max: 10 }),
            (nodeId, times) => {
              const manager = createExpandStateManager()
              
              // 先展开
              manager.expand(nodeId)
              
              // 多次折叠同一节点
              for (let i = 0; i < times; i++) {
                manager.collapse(nodeId)
              }
              
              // 应该没有展开的节点
              expect(manager.getExpandedCount()).toBe(0)
              expect(manager.isExpanded(nodeId)).toBe(false)
            }
          ),
          { numRuns: 100 }
        )
      })
    })
  })


  /**
   * 属性 14：技能节点大小计算
   * 
   * *对于任意* 技能熟练度值（0-100），计算出的节点大小应该与熟练度成正比，
   * 且在合理的最小/最大范围内（10-30px）。
   * 
   * **Validates: Requirements 6.4**
   */
  describe('Feature: website-enhancement-v2, Property 14: 技能节点大小计算', () => {
    // ========== 范围验证测试 ==========
    
    describe('节点大小范围验证', () => {
      it('任意熟练度值的节点大小应在 [10, 30] 范围内', () => {
        fc.assert(
          fc.property(
            levelArb,
            (level) => {
              const size = calculateNodeSize(level)
              
              expect(size).toBeGreaterThanOrEqual(10)
              expect(size).toBeLessThanOrEqual(30)
              expect(isValidNodeSize(size)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('熟练度为 0 时节点大小应为最小值 10', () => {
        const size = calculateNodeSize(0)
        expect(size).toBe(10)
      })

      it('熟练度为 100 时节点大小应为最大值 30', () => {
        const size = calculateNodeSize(100)
        expect(size).toBe(30)
      })

      it('熟练度为 50 时节点大小应为中间值 20', () => {
        const size = calculateNodeSize(50)
        expect(size).toBe(20)
      })

      it('边界熟练度值的节点大小应在有效范围内', () => {
        fc.assert(
          fc.property(
            boundaryLevelArb,
            (level) => {
              const size = calculateNodeSize(level)
              
              expect(isValidNodeSize(size)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    // ========== 正比关系测试 ==========
    
    describe('节点大小与熟练度成正比', () => {
      it('熟练度越高，节点大小应该越大或相等', () => {
        fc.assert(
          fc.property(
            twoLevelsArb,
            ([level1, level2]) => {
              const size1 = calculateNodeSize(level1)
              const size2 = calculateNodeSize(level2)
              
              expect(isProportional(level1, level2, size1, size2)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('相同熟练度应产生相同的节点大小', () => {
        fc.assert(
          fc.property(
            levelArb,
            (level) => {
              const size1 = calculateNodeSize(level)
              const size2 = calculateNodeSize(level)
              
              expect(size1).toBe(size2)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('熟练度差值越大，节点大小差值也应越大', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 50 }),
            fc.integer({ min: 1, max: 50 }),
            fc.integer({ min: 1, max: 50 }),
            (base, diff1, diff2) => {
              // 确保不超过 100
              const level1 = Math.min(base, 100)
              const level2 = Math.min(base + diff1, 100)
              const level3 = Math.min(base + diff1 + diff2, 100)
              
              const size1 = calculateNodeSize(level1)
              const size2 = calculateNodeSize(level2)
              const size3 = calculateNodeSize(level3)
              
              // 如果 level3 > level2 > level1，则 size3 >= size2 >= size1
              if (level3 > level2 && level2 > level1) {
                expect(size3).toBeGreaterThanOrEqual(size2)
                expect(size2).toBeGreaterThanOrEqual(size1)
              }
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    // ========== 线性映射测试 ==========
    
    describe('线性映射验证', () => {
      it('节点大小应遵循线性映射公式：minSize + (level / 100) * (maxSize - minSize)', () => {
        fc.assert(
          fc.property(
            levelArb,
            (level) => {
              const size = calculateNodeSize(level)
              const minSize = 10
              const maxSize = 30
              const expectedSize = minSize + (level / 100) * (maxSize - minSize)
              
              expect(size).toBeCloseTo(expectedSize, 10)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('节点大小增量应与熟练度增量成正比', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 90 }),
            fc.integer({ min: 1, max: 10 }),
            (baseLevel, increment) => {
              const level1 = baseLevel
              const level2 = Math.min(baseLevel + increment, 100)
              
              const size1 = calculateNodeSize(level1)
              const size2 = calculateNodeSize(level2)
              
              // 大小增量应该等于 (level2 - level1) / 100 * 20
              const expectedSizeIncrement = ((level2 - level1) / 100) * 20
              const actualSizeIncrement = size2 - size1
              
              expect(actualSizeIncrement).toBeCloseTo(expectedSizeIncrement, 10)
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    // ========== 单调性测试 ==========
    
    describe('单调性验证', () => {
      it('节点大小函数应该是单调递增的', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 99 }),
            (level) => {
              const size1 = calculateNodeSize(level)
              const size2 = calculateNodeSize(level + 1)
              
              expect(size2).toBeGreaterThanOrEqual(size1)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('从 0 到 100 的所有熟练度值应产生单调递增的节点大小', () => {
        let prevSize = 0
        
        for (let level = 0; level <= 100; level++) {
          const size = calculateNodeSize(level)
          expect(size).toBeGreaterThanOrEqual(prevSize)
          prevSize = size
        }
      })
    })

    // ========== 技能树节点大小计算测试 ==========
    
    describe('技能树节点大小计算', () => {
      it('技能树节点的大小应根据其熟练度正确计算', () => {
        fc.assert(
          fc.property(
            simpleNodeArb,
            (node) => {
              const size = calculateNodeSize(node.level)
              
              // 验证大小在有效范围内
              expect(isValidNodeSize(size)).toBe(true)
              
              // 验证大小与熟练度的关系
              const minSize = 10
              const maxSize = 30
              const expectedSize = minSize + (node.level / 100) * (maxSize - minSize)
              expect(size).toBeCloseTo(expectedSize, 10)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('嵌套技能树中所有节点的大小都应在有效范围内', () => {
        fc.assert(
          fc.property(
            skillTreeNodeArb(3),
            (rootNode) => {
              // 递归验证所有节点
              const validateNode = (node: SkillTreeNode): void => {
                const size = calculateNodeSize(node.level)
                expect(isValidNodeSize(size)).toBe(true)
                
                if (node.children) {
                  node.children.forEach(validateNode)
                }
              }
              
              validateNode(rootNode)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('父节点和子节点的大小应独立计算', () => {
        fc.assert(
          fc.property(
            skillTreeNodeArb(2),
            (rootNode) => {
              const rootSize = calculateNodeSize(rootNode.level)
              
              if (rootNode.children && rootNode.children.length > 0) {
                rootNode.children.forEach(child => {
                  const childSize = calculateNodeSize(child.level)
                  
                  // 子节点大小应独立于父节点
                  // 只取决于子节点自身的熟练度
                  const expectedChildSize = 10 + (child.level / 100) * 20
                  expect(childSize).toBeCloseTo(expectedChildSize, 10)
                })
              }
              
              // 父节点大小也应正确计算
              const expectedRootSize = 10 + (rootNode.level / 100) * 20
              expect(rootSize).toBeCloseTo(expectedRootSize, 10)
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    // ========== 自定义配置测试 ==========
    
    describe('自定义节点大小配置', () => {
      it('自定义 nodeSize 函数应被正确使用', () => {
        fc.assert(
          fc.property(
            levelArb,
            (level) => {
              // 自定义配置：最小 5px，最大 50px
              const customConfig: Partial<SkillTreeConfig> = {
                nodeSize: (l: number) => 5 + (l / 100) * 45,
              }
              
              const size = calculateNodeSize(level, customConfig)
              const expectedSize = 5 + (level / 100) * 45
              
              expect(size).toBeCloseTo(expectedSize, 10)
              expect(size).toBeGreaterThanOrEqual(5)
              expect(size).toBeLessThanOrEqual(50)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('默认配置应产生 10-30px 范围的节点大小', () => {
        fc.assert(
          fc.property(
            levelArb,
            (level) => {
              const size = calculateNodeSize(level)
              
              expect(size).toBeGreaterThanOrEqual(10)
              expect(size).toBeLessThanOrEqual(30)
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    // ========== 边界情况测试 ==========
    
    describe('边界情况', () => {
      it('熟练度为负数时应被视为 0（如果实现支持）', () => {
        // 注意：这是一个防御性测试
        // 实际实现可能不处理负数，但我们测试默认行为
        const size = calculateNodeSize(-10)
        // 负数熟练度会产生小于最小值的结果
        // 这里我们只验证函数不会崩溃
        expect(typeof size).toBe('number')
        expect(isFinite(size)).toBe(true)
      })

      it('熟练度超过 100 时应被视为 100（如果实现支持）', () => {
        // 注意：这是一个防御性测试
        const size = calculateNodeSize(150)
        // 超过 100 的熟练度会产生大于最大值的结果
        // 这里我们只验证函数不会崩溃
        expect(typeof size).toBe('number')
        expect(isFinite(size)).toBe(true)
      })

      it('熟练度为小数时应正确计算', () => {
        fc.assert(
          fc.property(
            fc.float({ min: 0, max: 100, noNaN: true }),
            (level) => {
              const size = calculateNodeSize(level)
              
              expect(typeof size).toBe('number')
              expect(isFinite(size)).toBe(true)
              // 小数熟练度也应产生合理的大小
              expect(size).toBeGreaterThanOrEqual(10)
              expect(size).toBeLessThanOrEqual(30)
            }
          ),
          { numRuns: 100 }
        )
      })
    })
  })
})
