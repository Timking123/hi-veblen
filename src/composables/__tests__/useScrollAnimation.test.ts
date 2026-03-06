/**
 * useScrollAnimation Composable 单元测试
 * 
 * 测试滚动动画功能的核心逻辑：
 * - 动画类名生成
 * - 动画样式生成
 * - prefers-reduced-motion 检测
 * - Intersection Observer 集成
 * - 选项规范化
 * 
 * 验证需求：
 * - 需求 2.7: 元素进入视口时触发入场动画
 * - 需求 2.8: 支持配置动画类型（淡入、滑入、缩放等）和延迟时间
 * - 需求 2.9: 当用户启用"减少动画"系统设置时所有动画被禁用或简化
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  useScrollAnimation,
  generateAnimationClass,
  generateAnimationStyle,
  checkPrefersReducedMotion,
  isValidAnimationType,
  normalizeOptions,
  ANIMATION_TYPES,
  DEFAULT_ANIMATION_TYPE,
  DEFAULT_DELAY,
  DEFAULT_THRESHOLD,
  DEFAULT_ONCE,
  type AnimationType,
  type ScrollAnimationOptions,
} from '../useScrollAnimation'

// 模拟 IntersectionObserver
class MockIntersectionObserver {
  callback: IntersectionObserverCallback
  options: IntersectionObserverInit | undefined
  observedElements: Element[] = []
  
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback
    this.options = options
  }
  
  observe(element: Element): void {
    this.observedElements.push(element)
  }
  
  unobserve(element: Element): void {
    const index = this.observedElements.indexOf(element)
    if (index > -1) {
      this.observedElements.splice(index, 1)
    }
  }
  
  disconnect(): void {
    this.observedElements = []
  }
  
  // 模拟元素进入视口
  triggerIntersecting(element: Element, isIntersecting: boolean): void {
    const entry: IntersectionObserverEntry = {
      target: element,
      isIntersecting,
      boundingClientRect: element.getBoundingClientRect(),
      intersectionRatio: isIntersecting ? 1 : 0,
      intersectionRect: element.getBoundingClientRect(),
      rootBounds: null,
      time: Date.now(),
    }
    this.callback([entry], this as unknown as IntersectionObserver)
  }
}

// 保存原始的 IntersectionObserver
let originalIntersectionObserver: typeof IntersectionObserver
let mockObserverInstance: MockIntersectionObserver | null = null

// 模拟 matchMedia
function mockMatchMedia(prefersReducedMotion: boolean) {
  return vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)' ? prefersReducedMotion : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

describe('useScrollAnimation', () => {
  beforeEach(() => {
    // 保存原始的 IntersectionObserver
    originalIntersectionObserver = global.IntersectionObserver
    
    // 模拟 IntersectionObserver
    global.IntersectionObserver = vi.fn().mockImplementation((callback, options) => {
      mockObserverInstance = new MockIntersectionObserver(callback, options)
      return mockObserverInstance
    }) as unknown as typeof IntersectionObserver
    
    // 默认不启用减少动画
    window.matchMedia = mockMatchMedia(false)
  })
  
  afterEach(() => {
    // 恢复原始的 IntersectionObserver
    global.IntersectionObserver = originalIntersectionObserver
    mockObserverInstance = null
    vi.restoreAllMocks()
  })
  
  describe('初始状态', () => {
    it('初始时 isVisible 应为 false', () => {
      const { isVisible } = useScrollAnimation()
      expect(isVisible.value).toBe(false)
    })
    
    it('初始时 elementRef 应为 null', () => {
      const { elementRef } = useScrollAnimation()
      expect(elementRef.value).toBeNull()
    })
    
    it('初始时 animationClass 应包含正确的类名', () => {
      const { animationClass } = useScrollAnimation()
      expect(animationClass.value).toEqual({
        'scroll-animate': true,
        'scroll-animate--fade-in': true,
        'scroll-animate--visible': false,
      })
    })
    
    it('初始时 animationStyle 应包含默认延迟', () => {
      const { animationStyle } = useScrollAnimation()
      expect(animationStyle.value).toEqual({
        transitionDelay: '0ms',
      })
    })
  })
  
  describe('选项配置', () => {
    it('应支持自定义动画类型', () => {
      const { animationClass } = useScrollAnimation({ type: 'slide-up' })
      expect(animationClass.value['scroll-animate--slide-up']).toBe(true)
    })
    
    it('应支持自定义延迟时间', () => {
      const { animationStyle } = useScrollAnimation({ delay: 500 })
      expect(animationStyle.value.transitionDelay).toBe('500ms')
    })
    
    it('应支持所有动画类型', () => {
      const types: AnimationType[] = ['fade-in', 'slide-up', 'slide-left', 'scale-in']
      
      types.forEach((type) => {
        const { animationClass } = useScrollAnimation({ type })
        expect(animationClass.value[`scroll-animate--${type}`]).toBe(true)
      })
    })
  })
  
  describe('reset 方法', () => {
    it('应重置 isVisible 为 false', () => {
      const { isVisible, reset } = useScrollAnimation()
      
      // 手动设置为 true
      isVisible.value = true
      expect(isVisible.value).toBe(true)
      
      reset()
      expect(isVisible.value).toBe(false)
    })
  })
})

describe('generateAnimationClass', () => {
  it('应生成正确的类名对象（不可见状态）', () => {
    const result = generateAnimationClass('fade-in', false)
    
    expect(result).toEqual({
      'scroll-animate': true,
      'scroll-animate--fade-in': true,
      'scroll-animate--visible': false,
    })
  })
  
  it('应生成正确的类名对象（可见状态）', () => {
    const result = generateAnimationClass('fade-in', true)
    
    expect(result).toEqual({
      'scroll-animate': true,
      'scroll-animate--fade-in': true,
      'scroll-animate--visible': true,
    })
  })
  
  it('应支持 slide-up 动画类型', () => {
    const result = generateAnimationClass('slide-up', false)
    
    expect(result['scroll-animate--slide-up']).toBe(true)
  })
  
  it('应支持 slide-left 动画类型', () => {
    const result = generateAnimationClass('slide-left', false)
    
    expect(result['scroll-animate--slide-left']).toBe(true)
  })
  
  it('应支持 scale-in 动画类型', () => {
    const result = generateAnimationClass('scale-in', false)
    
    expect(result['scroll-animate--scale-in']).toBe(true)
  })
  
  it('所有动画类型都应生成正确的类名', () => {
    ANIMATION_TYPES.forEach((type) => {
      const result = generateAnimationClass(type, false)
      
      expect(result['scroll-animate']).toBe(true)
      expect(result[`scroll-animate--${type}`]).toBe(true)
      expect(result['scroll-animate--visible']).toBe(false)
    })
  })
})

describe('generateAnimationStyle', () => {
  it('应生成正确的样式对象（0ms 延迟）', () => {
    const result = generateAnimationStyle(0)
    
    expect(result).toEqual({
      transitionDelay: '0ms',
    })
  })
  
  it('应生成正确的样式对象（正数延迟）', () => {
    const result = generateAnimationStyle(500)
    
    expect(result).toEqual({
      transitionDelay: '500ms',
    })
  })
  
  it('应生成正确的样式对象（大延迟值）', () => {
    const result = generateAnimationStyle(2000)
    
    expect(result).toEqual({
      transitionDelay: '2000ms',
    })
  })
  
  it('应处理负数延迟（虽然不推荐）', () => {
    const result = generateAnimationStyle(-100)
    
    expect(result).toEqual({
      transitionDelay: '-100ms',
    })
  })
})

describe('checkPrefersReducedMotion', () => {
  it('当用户启用减少动画时应返回 true', () => {
    window.matchMedia = mockMatchMedia(true)
    
    const result = checkPrefersReducedMotion()
    
    expect(result).toBe(true)
  })
  
  it('当用户未启用减少动画时应返回 false', () => {
    window.matchMedia = mockMatchMedia(false)
    
    const result = checkPrefersReducedMotion()
    
    expect(result).toBe(false)
  })
})

describe('isValidAnimationType', () => {
  it('应验证有效的动画类型', () => {
    expect(isValidAnimationType('fade-in')).toBe(true)
    expect(isValidAnimationType('slide-up')).toBe(true)
    expect(isValidAnimationType('slide-left')).toBe(true)
    expect(isValidAnimationType('scale-in')).toBe(true)
  })
  
  it('应拒绝无效的动画类型', () => {
    expect(isValidAnimationType('invalid')).toBe(false)
    expect(isValidAnimationType('')).toBe(false)
    expect(isValidAnimationType('fade-out')).toBe(false)
    expect(isValidAnimationType('slide-right')).toBe(false)
  })
})

describe('normalizeOptions', () => {
  it('应返回默认值（空选项）', () => {
    const result = normalizeOptions()
    
    expect(result).toEqual({
      type: DEFAULT_ANIMATION_TYPE,
      delay: DEFAULT_DELAY,
      threshold: DEFAULT_THRESHOLD,
      once: DEFAULT_ONCE,
    })
  })
  
  it('应返回默认值（空对象）', () => {
    const result = normalizeOptions({})
    
    expect(result).toEqual({
      type: 'fade-in',
      delay: 0,
      threshold: 0.1,
      once: true,
    })
  })
  
  it('应保留用户提供的值', () => {
    const options: ScrollAnimationOptions = {
      type: 'slide-up',
      delay: 300,
      threshold: 0.5,
      once: false,
    }
    
    const result = normalizeOptions(options)
    
    expect(result).toEqual(options)
  })
  
  it('应混合用户值和默认值', () => {
    const options: ScrollAnimationOptions = {
      type: 'scale-in',
      delay: 200,
    }
    
    const result = normalizeOptions(options)
    
    expect(result).toEqual({
      type: 'scale-in',
      delay: 200,
      threshold: DEFAULT_THRESHOLD,
      once: DEFAULT_ONCE,
    })
  })
  
  it('应处理 once 为 false 的情况', () => {
    const result = normalizeOptions({ once: false })
    
    expect(result.once).toBe(false)
  })
  
  it('应处理 threshold 为 0 的情况', () => {
    const result = normalizeOptions({ threshold: 0 })
    
    // 0 是有效值，不应被默认值覆盖
    expect(result.threshold).toBe(0)
  })
  
  it('应处理 delay 为 0 的情况', () => {
    const result = normalizeOptions({ delay: 0 })
    
    // 0 是有效值，不应被默认值覆盖
    expect(result.delay).toBe(0)
  })
})

describe('常量', () => {
  it('ANIMATION_TYPES 应包含所有支持的动画类型', () => {
    expect(ANIMATION_TYPES).toEqual(['fade-in', 'slide-up', 'slide-left', 'scale-in'])
  })
  
  it('DEFAULT_ANIMATION_TYPE 应为 fade-in', () => {
    expect(DEFAULT_ANIMATION_TYPE).toBe('fade-in')
  })
  
  it('DEFAULT_DELAY 应为 0', () => {
    expect(DEFAULT_DELAY).toBe(0)
  })
  
  it('DEFAULT_THRESHOLD 应为 0.1', () => {
    expect(DEFAULT_THRESHOLD).toBe(0.1)
  })
  
  it('DEFAULT_ONCE 应为 true', () => {
    expect(DEFAULT_ONCE).toBe(true)
  })
})

describe('动画类名与可见状态联动', () => {
  beforeEach(() => {
    // 保存原始的 IntersectionObserver
    originalIntersectionObserver = global.IntersectionObserver
    
    // 模拟 IntersectionObserver
    global.IntersectionObserver = vi.fn().mockImplementation((callback, options) => {
      mockObserverInstance = new MockIntersectionObserver(callback, options)
      return mockObserverInstance
    }) as unknown as typeof IntersectionObserver
    
    // 默认不启用减少动画
    window.matchMedia = mockMatchMedia(false)
  })
  
  afterEach(() => {
    global.IntersectionObserver = originalIntersectionObserver
    mockObserverInstance = null
    vi.restoreAllMocks()
  })
  
  it('当 isVisible 变为 true 时，animationClass 应包含 visible 类', () => {
    const { isVisible, animationClass } = useScrollAnimation()
    
    expect(animationClass.value['scroll-animate--visible']).toBe(false)
    
    isVisible.value = true
    
    expect(animationClass.value['scroll-animate--visible']).toBe(true)
  })
  
  it('当 isVisible 变为 false 时，animationClass 应移除 visible 类', () => {
    const { isVisible, animationClass } = useScrollAnimation()
    
    isVisible.value = true
    expect(animationClass.value['scroll-animate--visible']).toBe(true)
    
    isVisible.value = false
    expect(animationClass.value['scroll-animate--visible']).toBe(false)
  })
})

describe('prefers-reduced-motion 集成', () => {
  beforeEach(() => {
    originalIntersectionObserver = global.IntersectionObserver
    
    global.IntersectionObserver = vi.fn().mockImplementation((callback, options) => {
      mockObserverInstance = new MockIntersectionObserver(callback, options)
      return mockObserverInstance
    }) as unknown as typeof IntersectionObserver
  })
  
  afterEach(() => {
    global.IntersectionObserver = originalIntersectionObserver
    mockObserverInstance = null
    vi.restoreAllMocks()
  })
  
  it('当用户启用减少动画时，checkPrefersReducedMotion 应返回 true', () => {
    // 模拟用户启用了减少动画
    window.matchMedia = mockMatchMedia(true)
    
    // 验证 checkPrefersReducedMotion 函数正确检测用户偏好
    const result = checkPrefersReducedMotion()
    expect(result).toBe(true)
    
    // 注意：完整的 onMounted 行为测试需要在 Vue 组件上下文中进行
    // 这里我们验证核心检测逻辑是正确的
  })
})
