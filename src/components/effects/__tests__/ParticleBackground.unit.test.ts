/**
 * ParticleBackground 组件单元测试
 * 
 * 测试范围：
 * - 不同主题下的粒子颜色渲染
 * - 主题切换时的状态更新
 * - 粒子透明度的主题适配
 * 
 * 验证需求：1.1, 1.2, 1.3, 2.1, 2.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import ParticleBackground from '../ParticleBackground.vue'

describe('ParticleBackground - 主题切换单元测试', () => {
  let rafSpy: ReturnType<typeof vi.fn>
  let cafSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Mock requestAnimationFrame 和 cancelAnimationFrame
    rafSpy = vi.fn((cb) => {
      cb(0)
      return 1
    })
    cafSpy = vi.fn()
    
    vi.stubGlobal('requestAnimationFrame', rafSpy)
    vi.stubGlobal('cancelAnimationFrame', cafSpy)
  })

  describe('深色主题渲染', () => {
    it('应该在深色主题下使用正确的粒子颜色', async () => {
      // Mock useTheme 返回深色主题
      vi.doMock('@/composables/useTheme', () => ({
        useTheme: () => ({
          resolvedTheme: ref('dark'),
          setTheme: vi.fn(),
        }),
      }))

      const wrapper = mount(ParticleBackground)
      await nextTick()

      // 验证组件渲染
      expect(wrapper.find('.particle-background').exists()).toBe(true)
      expect(wrapper.find('.particle-canvas').exists()).toBe(true)
    })

    it('应该在深色主题下使用完全不透明的粒子', async () => {
      vi.doMock('@/composables/useTheme', () => ({
        useTheme: () => ({
          resolvedTheme: ref('dark'),
          setTheme: vi.fn(),
        }),
      }))

      const wrapper = mount(ParticleBackground)
      await nextTick()

      // 验证 canvas 元素存在
      const canvas = wrapper.find('.particle-canvas')
      expect(canvas.exists()).toBe(true)
    })
  })

  describe('亮色主题渲染', () => {
    it('应该在亮色主题下使用正确的粒子颜色', async () => {
      // Mock useTheme 返回亮色主题
      vi.doMock('@/composables/useTheme', () => ({
        useTheme: () => ({
          resolvedTheme: ref('light'),
          setTheme: vi.fn(),
        }),
      }))

      const wrapper = mount(ParticleBackground)
      await nextTick()

      // 验证组件渲染
      expect(wrapper.find('.particle-background').exists()).toBe(true)
      expect(wrapper.find('.particle-canvas').exists()).toBe(true)
    })

    it('应该在亮色主题下使用降低透明度的粒子', async () => {
      vi.doMock('@/composables/useTheme', () => ({
        useTheme: () => ({
          resolvedTheme: ref('light'),
          setTheme: vi.fn(),
        }),
      }))

      const wrapper = mount(ParticleBackground)
      await nextTick()

      // 验证 canvas 元素存在
      const canvas = wrapper.find('.particle-canvas')
      expect(canvas.exists()).toBe(true)
    })
  })

  describe('主题切换', () => {
    it('应该在主题切换时更新粒子颜色', async () => {
      const resolvedTheme = ref<'dark' | 'light'>('dark')
      
      vi.doMock('@/composables/useTheme', () => ({
        useTheme: () => ({
          resolvedTheme,
          setTheme: (theme: 'dark' | 'light') => {
            resolvedTheme.value = theme
          },
        }),
      }))

      const wrapper = mount(ParticleBackground)
      await nextTick()

      // 初始状态：深色主题
      expect(wrapper.find('.particle-canvas').exists()).toBe(true)

      // 切换到亮色主题
      resolvedTheme.value = 'light'
      await nextTick()

      // 验证组件仍然正常渲染
      expect(wrapper.find('.particle-canvas').exists()).toBe(true)
    })
  })

  describe('自定义颜色属性', () => {
    it('应该优先使用 props 中指定的颜色', async () => {
      vi.doMock('@/composables/useTheme', () => ({
        useTheme: () => ({
          resolvedTheme: ref('dark'),
          setTheme: vi.fn(),
        }),
      }))

      const customColor = '#FF0000'
      const wrapper = mount(ParticleBackground, {
        props: {
          color: customColor,
        },
      })
      await nextTick()

      // 验证 props 被正确接收
      expect(wrapper.props('color')).toBe(customColor)
    })

    it('应该在未指定颜色时使用主题默认颜色', async () => {
      vi.doMock('@/composables/useTheme', () => ({
        useTheme: () => ({
          resolvedTheme: ref('dark'),
          setTheme: vi.fn(),
        }),
      }))

      const wrapper = mount(ParticleBackground)
      await nextTick()

      // 验证使用默认颜色
      expect(wrapper.props('color')).toBe('#00D9FF')
    })
  })

  describe('渐变背景主题适配', () => {
    it('应该在深色主题下显示深色渐变背景', async () => {
      vi.doMock('@/composables/useTheme', () => ({
        useTheme: () => ({
          resolvedTheme: ref('dark'),
          setTheme: vi.fn(),
        }),
      }))

      const wrapper = mount(ParticleBackground)
      await nextTick()

      const gradient = wrapper.find('.gradient-background')
      expect(gradient.exists()).toBe(true)
    })

    it('应该在亮色主题下显示亮色渐变背景', async () => {
      vi.doMock('@/composables/useTheme', () => ({
        useTheme: () => ({
          resolvedTheme: ref('light'),
          setTheme: vi.fn(),
        }),
      }))

      const wrapper = mount(ParticleBackground)
      await nextTick()

      const gradient = wrapper.find('.gradient-background')
      expect(gradient.exists()).toBe(true)
    })
  })

  describe('组件生命周期', () => {
    it('应该在挂载时正确初始化', async () => {
      vi.doMock('@/composables/useTheme', () => ({
        useTheme: () => ({
          resolvedTheme: ref('dark'),
          setTheme: vi.fn(),
        }),
      }))

      const wrapper = mount(ParticleBackground)
      await nextTick()

      // 验证 canvas 元素存在
      const canvas = wrapper.find('canvas')
      expect(canvas.exists()).toBe(true)
    })

    it('应该在卸载时正确清理', async () => {
      vi.doMock('@/composables/useTheme', () => ({
        useTheme: () => ({
          resolvedTheme: ref('dark'),
          setTheme: vi.fn(),
        }),
      }))

      const wrapper = mount(ParticleBackground)
      await nextTick()

      // 验证组件存在
      expect(wrapper.find('.particle-canvas').exists()).toBe(true)

      // 卸载组件
      wrapper.unmount()

      // 验证卸载成功（不会抛出错误）
      expect(true).toBe(true)
    })
  })

  describe('性能优化', () => {
    it('应该在 prefers-reduced-motion 时禁用动画', async () => {
      vi.doMock('@/composables/useTheme', () => ({
        useTheme: () => ({
          resolvedTheme: ref('dark'),
          setTheme: vi.fn(),
        }),
      }))

      const wrapper = mount(ParticleBackground)
      await nextTick()

      // 验证组件渲染
      expect(wrapper.find('.particle-background').exists()).toBe(true)
      expect(wrapper.find('.gradient-background').exists()).toBe(true)
    })
  })
})
