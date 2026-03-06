import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ErrorBoundary from '../ErrorBoundary.vue'
import BrowserCompatibilityWarning from '../BrowserCompatibilityWarning.vue'

describe('Error Handling Components', () => {
  describe('ErrorBoundary', () => {
    it('should render children when no error occurs', () => {
      const wrapper = mount(ErrorBoundary, {
        slots: {
          default: '<div class="test-content">Test Content</div>',
        },
      })

      expect(wrapper.find('.test-content').exists()).toBe(true)
      expect(wrapper.find('.error-boundary').exists()).toBe(false)
    })

    it('should accept custom title and message props', () => {
      const wrapper = mount(ErrorBoundary, {
        props: {
          title: 'Custom Error',
          message: 'Custom error message',
          showDetails: false,
          showReportButton: true,
        },
        slots: {
          default: '<div>Content</div>',
        },
      })

      expect(wrapper.props('title')).toBe('Custom Error')
      expect(wrapper.props('message')).toBe('Custom error message')
      expect(wrapper.props('showReportButton')).toBe(true)
    })

    it('should have default props', () => {
      const wrapper = mount(ErrorBoundary, {
        slots: {
          default: '<div>Content</div>',
        },
      })

      expect(wrapper.props('title')).toBe('组件加载失败')
      expect(wrapper.props('message')).toContain('抱歉')
    })
  })

  describe('BrowserCompatibilityWarning', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear()
    })

    it('should not show warning if dismissed', () => {
      localStorage.setItem('browser-compat-warning-dismissed', 'true')
      
      const wrapper = mount(BrowserCompatibilityWarning, {
        props: {
          autoCheck: false,
        },
      })

      expect(wrapper.find('.compat-warning').exists()).toBe(false)
    })

    it('should be dismissible when close button is clicked', async () => {
      const wrapper = mount(BrowserCompatibilityWarning, {
        props: {
          autoCheck: false,
        },
      })

      // Manually trigger compatibility check
      wrapper.vm.checkCompatibility()
      await wrapper.vm.$nextTick()

      if (wrapper.find('.compat-warning').exists()) {
        await wrapper.find('.close-button').trigger('click')
        await wrapper.vm.$nextTick()

        expect(wrapper.find('.compat-warning').exists()).toBe(false)
        expect(localStorage.getItem('browser-compat-warning-dismissed')).toBe('true')
      }
    })

    it('should accept custom storage key', () => {
      const wrapper = mount(BrowserCompatibilityWarning, {
        props: {
          autoCheck: false,
          storageKey: 'custom-key',
        },
      })

      expect(wrapper.props('storageKey')).toBe('custom-key')
    })
  })
})
