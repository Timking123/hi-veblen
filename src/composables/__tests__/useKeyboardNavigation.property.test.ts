/**
 * useKeyboardNavigation Composable 属性测试
 * 
 * Feature: website-enhancement-v2
 * 
 * 使用 fast-check 进行属性测试，验证键盘导航系统的核心属性：
 * - 属性 21: 键盘导航
 * 
 * 测试配置：
 * - 测试框架：Vitest + fast-check
 * - 最小迭代次数：每个属性测试至少运行 100 次
 * - 标签格式：Feature: website-enhancement-v2, Property 21: 键盘导航
 * 
 * **Validates: Requirements 8.4, 8.5**
 */

import { describe, it, expect, vi } from 'vitest'
import * as fc from 'fast-check'
import { ref } from 'vue'
import {
  isInputElement,
  getNumberKeyIndex,
  getArrowKeyIndex,
  isEscapeKey,
  processKeyboardEvent,
  createKeyboardNavigationHandler,
} from '../useKeyboardNavigation'

// ========== 自定义生成器 ==========

/**
 * 生成有效的数字键 (1-9)
 */
const numberKeyArb = fc.integer({ min: 1, max: 9 }).map(n => n.toString())

/**
 * 生成无效的数字键 (0 或 > 9)
 */
const invalidNumberKeyArb = fc.oneof(
  fc.constant('0'),
  fc.integer({ min: 10, max: 99 }).map(n => n.toString())
)

/**
 * 生成方向键
 */
const arrowKeyArb = fc.constantFrom('ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown')

/**
 * 生成向前导航的方向键 (ArrowRight, ArrowDown)
 */
const forwardArrowKeyArb = fc.constantFrom('ArrowRight', 'ArrowDown')

/**
 * 生成向后导航的方向键 (ArrowLeft, ArrowUp)
 */
const backwardArrowKeyArb = fc.constantFrom('ArrowLeft', 'ArrowUp')


/**
 * 生成非导航键（不是数字键、方向键或 Escape）
 */
const nonNavigationKeyArb = fc.constantFrom(
  'a', 'b', 'c', 'Enter', 'Tab', 'Space', 'Shift', 'Control', 'Alt'
)

/**
 * 生成路由路径
 */
const routePathArb = fc.stringMatching(/^\/[a-z0-9-]*$/).filter(s => s.length <= 20)

/**
 * 生成非空路由列表（1-9 个路由）
 */
const routesArb = fc.array(routePathArb, { minLength: 1, maxLength: 9 })
  .map(routes => [...new Set(routes)]) // 去重
  .filter(routes => routes.length >= 1)

/**
 * 创建模拟的输入元素
 */
const createMockInputElement = (): HTMLInputElement => {
  const input = document.createElement('input')
  return input
}

/**
 * 创建模拟的文本区域元素
 */
const createMockTextAreaElement = (): HTMLTextAreaElement => {
  const textarea = document.createElement('textarea')
  return textarea
}

/**
 * 创建模拟的可编辑元素
 */
const createMockContentEditableElement = (): HTMLDivElement => {
  const div = document.createElement('div')
  div.contentEditable = 'true'
  return div
}

/**
 * 创建模拟的普通元素
 */
const createMockNormalElement = (): HTMLDivElement => {
  const div = document.createElement('div')
  return div
}

// ========== 测试套件 ==========

describe('useKeyboardNavigation 属性测试', () => {
  /**
   * 属性 21：键盘导航
   * 
   * *对于任意* 路由列表和当前路由索引：
   * - 按数字键 N 应该导航到第 N 个路由（如果存在）
   * - 按方向键应该导航到相邻路由（循环）
   * - 按 Escape 应该触发返回操作
   * - 在输入框中的按键应该被忽略
   * 
   * **Validates: Requirements 8.4, 8.5**
   */
  describe('Feature: website-enhancement-v2, Property 21: 键盘导航', () => {
    
    // ========== 数字键导航测试 ==========
    describe('数字键导航', () => {
      /**
       * 测试 1: 按数字键 N (1-9) 应该导航到第 N 个路由（如果存在）
       */
      it('按数字键 N 应该导航到第 N 个路由（如果存在）', () => {
        fc.assert(
          fc.property(
            routesArb,
            numberKeyArb,
            (routes, key) => {
              const keyIndex = parseInt(key, 10) - 1
              const result = getNumberKeyIndex(key, routes.length)
              
              if (keyIndex < routes.length) {
                // 如果索引有效，应返回正确的索引
                expect(result).toBe(keyIndex)
              } else {
                // 如果索引超出范围，应返回 -1
                expect(result).toBe(-1)
              }
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * 测试 2: 无效的数字键应返回 -1
       */
      it('无效的数字键（0 或 > 9）应返回 -1', () => {
        fc.assert(
          fc.property(
            routesArb,
            invalidNumberKeyArb,
            (routes, key) => {
              const result = getNumberKeyIndex(key, routes.length)
              expect(result).toBe(-1)
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * 测试 3: 数字键索引应在有效范围内
       */
      it('数字键返回的索引应在 [0, routesLength-1] 范围内或为 -1', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: 20 }), // 路由列表长度
            numberKeyArb,
            (routesLength, key) => {
              const result = getNumberKeyIndex(key, routesLength)
              
              if (result !== -1) {
                expect(result).toBeGreaterThanOrEqual(0)
                expect(result).toBeLessThan(routesLength)
              }
            }
          ),
          { numRuns: 100 }
        )
      })
    })


    // ========== 方向键导航测试 ==========
    describe('方向键导航', () => {
      /**
       * 测试 4: 向前方向键应导航到下一个路由（循环）
       */
      it('向前方向键（ArrowRight/ArrowDown）应导航到下一个路由（循环）', () => {
        fc.assert(
          fc.property(
            routesArb,
            forwardArrowKeyArb,
            (routes, key) => {
              // 测试所有可能的当前索引
              for (let currentIndex = 0; currentIndex < routes.length; currentIndex++) {
                const result = getArrowKeyIndex(key, currentIndex, routes.length)
                const expectedIndex = (currentIndex + 1) % routes.length
                expect(result).toBe(expectedIndex)
              }
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * 测试 5: 向后方向键应导航到上一个路由（循环）
       */
      it('向后方向键（ArrowLeft/ArrowUp）应导航到上一个路由（循环）', () => {
        fc.assert(
          fc.property(
            routesArb,
            backwardArrowKeyArb,
            (routes, key) => {
              // 测试所有可能的当前索引
              for (let currentIndex = 0; currentIndex < routes.length; currentIndex++) {
                const result = getArrowKeyIndex(key, currentIndex, routes.length)
                const expectedIndex = (currentIndex - 1 + routes.length) % routes.length
                expect(result).toBe(expectedIndex)
              }
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * 测试 6: 方向键导航应正确循环
       */
      it('方向键导航应正确循环（从末尾到开头，从开头到末尾）', () => {
        fc.assert(
          fc.property(
            routesArb,
            (routes) => {
              const lastIndex = routes.length - 1
              
              // 从末尾向前应循环到开头
              const forwardFromLast = getArrowKeyIndex('ArrowRight', lastIndex, routes.length)
              expect(forwardFromLast).toBe(0)
              
              // 从开头向后应循环到末尾
              const backwardFromFirst = getArrowKeyIndex('ArrowLeft', 0, routes.length)
              expect(backwardFromFirst).toBe(lastIndex)
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * 测试 7: 方向键返回的索引应始终有效
       */
      it('方向键返回的索引应始终在 [0, routesLength-1] 范围内', () => {
        fc.assert(
          fc.property(
            routesArb,
            arrowKeyArb,
            fc.integer({ min: -10, max: 100 }), // 包括无效的当前索引
            (routes, key, currentIndex) => {
              const result = getArrowKeyIndex(key, currentIndex, routes.length)
              
              if (result !== -1) {
                expect(result).toBeGreaterThanOrEqual(0)
                expect(result).toBeLessThan(routes.length)
              }
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * 测试 8: 空路由列表应返回 -1
       */
      it('空路由列表时方向键应返回 -1', () => {
        fc.assert(
          fc.property(
            arrowKeyArb,
            fc.integer({ min: 0, max: 10 }),
            (key, currentIndex) => {
              const result = getArrowKeyIndex(key, currentIndex, 0)
              expect(result).toBe(-1)
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * 测试 9: 非方向键应返回 -1
       */
      it('非方向键应返回 -1', () => {
        fc.assert(
          fc.property(
            routesArb,
            nonNavigationKeyArb,
            fc.integer({ min: 0, max: 10 }),
            (routes, key, currentIndex) => {
              const result = getArrowKeyIndex(key, currentIndex, routes.length)
              expect(result).toBe(-1)
            }
          ),
          { numRuns: 100 }
        )
      })
    })


    // ========== Escape 键测试 ==========
    describe('Escape 键', () => {
      /**
       * 测试 10: Escape 键应被正确识别
       */
      it('Escape 键应被正确识别', () => {
        expect(isEscapeKey('Escape')).toBe(true)
      })

      /**
       * 测试 11: 非 Escape 键应返回 false
       */
      it('非 Escape 键应返回 false', () => {
        fc.assert(
          fc.property(
            fc.constantFrom(
              'Enter', 'Tab', 'Space', 'a', 'b', '1', '2',
              'ArrowLeft', 'ArrowRight', 'Shift', 'Control'
            ),
            (key) => {
              expect(isEscapeKey(key)).toBe(false)
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    // ========== 输入框忽略测试 ==========
    describe('输入框忽略', () => {
      /**
       * 测试 12: 输入框元素应被正确识别
       */
      it('HTMLInputElement 应被识别为输入元素', () => {
        const input = createMockInputElement()
        expect(isInputElement(input)).toBe(true)
      })

      /**
       * 测试 13: 文本区域元素应被正确识别
       */
      it('HTMLTextAreaElement 应被识别为输入元素', () => {
        const textarea = createMockTextAreaElement()
        expect(isInputElement(textarea)).toBe(true)
      })

      /**
       * 测试 14: 可编辑元素应被正确识别
       */
      it('contentEditable 元素应被识别为输入元素', () => {
        const editable = createMockContentEditableElement()
        expect(isInputElement(editable)).toBe(true)
      })

      /**
       * 测试 15: 普通元素不应被识别为输入元素
       */
      it('普通元素不应被识别为输入元素', () => {
        const div = createMockNormalElement()
        expect(isInputElement(div)).toBe(false)
      })

      /**
       * 测试 16: null 目标不应被识别为输入元素
       */
      it('null 目标不应被识别为输入元素', () => {
        expect(isInputElement(null)).toBe(false)
      })
    })


    // ========== processKeyboardEvent 集成测试 ==========
    describe('processKeyboardEvent 集成测试', () => {
      /**
       * 测试 17: 在输入框中的按键应被忽略
       */
      it('在输入框中的按键应被忽略', () => {
        fc.assert(
          fc.property(
            routesArb,
            fc.oneof(numberKeyArb, arrowKeyArb, fc.constant('Escape')),
            (routes, key) => {
              const input = createMockInputElement()
              const result = processKeyboardEvent(
                key,
                input,
                routes,
                routes[0] || '/',
                true,
                true
              )
              
              expect(result.handled).toBe(false)
              expect(result.action).toBe('none')
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * 测试 18: 数字键应正确处理
       */
      it('数字键应正确导航到对应路由', () => {
        fc.assert(
          fc.property(
            routesArb,
            numberKeyArb,
            (routes, key) => {
              const keyIndex = parseInt(key, 10) - 1
              const result = processKeyboardEvent(
                key,
                null,
                routes,
                routes[0] || '/',
                true,
                true
              )
              
              if (keyIndex < routes.length) {
                expect(result.handled).toBe(true)
                expect(result.action).toBe('number')
                expect(result.navigatedTo).toBe(routes[keyIndex])
              } else {
                expect(result.handled).toBe(false)
              }
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * 测试 19: 方向键应正确处理
       */
      it('方向键应正确导航到相邻路由', () => {
        fc.assert(
          fc.property(
            routesArb,
            (routes) => {
              // 使用第一个路由作为当前路由
              const currentPath = routes[0]
              
              for (const key of ['ArrowRight', 'ArrowDown']) {
                const result = processKeyboardEvent(
                  key,
                  null,
                  routes,
                  currentPath,
                  true,
                  true
                )
                
                expect(result.handled).toBe(true)
                expect(result.action).toBe('arrow')
                // 从索引 0 向前应该到索引 1（如果只有一个路由则循环到 0）
                const expectedIndex = routes.length > 1 ? 1 : 0
                expect(result.navigatedTo).toBe(routes[expectedIndex])
              }
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * 测试 20: Escape 键应触发返回操作
       */
      it('Escape 键应触发返回操作', () => {
        fc.assert(
          fc.property(
            routesArb,
            (routes) => {
              const result = processKeyboardEvent(
                'Escape',
                null,
                routes,
                routes[0] || '/',
                true,
                true
              )
              
              expect(result.handled).toBe(true)
              expect(result.action).toBe('escape')
              expect(result.navigatedTo).toBeUndefined()
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * 测试 21: 禁用数字键时不应处理数字键
       */
      it('禁用数字键时不应处理数字键', () => {
        fc.assert(
          fc.property(
            routesArb,
            numberKeyArb,
            (routes, key) => {
              const result = processKeyboardEvent(
                key,
                null,
                routes,
                routes[0] || '/',
                false, // 禁用数字键
                true
              )
              
              // 数字键不应被处理
              expect(result.action).not.toBe('number')
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * 测试 22: 禁用方向键时不应处理方向键
       */
      it('禁用方向键时不应处理方向键', () => {
        fc.assert(
          fc.property(
            routesArb,
            arrowKeyArb,
            (routes, key) => {
              const result = processKeyboardEvent(
                key,
                null,
                routes,
                routes[0] || '/',
                true,
                false // 禁用方向键
              )
              
              // 方向键不应被处理
              expect(result.action).not.toBe('arrow')
            }
          ),
          { numRuns: 100 }
        )
      })
    })


    // ========== createKeyboardNavigationHandler 测试 ==========
    describe('createKeyboardNavigationHandler 集成测试', () => {
      /**
       * 创建模拟路由器
       */
      const createMockRouter = (currentPath: string) => {
        const pushHistory: string[] = []
        let backCalled = false
        
        return {
          router: {
            push: vi.fn((path: string) => {
              pushHistory.push(path)
              return Promise.resolve()
            }),
            back: vi.fn(() => {
              backCalled = true
            }),
            currentRoute: ref({ path: currentPath })
          } as any,
          getPushHistory: () => pushHistory,
          wasBackCalled: () => backCalled,
        }
      }

      /**
       * 测试 23: 数字键应调用 router.push
       */
      it('数字键应调用 router.push 导航到正确路由', () => {
        fc.assert(
          fc.property(
            routesArb,
            numberKeyArb,
            (routes, key) => {
              const keyIndex = parseInt(key, 10) - 1
              const { router, getPushHistory } = createMockRouter(routes[0] || '/')
              
              const handler = createKeyboardNavigationHandler(
                { routes },
                router
              )
              
              handler(key, null)
              
              if (keyIndex < routes.length) {
                expect(getPushHistory()).toContain(routes[keyIndex])
              } else {
                expect(getPushHistory()).toHaveLength(0)
              }
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * 测试 24: 方向键应调用 router.push
       */
      it('方向键应调用 router.push 导航到相邻路由', () => {
        fc.assert(
          fc.property(
            routesArb,
            (routes) => {
              const currentPath = routes[0]
              const { router, getPushHistory } = createMockRouter(currentPath)
              
              const handler = createKeyboardNavigationHandler(
                { routes },
                router
              )
              
              handler('ArrowRight', null)
              
              const expectedIndex = routes.length > 1 ? 1 : 0
              expect(getPushHistory()).toContain(routes[expectedIndex])
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * 测试 25: Escape 键应调用 router.back
       */
      it('Escape 键应调用 router.back', () => {
        fc.assert(
          fc.property(
            routesArb,
            (routes) => {
              const { router, wasBackCalled } = createMockRouter(routes[0] || '/')
              
              const handler = createKeyboardNavigationHandler(
                { routes },
                router
              )
              
              handler('Escape', null)
              
              expect(wasBackCalled()).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * 测试 26: onNavigate 回调应被正确调用
       */
      it('导航时 onNavigate 回调应被正确调用', () => {
        fc.assert(
          fc.property(
            routesArb,
            numberKeyArb,
            (routes, key) => {
              const keyIndex = parseInt(key, 10) - 1
              const navigatedRoutes: string[] = []
              const { router } = createMockRouter(routes[0] || '/')
              
              const handler = createKeyboardNavigationHandler(
                { 
                  routes,
                  onNavigate: (route) => navigatedRoutes.push(route)
                },
                router
              )
              
              handler(key, null)
              
              if (keyIndex < routes.length) {
                expect(navigatedRoutes).toContain(routes[keyIndex])
              } else {
                expect(navigatedRoutes).toHaveLength(0)
              }
            }
          ),
          { numRuns: 100 }
        )
      })
    })
  })


  // ========== 组合属性测试 ==========
  describe('组合属性测试', () => {
    /**
     * 测试 27: 方向键导航的往返属性
     * 向前再向后应该回到原位置
     */
    it('方向键导航的往返属性：向前再向后应回到原位置', () => {
      fc.assert(
        fc.property(
          routesArb,
          (routes) => {
            for (let startIndex = 0; startIndex < routes.length; startIndex++) {
              // 向前一步
              const afterForward = getArrowKeyIndex('ArrowRight', startIndex, routes.length)
              // 再向后一步
              const afterBackward = getArrowKeyIndex('ArrowLeft', afterForward, routes.length)
              
              // 应该回到原位置
              expect(afterBackward).toBe(startIndex)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 测试 28: 数字键导航的幂等性
     * 多次按同一数字键应导航到同一路由
     */
    it('数字键导航的幂等性：多次按同一数字键应导航到同一路由', () => {
      fc.assert(
        fc.property(
          routesArb,
          numberKeyArb,
          fc.integer({ min: 1, max: 5 }),
          (routes, key, times) => {
            const results: number[] = []
            
            for (let i = 0; i < times; i++) {
              results.push(getNumberKeyIndex(key, routes.length))
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
     * 测试 29: 完整循环属性
     * 连续按 N 次向前方向键应回到原位置（N = 路由数量）
     */
    it('完整循环属性：连续按 N 次向前方向键应回到原位置', () => {
      fc.assert(
        fc.property(
          routesArb,
          (routes) => {
            let currentIndex = 0
            
            // 按 routes.length 次向前
            for (let i = 0; i < routes.length; i++) {
              currentIndex = getArrowKeyIndex('ArrowRight', currentIndex, routes.length)
            }
            
            // 应该回到起始位置
            expect(currentIndex).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 测试 30: 数字键和方向键的一致性
     * 按数字键 1 应该和从任意位置导航到索引 0 的结果一致
     */
    it('数字键 1 应始终导航到第一个路由', () => {
      fc.assert(
        fc.property(
          routesArb,
          (routes) => {
            const result = processKeyboardEvent(
              '1',
              null,
              routes,
              routes[routes.length - 1] || '/', // 从最后一个路由开始
              true,
              true
            )
            
            expect(result.handled).toBe(true)
            expect(result.navigatedTo).toBe(routes[0])
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 测试 31: 所有有效数字键都应该有对应的导航结果
     */
    it('对于 N 个路由，数字键 1 到 N 都应该有效', () => {
      fc.assert(
        fc.property(
          routesArb,
          (routes) => {
            for (let i = 1; i <= routes.length && i <= 9; i++) {
              const result = getNumberKeyIndex(i.toString(), routes.length)
              expect(result).toBe(i - 1)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 测试 32: 当前路由不在列表中时方向键应从索引 0 开始
     */
    it('当前路由不在列表中时方向键应从索引 0 开始导航', () => {
      fc.assert(
        fc.property(
          routesArb,
          (routes) => {
            const result = processKeyboardEvent(
              'ArrowRight',
              null,
              routes,
              '/non-existent-route', // 不在列表中的路由
              true,
              true
            )
            
            // 应该从索引 0 开始，向前到索引 1（或循环到 0）
            const expectedIndex = routes.length > 1 ? 1 : 0
            expect(result.navigatedTo).toBe(routes[expectedIndex])
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
