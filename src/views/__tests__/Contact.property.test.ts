import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import * as fc from 'fast-check'
import { createRouter, createMemoryHistory } from 'vue-router'
import Contact from '../Contact.vue'

// Create a mock router for testing
const createMockRouter = () => {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/contact',
        name: 'contact',
        component: Contact,
      },
    ],
  })
}

/**
 * Feature: vue3-portfolio-website, Property 12: 下载功能可用性
 *
 * Property: 对于任何下载按钮点击操作，应当触发简历 PDF 文件的下载行为，并更新 UI 状态以反馈下载操作
 *
 * Validates: Requirements 12.2, 12.3
 */

describe('Contact Property Tests', () => {
  describe('Property 12: Download Functionality Availability', () => {
    let originalFetch: typeof global.fetch
    let originalCreateElement: typeof document.createElement

    beforeEach(() => {
      // Store original functions
      originalFetch = global.fetch
      originalCreateElement = document.createElement.bind(document)
    })

    afterEach(() => {
      // Restore original functions
      global.fetch = originalFetch
      document.createElement = originalCreateElement
    })

    it('should trigger download and update UI state when download button is clicked', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(true), // Arbitrary property to run test multiple times
          async () => {
            // Mock fetch to simulate successful file check
            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              status: 200,
            })

            // Track if download was triggered
            let downloadTriggered = false
            let downloadHref = ''
            let downloadAttribute = ''

            // Mock createElement to intercept link creation
            document.createElement = vi.fn((tagName: string) => {
              const element = originalCreateElement(tagName)
              if (tagName === 'a') {
                // Override click to track download
                element.click = vi.fn(() => {
                  downloadTriggered = true
                  downloadHref = (element as HTMLAnchorElement).href
                  downloadAttribute = (element as HTMLAnchorElement).download
                  // Don't actually trigger download in test
                })
              }
              return element
            }) as any

            const router = createMockRouter()
            await router.push('/contact')
            await router.isReady()

            const wrapper = mount(Contact, {
              global: {
                plugins: [router],
              },
            })
            await wrapper.vm.$nextTick()

            // Find download button
            const downloadButton = wrapper.find('[data-testid="download-button"]')
            expect(downloadButton.exists()).toBe(true)

            // Property: Button should not be disabled initially
            expect(downloadButton.attributes('disabled')).toBeUndefined()

            // Property: Button should show correct initial text
            expect(downloadButton.text()).toContain('下载简历 PDF')

            // Click download button
            await downloadButton.trigger('click')
            await wrapper.vm.$nextTick()

            // Small delay to allow async operations
            await new Promise((resolve) => setTimeout(resolve, 100))
            await wrapper.vm.$nextTick()

            // Property: Download should be triggered
            expect(downloadTriggered).toBe(true)

            // Property: Download href should point to correct resume path (URL encoded)
            expect(decodeURIComponent(downloadHref)).toContain('/file/CV/黄彦杰-个人简历.pdf')

            // Property: Download attribute should be set with proper filename
            expect(downloadAttribute).toBeTruthy()
            expect(downloadAttribute).toBe('黄彦杰_简历.pdf')

            // Property: UI should show success state
            expect(downloadButton.text()).toContain('下载成功')

            // Property: fetch should be called to check file existence (URL may be encoded)
            expect(global.fetch).toHaveBeenCalled()
            const fetchCall = (global.fetch as any).mock.calls[0]
            expect(decodeURIComponent(fetchCall[0])).toBe('/file/CV/黄彦杰-个人简历.pdf')
          }
        ),
        { numRuns: 10 }
      )
    }, 30000) // 30 second timeout

    it('should show error message when download fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(true),
          async () => {
            // Mock fetch to simulate file not found
            global.fetch = vi.fn().mockResolvedValue({
              ok: false,
              status: 404,
            })

            const router = createMockRouter()
            await router.push('/contact')
            await router.isReady()

            const wrapper = mount(Contact, {
              global: {
                plugins: [router],
              },
            })
            await wrapper.vm.$nextTick()

            // Find download button
            const downloadButton = wrapper.find('[data-testid="download-button"]')

            // Click download button
            await downloadButton.trigger('click')
            await wrapper.vm.$nextTick()

            // Small delay to allow async operations
            await new Promise((resolve) => setTimeout(resolve, 100))
            await wrapper.vm.$nextTick()

            // Property: Error message should be displayed
            const errorMessage = wrapper.find('[data-testid="download-error"]')
            expect(errorMessage.exists()).toBe(true)
            expect(errorMessage.text()).toContain('下载失败')

            // Property: Button should not show success state
            expect(downloadButton.text()).not.toContain('下载成功')
          }
        ),
        { numRuns: 10 }
      )
    }, 30000) // 30 second timeout

    it('should disable button during download', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(true),
          async () => {
            // Mock fetch with delay to simulate download in progress
            global.fetch = vi.fn().mockImplementation(
              () =>
                new Promise((resolve) => {
                  setTimeout(() => {
                    resolve({
                      ok: true,
                      status: 200,
                    })
                  }, 50)
                })
            )

            // Mock createElement
            document.createElement = vi.fn((tagName: string) => {
              const element = originalCreateElement(tagName)
              if (tagName === 'a') {
                element.click = vi.fn()
              }
              return element
            }) as any

            const router = createMockRouter()
            await router.push('/contact')
            await router.isReady()

            const wrapper = mount(Contact, {
              global: {
                plugins: [router],
              },
            })
            await wrapper.vm.$nextTick()

            const downloadButton = wrapper.find('[data-testid="download-button"]')

            // Click download button
            await downloadButton.trigger('click')
            await wrapper.vm.$nextTick()

            // Property: Button should be disabled during download
            expect(downloadButton.attributes('disabled')).toBeDefined()

            // Property: Button should show loading text
            expect(downloadButton.text()).toContain('下载中')

            // Wait for download to complete
            await new Promise((resolve) => setTimeout(resolve, 100))
            await wrapper.vm.$nextTick()

            // Property: Button should be enabled after download
            expect(downloadButton.attributes('disabled')).toBeUndefined()
          }
        ),
        { numRuns: 10 }
      )
    }, 30000) // 30 second timeout

    it('should handle mobile devices correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'iPhone',
            'iPad',
            'iPod',
            'Android',
            'iPhone Safari',
            'Android Chrome'
          ),
          async (deviceType) => {
            // Mock user agent for mobile device
            const originalUserAgent = navigator.userAgent
            Object.defineProperty(navigator, 'userAgent', {
              value: `Mozilla/5.0 (${deviceType})`,
              configurable: true,
            })

            // Mock fetch
            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              status: 200,
            })

            // Track link attributes
            let linkTarget = ''
            let linkRel = ''

            document.createElement = vi.fn((tagName: string) => {
              const element = originalCreateElement(tagName)
              if (tagName === 'a') {
                element.click = vi.fn(() => {
                  linkTarget = (element as HTMLAnchorElement).target
                  linkRel = (element as HTMLAnchorElement).rel
                })
              }
              return element
            }) as any

            const router = createMockRouter()
            await router.push('/contact')
            await router.isReady()

            const wrapper = mount(Contact, {
              global: {
                plugins: [router],
              },
            })
            await wrapper.vm.$nextTick()

            const downloadButton = wrapper.find('[data-testid="download-button"]')
            await downloadButton.trigger('click')
            await wrapper.vm.$nextTick()

            await new Promise((resolve) => setTimeout(resolve, 100))
            await wrapper.vm.$nextTick()

            // Property: On mobile, link should open in new tab
            expect(linkTarget).toBe('_blank')
            expect(linkRel).toBe('noopener noreferrer')

            // Restore user agent
            Object.defineProperty(navigator, 'userAgent', {
              value: originalUserAgent,
              configurable: true,
            })
          }
        ),
        { numRuns: 10 }
      )
    }, 30000) // 30 second timeout

    it('should clear success message after timeout', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(true),
          async () => {
            // Mock fetch
            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              status: 200,
            })

            // Mock createElement
            document.createElement = vi.fn((tagName: string) => {
              const element = originalCreateElement(tagName)
              if (tagName === 'a') {
                element.click = vi.fn()
              }
              return element
            }) as any

            const router = createMockRouter()
            await router.push('/contact')
            await router.isReady()

            const wrapper = mount(Contact, {
              global: {
                plugins: [router],
              },
            })
            await wrapper.vm.$nextTick()

            const downloadButton = wrapper.find('[data-testid="download-button"]')
            await downloadButton.trigger('click')
            await wrapper.vm.$nextTick()

            await new Promise((resolve) => setTimeout(resolve, 100))
            await wrapper.vm.$nextTick()

            // Property: Success message should be visible
            expect(downloadButton.text()).toContain('下载成功')

            // Wait for timeout (3 seconds + buffer)
            await new Promise((resolve) => setTimeout(resolve, 3200))
            await wrapper.vm.$nextTick()

            // Property: Success message should be cleared after timeout
            expect(downloadButton.text()).not.toContain('下载成功')
            expect(downloadButton.text()).toContain('下载简历 PDF')
          }
        ),
        { numRuns: 5 } // Reduced runs due to timeout
      )
    }, 60000) // 1 minute timeout

    it('should clear error message after timeout', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(true),
          async () => {
            // Mock fetch to fail
            global.fetch = vi.fn().mockResolvedValue({
              ok: false,
              status: 404,
            })

            const router = createMockRouter()
            await router.push('/contact')
            await router.isReady()

            const wrapper = mount(Contact, {
              global: {
                plugins: [router],
              },
            })
            await wrapper.vm.$nextTick()

            const downloadButton = wrapper.find('[data-testid="download-button"]')
            await downloadButton.trigger('click')
            await wrapper.vm.$nextTick()

            await new Promise((resolve) => setTimeout(resolve, 100))
            await wrapper.vm.$nextTick()

            // Property: Error message should be visible
            let errorMessage = wrapper.find('[data-testid="download-error"]')
            expect(errorMessage.exists()).toBe(true)

            // Wait for timeout (3 seconds + buffer)
            await new Promise((resolve) => setTimeout(resolve, 3200))
            await wrapper.vm.$nextTick()

            // Property: Error message should be cleared after timeout
            errorMessage = wrapper.find('[data-testid="download-error"]')
            expect(errorMessage.exists()).toBe(false)
          }
        ),
        { numRuns: 5 } // Reduced runs due to timeout
      )
    }, 60000) // 1 minute timeout

    it('should use correct filename with profile name', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(true),
          async () => {
            // Mock fetch
            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              status: 200,
            })

            let downloadFilename = ''

            document.createElement = vi.fn((tagName: string) => {
              const element = originalCreateElement(tagName)
              if (tagName === 'a') {
                element.click = vi.fn(() => {
                  downloadFilename = (element as HTMLAnchorElement).download
                })
              }
              return element
            }) as any

            const router = createMockRouter()
            await router.push('/contact')
            await router.isReady()

            const wrapper = mount(Contact, {
              global: {
                plugins: [router],
              },
            })
            await wrapper.vm.$nextTick()

            const downloadButton = wrapper.find('[data-testid="download-button"]')
            await downloadButton.trigger('click')
            await wrapper.vm.$nextTick()

            await new Promise((resolve) => setTimeout(resolve, 100))
            await wrapper.vm.$nextTick()

            // Property: Filename should be exactly as specified
            expect(downloadFilename).toBe('黄彦杰_简历.pdf')
          }
        ),
        { numRuns: 10 }
      )
    }, 30000) // 30 second timeout
  })
})
