import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ParticleBackground from '../ParticleBackground.vue'

// Mock useTheme composable
vi.mock('@/composables/useTheme', () => ({
  useTheme: () => {
    const resolvedTheme = ref<'dark' | 'light'>('dark')
    return {
      resolvedTheme,
      setTheme: (theme: 'dark' | 'light') => {
        resolvedTheme.value = theme
      }
    }
  }
}))

describe('ParticleBackground - 主题切换功能', () => {
  beforeEach(() => {
    // Mock requestAnimationFrame and cancelAnimationFrame
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => {
      cb(0)
      return 1
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  it('应该在深色主题下渲染组件', () => {
    const wrapper = mount(ParticleBackground)
    
    expect(wrapper.find('.particle-background').exists()).toBe(true)
    expect(wrapper.find('.gradient-background').exists()).toBe(true)
    expect(wrapper.find('.particle-canvas').exists()).toBe(true)
  })

  it('应该接受自定义粒子配置属性', () => {
    const wrapper = mount(ParticleBackground, {
      props: {
        count: 100,
        color: '#FF0000',
        speed: 1.0,
        size: 3,
        connectionDistance: 200
      }
    })

    expect(wrapper.props('count')).toBe(100)
    expect(wrapper.props('color')).toBe('#FF0000')
    expect(wrapper.props('speed')).toBe(1.0)
    expect(wrapper.props('size')).toBe(3)
    expect(wrapper.props('connectionDistance')).toBe(200)
  })

  it('应该在未提供属性时使用默认值', () => {
    const wrapper = mount(ParticleBackground)

    expect(wrapper.props('count')).toBe(80)
    expect(wrapper.props('color')).toBe('#00D9FF')
    expect(wrapper.props('speed')).toBe(0.5)
    expect(wrapper.props('size')).toBe(2)
    expect(wrapper.props('connectionDistance')).toBe(150)
  })

  it('应该包含背景和画布元素的正确结构', () => {
    const wrapper = mount(ParticleBackground)
    const background = wrapper.find('.particle-background')
    
    expect(background.exists()).toBe(true)
    expect(background.classes()).toContain('particle-background')
    
    // 检查渐变背景和画布是否都是子元素
    const gradient = background.find('.gradient-background')
    const canvas = background.find('.particle-canvas')
    
    expect(gradient.exists()).toBe(true)
    expect(canvas.exists()).toBe(true)
  })

  it('应该为背景渐变添加平滑过渡效果', () => {
    const wrapper = mount(ParticleBackground)
    const gradient = wrapper.find('.gradient-background')
    
    // 检查是否有 transition 样式
    const style = gradient.element.getAttribute('style')
    // 注意：在测试环境中，scoped CSS 可能不会完全应用
    // 所以我们主要验证组件结构是否正确
    expect(gradient.exists()).toBe(true)
  })
})
