import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import ParticleBackground from '../ParticleBackground.vue'

const createContext = () => ({
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
})

describe('ParticleBackground', () => {
  let wrapper: VueWrapper | undefined
  let context: ReturnType<typeof createContext>
  let frames: Map<number, FrameRequestCallback>

  beforeEach(() => {
    frames = new Map()
    let nextFrameId = 0
    context = createContext()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D
    )
    vi.spyOn(Math, 'random').mockReturnValue(0.25)
    vi.stubGlobal('innerWidth', 1024)
    vi.stubGlobal('innerHeight', 768)

    // RAF 只排队；同步调用回调会让真实 animate 循环递归溢出。
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frames.set(++nextFrameId, callback)
        return nextFrameId
      })
    )
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((id: number) => frames.delete(id))
    )
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders the component with gradient background', () => {
    wrapper = mount(ParticleBackground)

    expect(wrapper.find('.particle-background').exists()).toBe(true)
    expect(wrapper.find('.gradient-background').exists()).toBe(true)
    expect(wrapper.find('.particle-canvas').exists()).toBe(true)
  })

  it('accepts custom particle configuration props', () => {
    wrapper = mount(ParticleBackground, {
      props: {
        count: 100,
        color: '#FF0000',
        speed: 1.0,
        size: 3,
        connectionDistance: 200,
      },
    })

    expect(wrapper.props('count')).toBe(100)
    expect(wrapper.props('color')).toBe('#FF0000')
    expect(wrapper.props('speed')).toBe(1.0)
    expect(wrapper.props('size')).toBe(3)
    expect(wrapper.props('connectionDistance')).toBe(200)
  })

  it('uses default props when not provided', () => {
    wrapper = mount(ParticleBackground)

    expect(wrapper.props('count')).toBe(80)
    expect(wrapper.props('color')).toBe('#00D9FF')
    expect(wrapper.props('speed')).toBe(0.5)
    expect(wrapper.props('size')).toBe(2)
    expect(wrapper.props('connectionDistance')).toBe(150)
  })

  it('粒子画布应该覆盖视口、持续绘制并响应尺寸变化', () => {
    // 组件职责是动态粒子背景（V3 设计属性 1），不要求粒子层的内联视差变换。
    wrapper = mount(ParticleBackground, { props: { count: 2 } })
    const canvas = wrapper.get('canvas').element as HTMLCanvasElement

    expect([canvas.width, canvas.height]).toEqual([1024, 768])
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 1024, 768)
    expect(context.arc).toHaveBeenCalledTimes(2)
    expect(frames.size).toBe(1)
    const initialX = context.arc.mock.calls[0][0]

    const [frameId, callback] = frames.entries().next().value!
    frames.delete(frameId)
    callback(16)
    expect(context.arc).toHaveBeenCalledTimes(4)
    expect(context.arc.mock.calls[2][0]).not.toBe(initialX)
    expect(frames.size).toBe(1)

    vi.stubGlobal('innerWidth', 640)
    vi.stubGlobal('innerHeight', 480)
    window.dispatchEvent(new Event('resize'))
    expect([canvas.width, canvas.height]).toEqual([640, 480])

    const [resizedFrameId, resizedCallback] = frames.entries().next().value!
    frames.delete(resizedFrameId)
    resizedCallback(32)
    expect(context.clearRect).toHaveBeenLastCalledWith(0, 0, 640, 480)
    expect(context.arc).toHaveBeenCalledTimes(6)
    expect(frames.size).toBe(1)
  })

  it('has proper structure with background and canvas elements', () => {
    wrapper = mount(ParticleBackground)
    const background = wrapper.find('.particle-background')

    expect(background.exists()).toBe(true)
    expect(background.classes()).toContain('particle-background')

    // Check that both gradient and canvas are children
    const gradient = background.find('.gradient-background')
    const canvas = background.find('.particle-canvas')

    expect(gradient.exists()).toBe(true)
    expect(canvas.exists()).toBe(true)
  })

  it('卸载应该取消待执行动画并移除窗口事件监听', () => {
    const addListener = vi.spyOn(window, 'addEventListener')
    const removeListener = vi.spyOn(window, 'removeEventListener')
    wrapper = mount(ParticleBackground)
    const pendingFrameId = frames.keys().next().value!
    const drawCount = context.clearRect.mock.calls.length
    const registered = addListener.mock.calls.filter(([event]) =>
      ['resize', 'mousedown', 'mouseup', 'mousemove', 'mouseleave'].includes(event)
    )
    expect(registered).toHaveLength(5)

    wrapper.unmount()
    wrapper = undefined
    expect(cancelAnimationFrame).toHaveBeenCalledWith(pendingFrameId)
    expect(frames.size).toBe(0)
    for (const [event, listener] of registered) {
      expect(removeListener).toHaveBeenCalledWith(event, listener)
    }
    window.dispatchEvent(new Event('resize'))
    expect(context.clearRect).toHaveBeenCalledTimes(drawCount)
  })
})
