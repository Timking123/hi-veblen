import { describe, it, expect } from 'vitest'
import { createRouter, createMemoryHistory, Router } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import * as fc from 'fast-check'
import { useAppStore } from '@/stores/app'

/**
 * Feature: vue3-portfolio-website, Property 3: 路由历史管理正确性
 * 
 * Property: 对于任何路由导航序列，使用浏览器后退按钮应当按相反顺序返回之前访问的路由
 * 
 * Validates: Requirements 6.4
 */

// Define valid menu paths
const validPaths = ['/', '/about', '/education', '/experience', '/skills', '/contact']

// Create a simple component for testing routes
const TestComponent = {
  template: '<div>Test Page</div>',
}

// Helper function to create router with all routes and history tracking
function createTestRouter(): Router {
  const routes = validPaths.map((path) => ({
    path,
    name: path === '/' ? 'Home' : path.substring(1).charAt(0).toUpperCase() + path.substring(2),
    component: TestComponent,
  }))

  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  })

  // Add the same beforeEach guard as in the actual router
  router.beforeEach((to, from) => {
    const appStore = useAppStore()
    
    // Skip history management for initial navigation (when from.path is empty or undefined)
    if (!from.name && !from.path) {
      appStore.setCurrentRoute(to.path)
      appStore.setRouteDirection('forward')
      return
    }
    
    // 获取当前历史记录
    const history = appStore.getRouteHistory()
    
    // 检查是否是后退操作
    const isBackward = history.length > 0 && history[history.length - 1] === to.path
    
    if (isBackward) {
      // 后退：从历史记录中移除
      appStore.popRouteHistory()
      appStore.setRouteDirection('backward')
    } else {
      // 前进：添加到历史记录
      if (from.path && from.path !== to.path) {
        appStore.pushRouteHistory(from.path)
      }
      appStore.setRouteDirection('forward')
    }
    
    appStore.setCurrentRoute(to.path)
  })

  return router
}

describe('Router Property Tests', () => {
  describe('Property 3: Route History Management Correctness', () => {
    it('should navigate backward through history in reverse order', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a sequence of unique routes (at least 2 routes, all different)
          fc
            .array(fc.constantFrom(...validPaths), { minLength: 2, maxLength: 5 })
            .map((paths) => {
              // Ensure we start from home and have unique paths (no duplicates)
              const uniquePaths = ['/']
              for (const path of paths) {
                // Only add if it's different from ALL previous paths
                if (!uniquePaths.includes(path)) {
                  uniquePaths.push(path)
                }
              }
              return uniquePaths
            })
            .filter((paths) => paths.length >= 2),
          async (routeSequence) => {
            // Setup - create fresh Pinia instance for this iteration
            setActivePinia(createPinia())
            const router = createTestRouter()
            const appStore = useAppStore()
            
            // Start at the first route
            await router.push(routeSequence[0])
            await router.isReady()

            // Navigate forward through the sequence
            for (let i = 1; i < routeSequence.length; i++) {
              await router.push(routeSequence[i])
              await router.isReady()
            }

            // Property: History should contain all previous routes
            const historyAfterForward = appStore.getRouteHistory()
            expect(historyAfterForward.length).toBe(routeSequence.length - 1)

            // Now navigate backward by going to routes in history
            // The history should contain all routes except the last one (current)
            const expectedHistory = routeSequence.slice(0, -1).reverse()

            for (let i = 0; i < expectedHistory.length; i++) {
              const expectedRoute = expectedHistory[i]
              
              // Get current history before going back
              const historyBeforeBack = appStore.getRouteHistory()
              
              // Property: History should not be empty when we can go back
              if (i < expectedHistory.length) {
                expect(historyBeforeBack.length).toBeGreaterThan(0)
              }
              
              // Get the last route in history (where we should go)
              const lastInHistory = historyBeforeBack[historyBeforeBack.length - 1]
              
              // Navigate back by going to the last item in history
              await router.push(lastInHistory)
              await router.isReady()
              
              // Property: After going back, current route should match expected route
              expect(router.currentRoute.value.path).toBe(expectedRoute)
              
              // Property: Route direction should be backward
              expect(appStore.routeDirection).toBe('backward')
              
              // Property: History should be one shorter
              const historyAfterBack = appStore.getRouteHistory()
              expect(historyAfterBack.length).toBe(historyBeforeBack.length - 1)
            }

            // Property: After going back through all history, we should be at the start
            expect(router.currentRoute.value.path).toBe(routeSequence[0])
            
            // Property: History should be empty after going back to the start
            expect(appStore.getRouteHistory().length).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain correct history stack during forward navigation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .array(fc.constantFrom(...validPaths), { minLength: 2, maxLength: 4 })
            .map((paths) => {
              // Ensure all paths are unique (no duplicates)
              const uniquePaths = ['/']
              for (const path of paths) {
                if (!uniquePaths.includes(path)) {
                  uniquePaths.push(path)
                }
              }
              return uniquePaths
            })
            .filter((paths) => paths.length >= 2),
          async (routeSequence) => {
            // Setup - create fresh Pinia instance for this iteration
            setActivePinia(createPinia())
            const router = createTestRouter()
            const appStore = useAppStore()
            
            await router.push(routeSequence[0])
            await router.isReady()

            // Navigate forward and check history at each step
            for (let i = 1; i < routeSequence.length; i++) {
              const previousPath = routeSequence[i - 1]
              
              await router.push(routeSequence[i])
              await router.isReady()

              // Property: After forward navigation, direction should be forward
              expect(appStore.routeDirection).toBe('forward')
              
              // Property: History should contain all previous routes
              const history = appStore.getRouteHistory()
              expect(history.length).toBe(i)
              
              // Property: The last item in history should be the previous route
              expect(history[history.length - 1]).toBe(previousPath)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle mixed forward and backward navigation correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validPaths).filter((path) => path !== '/'),
          fc.constantFrom(...validPaths).filter((path) => path !== '/'),
          async (path1, path2) => {
            // Skip if paths are the same
            if (path1 === path2) {
              return true
            }
            
            // Setup - create fresh Pinia instance for this iteration
            setActivePinia(createPinia())
            const router = createTestRouter()
            const appStore = useAppStore()
            
            // Start at home
            await router.push('/')
            await router.isReady()

            // Go to path1
            await router.push(path1)
            await router.isReady()
            
            // Property: History should contain home
            let history = appStore.getRouteHistory()
            expect(history.length).toBe(1)
            expect(history[0]).toBe('/')
            expect(appStore.routeDirection).toBe('forward')

            // Go to path2
            await router.push(path2)
            await router.isReady()
            
            // Property: History should contain path1
            history = appStore.getRouteHistory()
            expect(history).toContain(path1)
            expect(appStore.routeDirection).toBe('forward')

            // Go back to path1
            const lastInHistory = history[history.length - 1]
            await router.push(lastInHistory)
            await router.isReady()
            
            // Property: Should be back at path1
            expect(router.currentRoute.value.path).toBe(path1)
            expect(appStore.routeDirection).toBe('backward')
            
            // Property: History should have been popped
            history = appStore.getRouteHistory()
            expect(history).not.toContain(path1)

            // Go forward to a new path (path2 again or different)
            await router.push(path2)
            await router.isReady()
            
            // Property: Direction should be forward again
            expect(appStore.routeDirection).toBe('forward')
            
            // Property: History should contain path1 again
            history = appStore.getRouteHistory()
            expect(history).toContain(path1)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly identify backward navigation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .array(fc.constantFrom(...validPaths), { minLength: 3, maxLength: 5 })
            .map((paths) => {
              // Ensure all paths are unique (no duplicates)
              const uniquePaths = ['/']
              for (const path of paths) {
                if (!uniquePaths.includes(path)) {
                  uniquePaths.push(path)
                }
              }
              return uniquePaths
            })
            .filter((paths) => paths.length >= 3),
          async (routeSequence) => {
            // Setup - create fresh Pinia instance for this iteration
            setActivePinia(createPinia())
            const router = createTestRouter()
            const appStore = useAppStore()
            
            // Navigate forward through sequence
            await router.push(routeSequence[0])
            await router.isReady()

            for (let i = 1; i < routeSequence.length; i++) {
              await router.push(routeSequence[i])
              await router.isReady()
            }

            // Get history
            const history = appStore.getRouteHistory()
            
            // Property: History should not be empty
            expect(history.length).toBeGreaterThan(0)
            
            // Navigate to the last route in history (backward navigation)
            const targetRoute = history[history.length - 1]
            await router.push(targetRoute)
            await router.isReady()
            
            // Property: This should be detected as backward navigation
            expect(appStore.routeDirection).toBe('backward')
            
            // Property: The target route should have been removed from history
            const newHistory = appStore.getRouteHistory()
            expect(newHistory.length).toBe(history.length - 1)
            if (newHistory.length > 0) {
              expect(newHistory[newHistory.length - 1]).not.toBe(targetRoute)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain history integrity across multiple navigation cycles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.constantFrom(...validPaths).filter((path) => path !== '/'),
            { minLength: 3, maxLength: 4 }
          ),
          async (paths) => {
            // Ensure paths are unique
            const uniquePaths: string[] = []
            for (const path of paths) {
              if (!uniquePaths.includes(path)) {
                uniquePaths.push(path)
              }
            }
            
            // Need at least 3 unique paths for this test
            if (uniquePaths.length < 3) {
              return true
            }
            
            // Setup - create fresh Pinia instance for this iteration
            setActivePinia(createPinia())
            const router = createTestRouter()
            const appStore = useAppStore()
            
            await router.push('/')
            await router.isReady()

            // Navigate forward through first two paths
            await router.push(uniquePaths[0])
            await router.isReady()
            
            await router.push(uniquePaths[1])
            await router.isReady()

            const historyAfterForward = appStore.getRouteHistory()
            const historyLength = historyAfterForward.length

            // Navigate backward one step
            if (historyLength > 0) {
              const backTarget = historyAfterForward[historyLength - 1]
              await router.push(backTarget)
              await router.isReady()
              
              // Property: History should be one shorter
              expect(appStore.getRouteHistory().length).toBe(historyLength - 1)
              
              // Navigate forward again to a NEW route (not in history)
              const newPath = uniquePaths[2] // Use third unique path
              await router.push(newPath)
              await router.isReady()
              
              // Property: History should grow again
              const finalHistory = appStore.getRouteHistory()
              expect(finalHistory.length).toBe(historyLength)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
