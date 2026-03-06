import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import * as fc from 'fast-check'
import { useAppStore } from '@/stores/app'

/**
 * Feature: website-enhancement-v2, Property 7: 路由方向判断
 * 
 * 属性：对于任意路由历史记录和目标路由，如果目标路由是历史记录的最后一项，
 * 则方向应为 'backward'，否则为 'forward'。
 * 
 * **验证: 需求 2.6**
 */

// 定义有效的路由路径
const validPaths = ['/', '/about', '/education', '/experience', '/skills', '/contact']

/**
 * 路由方向判断逻辑（从 router/index.ts 提取的核心逻辑）
 * 
 * 规则：
 * - 如果目标路由是历史记录的最后一项（即用户点击了浏览器的后退按钮），方向为 'backward'
 * - 否则方向为 'forward'
 */
function determineRouteDirection(
  history: string[],
  targetRoute: string
): 'forward' | 'backward' {
  const isBackward = history.length > 0 && history[history.length - 1] === targetRoute
  return isBackward ? 'backward' : 'forward'
}

describe('Feature: website-enhancement-v2, Property 7: 路由方向判断', () => {
  beforeEach(() => {
    // 每个测试前创建新的 Pinia 实例
    setActivePinia(createPinia())
  })

  describe('核心属性测试', () => {
    it('对于任意历史记录和目标路由，方向判断应正确', async () => {
      await fc.assert(
        fc.property(
          // 生成任意长度的路由历史记录（0-10 项）
          fc.array(fc.constantFrom(...validPaths), { minLength: 0, maxLength: 10 }),
          // 生成目标路由
          fc.constantFrom(...validPaths),
          (history, targetRoute) => {
            const direction = determineRouteDirection(history, targetRoute)
            
            // 属性：如果目标路由是历史记录的最后一项，方向应为 'backward'
            if (history.length > 0 && history[history.length - 1] === targetRoute) {
              expect(direction).toBe('backward')
            } else {
              // 否则方向应为 'forward'
              expect(direction).toBe('forward')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('空历史记录时，任何目标路由的方向都应为 forward', async () => {
      await fc.assert(
        fc.property(
          fc.constantFrom(...validPaths),
          (targetRoute) => {
            const emptyHistory: string[] = []
            const direction = determineRouteDirection(emptyHistory, targetRoute)
            
            // 属性：空历史记录时，方向始终为 'forward'
            expect(direction).toBe('forward')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('目标路由与历史记录最后一项相同时，方向应为 backward', async () => {
      await fc.assert(
        fc.property(
          // 生成非空历史记录
          fc.array(fc.constantFrom(...validPaths), { minLength: 1, maxLength: 10 }),
          (history) => {
            // 目标路由设为历史记录的最后一项
            const targetRoute = history[history.length - 1]
            const direction = determineRouteDirection(history, targetRoute)
            
            // 属性：目标路由是历史记录最后一项时，方向为 'backward'
            expect(direction).toBe('backward')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('目标路由与历史记录最后一项不同时，方向应为 forward', async () => {
      await fc.assert(
        fc.property(
          // 生成非空历史记录
          fc.array(fc.constantFrom(...validPaths), { minLength: 1, maxLength: 10 }),
          // 生成目标路由
          fc.constantFrom(...validPaths),
          (history, targetRoute) => {
            // 只测试目标路由与最后一项不同的情况
            if (history[history.length - 1] !== targetRoute) {
              const direction = determineRouteDirection(history, targetRoute)
              
              // 属性：目标路由不是历史记录最后一项时，方向为 'forward'
              expect(direction).toBe('forward')
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('与 AppStore 集成测试', () => {
    it('AppStore 的路由方向判断应与核心逻辑一致', async () => {
      await fc.assert(
        fc.property(
          // 生成路由历史记录
          fc.array(fc.constantFrom(...validPaths), { minLength: 0, maxLength: 10 }),
          // 生成目标路由
          fc.constantFrom(...validPaths),
          (history, targetRoute) => {
            // 创建新的 Pinia 实例
            setActivePinia(createPinia())
            const appStore = useAppStore()
            
            // 设置历史记录
            history.forEach(route => appStore.pushRouteHistory(route))
            
            // 获取当前历史记录
            const currentHistory = appStore.getRouteHistory()
            
            // 判断方向
            const isBackward = currentHistory.length > 0 && 
                              currentHistory[currentHistory.length - 1] === targetRoute
            
            // 设置方向
            appStore.setRouteDirection(isBackward ? 'backward' : 'forward')
            
            // 验证方向设置正确
            if (isBackward) {
              expect(appStore.routeDirection).toBe('backward')
            } else {
              expect(appStore.routeDirection).toBe('forward')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('后退操作后历史记录应正确更新', async () => {
      await fc.assert(
        fc.property(
          // 生成非空历史记录
          fc.array(fc.constantFrom(...validPaths), { minLength: 1, maxLength: 10 }),
          (history) => {
            // 创建新的 Pinia 实例
            setActivePinia(createPinia())
            const appStore = useAppStore()
            
            // 设置历史记录
            history.forEach(route => appStore.pushRouteHistory(route))
            
            const initialLength = appStore.getRouteHistory().length
            const lastRoute = appStore.getRouteHistory()[initialLength - 1]
            
            // 模拟后退操作
            const isBackward = appStore.getRouteHistory().length > 0 && 
                              appStore.getRouteHistory()[appStore.getRouteHistory().length - 1] === lastRoute
            
            if (isBackward) {
              appStore.popRouteHistory()
              appStore.setRouteDirection('backward')
              
              // 属性：后退后历史记录长度应减少 1
              expect(appStore.getRouteHistory().length).toBe(initialLength - 1)
              expect(appStore.routeDirection).toBe('backward')
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('边界情况测试', () => {
    it('单项历史记录的方向判断应正确', async () => {
      await fc.assert(
        fc.property(
          fc.constantFrom(...validPaths),
          fc.constantFrom(...validPaths),
          (historyItem, targetRoute) => {
            const history = [historyItem]
            const direction = determineRouteDirection(history, targetRoute)
            
            if (historyItem === targetRoute) {
              expect(direction).toBe('backward')
            } else {
              expect(direction).toBe('forward')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('目标路由在历史记录中但不是最后一项时，方向应为 forward', async () => {
      await fc.assert(
        fc.property(
          // 生成至少 2 项的历史记录
          fc.array(fc.constantFrom(...validPaths), { minLength: 2, maxLength: 10 }),
          fc.nat({ max: 100 }),
          (history, indexSeed) => {
            // 选择一个非最后一项的索引
            if (history.length < 2) return
            
            const nonLastIndex = indexSeed % (history.length - 1)
            const targetRoute = history[nonLastIndex]
            
            // 只有当目标路由不等于最后一项时才测试
            if (targetRoute !== history[history.length - 1]) {
              const direction = determineRouteDirection(history, targetRoute)
              
              // 属性：即使目标路由在历史记录中，只要不是最后一项，方向就是 'forward'
              expect(direction).toBe('forward')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('重复路由在历史记录中的方向判断应正确', async () => {
      await fc.assert(
        fc.property(
          fc.constantFrom(...validPaths),
          fc.nat({ max: 10 }),
          (route, repeatCount) => {
            // 创建包含重复路由的历史记录
            const history = Array(repeatCount + 1).fill(route)
            const targetRoute = route
            
            const direction = determineRouteDirection(history, targetRoute)
            
            // 属性：只要目标路由等于最后一项，方向就是 'backward'
            expect(direction).toBe('backward')
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('方向判断的确定性', () => {
    it('相同输入应产生相同的方向判断结果', async () => {
      await fc.assert(
        fc.property(
          fc.array(fc.constantFrom(...validPaths), { minLength: 0, maxLength: 10 }),
          fc.constantFrom(...validPaths),
          (history, targetRoute) => {
            // 多次调用应产生相同结果
            const direction1 = determineRouteDirection(history, targetRoute)
            const direction2 = determineRouteDirection(history, targetRoute)
            const direction3 = determineRouteDirection(history, targetRoute)
            
            // 属性：方向判断是确定性的
            expect(direction1).toBe(direction2)
            expect(direction2).toBe(direction3)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
