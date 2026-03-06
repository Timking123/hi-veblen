import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory, Router } from 'vue-router'
import * as fc from 'fast-check'
import Navigation from '../Navigation.vue'

/**
 * Feature: vue3-portfolio-website, Property 2: 导航路由一致性
 * 
 * Property: 对于任何导航菜单项，点击后当前路由路径应当与该菜单项的目标路径匹配，
 * 且该菜单项应当处于激活状态
 * 
 * Validates: Requirements 1.5, 6.2, 6.5
 */

// Define valid menu paths
const validPaths = ['/', '/about', '/education', '/experience', '/skills', '/contact']

// Create a simple component for testing routes
const TestComponent = {
  template: '<div>Test Page</div>',
}

// Helper function to create router with all routes
function createTestRouter(): Router {
  const routes = validPaths.map((path) => ({
    path,
    name: path === '/' ? 'Home' : path.substring(1).charAt(0).toUpperCase() + path.substring(2),
    component: TestComponent,
  }))

  return createRouter({
    history: createMemoryHistory(),
    routes,
  })
}

describe('Navigation Property Tests', () => {
  describe('Property 2: Navigation Route Consistency', () => {
    it('should maintain route consistency for any valid menu item click', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary valid path from our menu
          fc.constantFrom(...validPaths),
          async (targetPath) => {
            // Setup
            const router = createTestRouter()
            await router.push('/')
            await router.isReady()

            const wrapper = mount(Navigation, {
              global: {
                plugins: [router],
              },
            })

            // Navigate to the target path (simulating menu click behavior)
            await router.push(targetPath)
            await router.isReady()
            await wrapper.vm.$nextTick()

            // Property: After navigation, current route should match target path
            expect(router.currentRoute.value.path).toBe(targetPath)

            // Find the link for the target path
            const links = wrapper.findAll('.navigation__link')
            const targetLink = links.find((link) => {
              const to = link.attributes('href')
              return to === targetPath
            })

            // Ensure the link exists
            expect(targetLink).toBeDefined()

            if (targetLink) {
              // Property: The menu item for current route should be active
              const activeClass = 'navigation__link--active'
              expect(targetLink.classes()).toContain(activeClass)

              // Property: Only one menu item should be active at a time
              const activeLinks = wrapper.findAll(`.${activeClass}`)
              expect(activeLinks.length).toBe(1)
            }

            wrapper.unmount()
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design doc
      )
    })

    it('should correctly identify active route on initial render', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validPaths),
          async (initialPath) => {
            // Setup router with initial path
            const router = createTestRouter()
            await router.push(initialPath)
            await router.isReady()

            const wrapper = mount(Navigation, {
              global: {
                plugins: [router],
              },
            })

            // Property: The menu item matching current route should be active
            const links = wrapper.findAll('.navigation__link')
            const currentLink = links.find((link) => {
              const to = link.attributes('href')
              return to === initialPath
            })

            expect(currentLink).toBeDefined()
            if (currentLink) {
              expect(currentLink.classes()).toContain('navigation__link--active')
            }

            wrapper.unmount()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should update active state when route changes programmatically', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate two different paths
          fc
            .tuple(fc.constantFrom(...validPaths), fc.constantFrom(...validPaths))
            .filter(([path1, path2]) => path1 !== path2),
          async ([initialPath, targetPath]) => {
            // Setup
            const router = createTestRouter()
            await router.push(initialPath)
            await router.isReady()

            const wrapper = mount(Navigation, {
              global: {
                plugins: [router],
              },
            })

            // Navigate programmatically
            await router.push(targetPath)
            await router.isReady()
            await wrapper.vm.$nextTick()

            // Property: After navigation, the new route's menu item should be active
            const links = wrapper.findAll('.navigation__link')
            const targetLink = links.find((link) => {
              const to = link.attributes('href')
              return to === targetPath
            })

            expect(targetLink).toBeDefined()
            if (targetLink) {
              expect(targetLink.classes()).toContain('navigation__link--active')
            }

            // Property: The old route's menu item should not be active
            const oldLink = links.find((link) => {
              const to = link.attributes('href')
              return to === initialPath
            })

            if (oldLink) {
              expect(oldLink.classes()).not.toContain('navigation__link--active')
            }

            wrapper.unmount()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: vue3-portfolio-website, Property 14: 导航菜单全局可见性
   * 
   * Property: 对于任何页面路由，导航组件应当始终存在于 DOM 中并可见
   * 
   * Validates: Requirements 6.1
   */
  describe('Property 14: Navigation Menu Global Visibility', () => {
    it('should be present in DOM for any valid route', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validPaths),
          async (routePath) => {
            // Setup router with the route
            const router = createTestRouter()
            await router.push(routePath)
            await router.isReady()

            const wrapper = mount(Navigation, {
              global: {
                plugins: [router],
              },
            })

            // Property: Navigation component should exist in DOM
            expect(wrapper.find('.navigation').exists()).toBe(true)

            // Property: Navigation should be visible (not display: none)
            const navElement = wrapper.find('.navigation').element as HTMLElement
            expect(navElement).toBeDefined()
            expect(navElement.offsetParent).not.toBeNull() // Element is visible

            // Property: Navigation menu should contain menu items
            const menuItems = wrapper.findAll('.navigation__item')
            expect(menuItems.length).toBeGreaterThan(0)

            wrapper.unmount()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should remain visible when navigating between routes', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a sequence of route changes
          fc.array(fc.constantFrom(...validPaths), { minLength: 2, maxLength: 5 }),
          async (routeSequence) => {
            // Setup
            const router = createTestRouter()
            await router.push(routeSequence[0])
            await router.isReady()

            const wrapper = mount(Navigation, {
              global: {
                plugins: [router],
              },
            })

            // Navigate through the sequence
            for (const route of routeSequence) {
              await router.push(route)
              await router.isReady()
              await wrapper.vm.$nextTick()

              // Property: Navigation should still exist and be visible
              expect(wrapper.find('.navigation').exists()).toBe(true)
              
              const navElement = wrapper.find('.navigation').element as HTMLElement
              expect(navElement.offsetParent).not.toBeNull()

              // Property: Menu items should still be present
              const menuItems = wrapper.findAll('.navigation__item')
              expect(menuItems.length).toBeGreaterThan(0)
            }

            wrapper.unmount()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain fixed positioning across all routes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validPaths),
          async (routePath) => {
            // Setup with fixed prop
            const router = createTestRouter()
            await router.push(routePath)
            await router.isReady()

            const wrapper = mount(Navigation, {
              props: {
                fixed: true,
              },
              global: {
                plugins: [router],
              },
            })

            // Property: When fixed prop is true, navigation should have fixed class
            const navElement = wrapper.find('.navigation')
            expect(navElement.classes()).toContain('navigation--fixed')

            wrapper.unmount()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should display all required menu items on any route', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validPaths),
          async (routePath) => {
            // Setup
            const router = createTestRouter()
            await router.push(routePath)
            await router.isReady()

            const wrapper = mount(Navigation, {
              global: {
                plugins: [router],
              },
            })

            // Property: All valid paths should have corresponding menu items
            const links = wrapper.findAll('.navigation__link')
            const linkPaths = links.map((link) => link.attributes('href'))

            for (const path of validPaths) {
              expect(linkPaths).toContain(path)
            }

            wrapper.unmount()
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
