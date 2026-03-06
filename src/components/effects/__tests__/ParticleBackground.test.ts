import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ParticleBackground from '../ParticleBackground.vue'

describe('ParticleBackground', () => {
  beforeEach(() => {
    // Mock requestAnimationFrame and cancelAnimationFrame
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => {
      cb(0)
      return 1
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  it('renders the component with gradient background', () => {
    const wrapper = mount(ParticleBackground)
    
    expect(wrapper.find('.particle-background').exists()).toBe(true)
    expect(wrapper.find('.gradient-background').exists()).toBe(true)
    expect(wrapper.find('.particle-canvas').exists()).toBe(true)
  })

  it('accepts custom particle configuration props', () => {
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

  it('uses default props when not provided', () => {
    const wrapper = mount(ParticleBackground)

    expect(wrapper.props('count')).toBe(80)
    expect(wrapper.props('color')).toBe('#00D9FF')
    expect(wrapper.props('speed')).toBe(0.5)
    expect(wrapper.props('size')).toBe(2)
    expect(wrapper.props('connectionDistance')).toBe(150)
  })

  it('applies parallax transform style', () => {
    const wrapper = mount(ParticleBackground)
    const canvas = wrapper.find('.particle-canvas')
    
    // Initial state - parallax offset starts at 0
    expect(canvas.attributes('style')).toContain('transform: translateY(0px)')
  })

  it('has proper structure with background and canvas elements', () => {
    const wrapper = mount(ParticleBackground)
    const background = wrapper.find('.particle-background')
    
    expect(background.exists()).toBe(true)
    expect(background.classes()).toContain('particle-background')
    
    // Check that both gradient and canvas are children
    const gradient = background.find('.gradient-background')
    const canvas = background.find('.particle-canvas')
    
    expect(gradient.exists()).toBe(true)
    expect(canvas.exists()).toBe(true)
  })
})
