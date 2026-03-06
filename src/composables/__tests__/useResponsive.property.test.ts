import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import * as fc from 'fast-check'
import { useResponsive } from '../useResponsive'

/**
 * Feature: vue3-portfolio-website, Property 10: 响应式布局适配性
 * 
 * Property: 对于任何视口宽度变化，页面布局应当根据预设的断点（桌面、平板、移动）
 * 自动调整为对应的布局模式
 * 
 * Validates: Requirements 2.5, 8.1, 8.2, 8.3, 8.5
 */

// Define breakpoints as per design document
const BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
}

// Helper to create a test component using useResponsive
function createTestComponent() {
  return defineComponent({
    setup() {
      const responsive = useResponsive()
      return { ...responsive }
    },
    template: '<div></div>',
  })
}

// Helper to set window width
function setWindowWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
}

describe('useResponsive Property Tests', () => {
  let originalInnerWidth: number

  beforeEach(() => {
    // Save original window width
    originalInnerWidth = window.innerWidth
  })

  afterEach(() => {
    // Restore original window width
    setWindowWidth(originalInnerWidth)
  })

  describe('Property 10: Responsive Layout Adaptability', () => {
    it('should correctly identify mobile layout for widths below tablet breakpoint', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate widths from 320px (minimum mobile) to just below tablet breakpoint
          fc.integer({ min: 320, max: BREAKPOINTS.tablet - 1 }),
          async (width) => {
            // Setup
            setWindowWidth(width)
            const TestComponent = createTestComponent()
            const wrapper = mount(TestComponent)

            // Trigger resize event
            window.dispatchEvent(new Event('resize'))
            await nextTick()

            // Property: For any width < tablet breakpoint, isMobile should be true
            expect(wrapper.vm.isMobile).toBe(true)
            expect(wrapper.vm.isTablet).toBe(false)
            expect(wrapper.vm.isDesktop).toBe(false)
            expect(wrapper.vm.windowWidth).toBe(width)

            wrapper.unmount()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly identify tablet layout for widths between tablet and desktop breakpoints', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate widths from tablet to just below desktop breakpoint
          fc.integer({ min: BREAKPOINTS.tablet, max: BREAKPOINTS.desktop - 1 }),
          async (width) => {
            // Setup
            setWindowWidth(width)
            const TestComponent = createTestComponent()
            const wrapper = mount(TestComponent)

            // Trigger resize event
            window.dispatchEvent(new Event('resize'))
            await nextTick()

            // Property: For any width >= tablet and < desktop, isTablet should be true
            expect(wrapper.vm.isMobile).toBe(false)
            expect(wrapper.vm.isTablet).toBe(true)
            expect(wrapper.vm.isDesktop).toBe(false)
            expect(wrapper.vm.windowWidth).toBe(width)

            wrapper.unmount()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly identify desktop layout for widths at or above desktop breakpoint', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate widths from desktop breakpoint to 4K resolution
          fc.integer({ min: BREAKPOINTS.desktop, max: 3840 }),
          async (width) => {
            // Setup
            setWindowWidth(width)
            const TestComponent = createTestComponent()
            const wrapper = mount(TestComponent)

            // Trigger resize event
            window.dispatchEvent(new Event('resize'))
            await nextTick()

            // Property: For any width >= desktop breakpoint, isDesktop should be true
            expect(wrapper.vm.isMobile).toBe(false)
            expect(wrapper.vm.isTablet).toBe(false)
            expect(wrapper.vm.isDesktop).toBe(true)
            expect(wrapper.vm.windowWidth).toBe(width)

            wrapper.unmount()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should update layout mode when viewport width changes across breakpoints', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate two different widths that cross breakpoints
          fc
            .tuple(
              fc.integer({ min: 320, max: 3840 }),
              fc.integer({ min: 320, max: 3840 })
            )
            .filter(([width1, width2]) => {
              // Ensure widths are in different breakpoint ranges
              const getBreakpoint = (w: number) => {
                if (w < BREAKPOINTS.tablet) return 'mobile'
                if (w < BREAKPOINTS.desktop) return 'tablet'
                return 'desktop'
              }
              return getBreakpoint(width1) !== getBreakpoint(width2)
            }),
          async ([initialWidth, targetWidth]) => {
            // Setup with initial width
            setWindowWidth(initialWidth)
            const TestComponent = createTestComponent()
            const wrapper = mount(TestComponent)

            // Trigger initial resize
            window.dispatchEvent(new Event('resize'))
            await nextTick()

            // Capture initial state
            const initialMobile = wrapper.vm.isMobile
            const initialTablet = wrapper.vm.isTablet
            const initialDesktop = wrapper.vm.isDesktop

            // Change to target width
            setWindowWidth(targetWidth)
            window.dispatchEvent(new Event('resize'))
            await nextTick()

            // Property: Layout mode should change when crossing breakpoints
            const targetMobile = wrapper.vm.isMobile
            const targetTablet = wrapper.vm.isTablet
            const targetDesktop = wrapper.vm.isDesktop

            // At least one flag should have changed
            expect(
              initialMobile !== targetMobile ||
                initialTablet !== targetTablet ||
                initialDesktop !== targetDesktop
            ).toBe(true)

            // Property: Exactly one layout mode should be active at any time
            const activeCount = [targetMobile, targetTablet, targetDesktop].filter(Boolean).length
            expect(activeCount).toBe(1)

            // Property: windowWidth should reflect the current width
            expect(wrapper.vm.windowWidth).toBe(targetWidth)

            wrapper.unmount()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain exactly one active layout mode for any viewport width', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate any valid viewport width
          fc.integer({ min: 320, max: 3840 }),
          async (width) => {
            // Setup
            setWindowWidth(width)
            const TestComponent = createTestComponent()
            const wrapper = mount(TestComponent)

            // Trigger resize event
            window.dispatchEvent(new Event('resize'))
            await nextTick()

            // Property: Exactly one of isMobile, isTablet, isDesktop should be true
            const activeFlags = [
              wrapper.vm.isMobile,
              wrapper.vm.isTablet,
              wrapper.vm.isDesktop,
            ]
            const activeCount = activeFlags.filter(Boolean).length

            expect(activeCount).toBe(1)

            wrapper.unmount()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle boundary values at breakpoint thresholds correctly', async () => {
      // Test exact breakpoint values
      const boundaryTests = [
        { width: BREAKPOINTS.tablet - 1, expected: 'mobile' },
        { width: BREAKPOINTS.tablet, expected: 'tablet' },
        { width: BREAKPOINTS.desktop - 1, expected: 'tablet' },
        { width: BREAKPOINTS.desktop, expected: 'desktop' },
      ]

      for (const { width, expected } of boundaryTests) {
        setWindowWidth(width)
        const TestComponent = createTestComponent()
        const wrapper = mount(TestComponent)

        window.dispatchEvent(new Event('resize'))
        await nextTick()

        // Property: Breakpoint boundaries should be handled correctly
        if (expected === 'mobile') {
          expect(wrapper.vm.isMobile).toBe(true)
          expect(wrapper.vm.isTablet).toBe(false)
          expect(wrapper.vm.isDesktop).toBe(false)
        } else if (expected === 'tablet') {
          expect(wrapper.vm.isMobile).toBe(false)
          expect(wrapper.vm.isTablet).toBe(true)
          expect(wrapper.vm.isDesktop).toBe(false)
        } else if (expected === 'desktop') {
          expect(wrapper.vm.isMobile).toBe(false)
          expect(wrapper.vm.isTablet).toBe(false)
          expect(wrapper.vm.isDesktop).toBe(true)
        }

        wrapper.unmount()
      }
    })

    it('should respond to multiple rapid viewport changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a sequence of viewport width changes
          fc.array(fc.integer({ min: 320, max: 3840 }), { minLength: 3, maxLength: 10 }),
          async (widthSequence) => {
            // Setup
            setWindowWidth(widthSequence[0])
            const TestComponent = createTestComponent()
            const wrapper = mount(TestComponent)

            // Apply each width change
            for (const width of widthSequence) {
              setWindowWidth(width)
              window.dispatchEvent(new Event('resize'))
              await nextTick()

              // Property: After each change, exactly one layout mode should be active
              const activeCount = [
                wrapper.vm.isMobile,
                wrapper.vm.isTablet,
                wrapper.vm.isDesktop,
              ].filter(Boolean).length

              expect(activeCount).toBe(1)

              // Property: windowWidth should always reflect current width
              expect(wrapper.vm.windowWidth).toBe(width)

              // Property: Layout mode should match the current width
              if (width < BREAKPOINTS.tablet) {
                expect(wrapper.vm.isMobile).toBe(true)
              } else if (width < BREAKPOINTS.desktop) {
                expect(wrapper.vm.isTablet).toBe(true)
              } else {
                expect(wrapper.vm.isDesktop).toBe(true)
              }
            }

            wrapper.unmount()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should support custom breakpoints while maintaining layout consistency', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate custom breakpoints
          fc
            .tuple(
              fc.integer({ min: 400, max: 700 }), // custom mobile
              fc.integer({ min: 701, max: 900 }), // custom tablet
              fc.integer({ min: 901, max: 1200 }) // custom desktop
            )
            .map(([mobile, tablet, desktop]) => ({ mobile, tablet, desktop })),
          fc.integer({ min: 320, max: 1400 }),
          async (customBreakpoints, width) => {
            // Setup with custom breakpoints
            setWindowWidth(width)
            const TestComponent = defineComponent({
              setup() {
                const responsive = useResponsive(customBreakpoints)
                return { ...responsive }
              },
              template: '<div></div>',
            })
            const wrapper = mount(TestComponent)

            window.dispatchEvent(new Event('resize'))
            await nextTick()

            // Property: Custom breakpoints should be respected
            if (width < customBreakpoints.tablet) {
              expect(wrapper.vm.isMobile).toBe(true)
              expect(wrapper.vm.isTablet).toBe(false)
              expect(wrapper.vm.isDesktop).toBe(false)
            } else if (width < customBreakpoints.desktop) {
              expect(wrapper.vm.isMobile).toBe(false)
              expect(wrapper.vm.isTablet).toBe(true)
              expect(wrapper.vm.isDesktop).toBe(false)
            } else {
              expect(wrapper.vm.isMobile).toBe(false)
              expect(wrapper.vm.isTablet).toBe(false)
              expect(wrapper.vm.isDesktop).toBe(true)
            }

            // Property: Exactly one layout mode should be active
            const activeCount = [
              wrapper.vm.isMobile,
              wrapper.vm.isTablet,
              wrapper.vm.isDesktop,
            ].filter(Boolean).length
            expect(activeCount).toBe(1)

            wrapper.unmount()
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
