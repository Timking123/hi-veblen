/**
 * LazyImage 组件测试
 * 测试图片懒加载功能，包括 Intersection Observer API 和骨架屏占位符
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import LazyImage from '../LazyImage.vue'

// 模拟 IntersectionObserver
class MockIntersectionObserver {
  callback: IntersectionObserverCallback
  elements: Set<Element> = new Set()
  
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }
  
  observe(element: Element) {
    this.elements.add(element)
  }
  
  unobserve(element: Element) {
    this.elements.delete(element)
  }
  
  disconnect() {
    this.elements.clear()
  }
  
  // 模拟元素进入视口
  triggerIntersect(isIntersecting: boolean = true) {
    const entries: IntersectionObserverEntry[] = Array.from(this.elements).map(target => ({
      target,
      isIntersecting,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRatio: isIntersecting ? 1 : 0,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      time: Date.now(),
    }))
    this.callback(entries, this as unknown as IntersectionObserver)
  }
}

let mockObserver: MockIntersectionObserver | null = null

describe('LazyImage 组件', () => {
  beforeEach(() => {
    // 设置 IntersectionObserver 模拟
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) {
        mockObserver = new MockIntersectionObserver(callback)
        return mockObserver
      }
    })
  })
  
  afterEach(() => {
    vi.unstubAllGlobals()
    mockObserver = null
  })
  
  describe('基础渲染', () => {
    it('应该渲染骨架屏占位符', () => {
      const wrapper = mount(LazyImage, {
        props: {
          src: 'https://example.com/image.jpg',
          alt: '测试图片',
        },
      })
      
      // 初始状态应该显示骨架屏
      expect(wrapper.find('.lazy-image-skeleton').exists()).toBe(true)
      expect(wrapper.classes()).toContain('is-idle')
    })
    
    it('应该正确传递 alt 属性', async () => {
      const wrapper = mount(LazyImage, {
        props: {
          src: 'https://example.com/image.jpg',
          alt: '测试图片描述',
        },
      })
      
      // 触发进入视口
      mockObserver?.triggerIntersect(true)
      await flushPromises()
      
      const img = wrapper.find('img')
      expect(img.exists()).toBe(true)
      expect(img.attributes('alt')).toBe('测试图片描述')
    })
  })
  
  describe('懒加载功能', () => {
    it('在进入视口前不应该加载图片', () => {
      const wrapper = mount(LazyImage, {
        props: {
          src: 'https://example.com/image.jpg',
          alt: '测试图片',
        },
      })
      
      // 图片元素不应该存在
      expect(wrapper.find('img').exists()).toBe(false)
    })
    
    it('进入视口后应该开始加载图片', async () => {
      const wrapper = mount(LazyImage, {
        props: {
          src: 'https://example.com/image.jpg',
          alt: '测试图片',
        },
      })
      
      // 模拟进入视口
      mockObserver?.triggerIntersect(true)
      await flushPromises()
      
      // 图片元素应该存在
      expect(wrapper.find('img').exists()).toBe(true)
      expect(wrapper.classes()).toContain('is-loading')
    })
  })
  
  describe('加载状态', () => {
    it('图片加载成功后应该切换到 loaded 状态', async () => {
      const wrapper = mount(LazyImage, {
        props: {
          src: 'https://example.com/image.jpg',
          alt: '测试图片',
        },
      })
      
      // 进入视口
      mockObserver?.triggerIntersect(true)
      await flushPromises()
      
      // 触发图片加载成功
      const img = wrapper.find('img')
      await img.trigger('load')
      
      expect(wrapper.classes()).toContain('is-loaded')
      expect(wrapper.emitted('load')).toBeTruthy()
      expect(wrapper.emitted('statusChange')).toContainEqual(['loaded'])
    })
    
    it('图片加载失败后应该尝试加载备用图', async () => {
      const fallbackSrc = 'https://example.com/fallback.jpg'
      const wrapper = mount(LazyImage, {
        props: {
          src: 'https://example.com/image.jpg',
          alt: '测试图片',
          fallback: fallbackSrc,
        },
      })
      
      // 进入视口
      mockObserver?.triggerIntersect(true)
      await flushPromises()
      
      // 触发图片加载失败
      const img = wrapper.find('img')
      await img.trigger('error')
      await flushPromises()
      
      // 应该切换到备用图
      expect(img.attributes('src')).toBe(fallbackSrc)
    })
    
    it('备用图也加载失败后应该切换到 error 状态', async () => {
      const fallbackSrc = 'https://example.com/fallback.jpg'
      const wrapper = mount(LazyImage, {
        props: {
          src: 'https://example.com/image.jpg',
          alt: '测试图片',
          fallback: fallbackSrc,
        },
      })
      
      // 进入视口
      mockObserver?.triggerIntersect(true)
      await flushPromises()
      
      const img = wrapper.find('img')
      
      // 第一次加载失败（原图）
      await img.trigger('error')
      await flushPromises()
      
      // 第二次加载失败（备用图）
      await img.trigger('error')
      await flushPromises()
      
      expect(wrapper.classes()).toContain('is-error')
      expect(wrapper.emitted('error')).toBeTruthy()
    })
  })
  
  describe('自定义样式', () => {
    it('应该支持自定义宽高', async () => {
      const wrapper = mount(LazyImage, {
        props: {
          src: 'https://example.com/image.jpg',
          alt: '测试图片',
          width: 200,
          height: 150,
        },
      })
      
      // 进入视口
      mockObserver?.triggerIntersect(true)
      await flushPromises()
      
      const img = wrapper.find('img')
      const style = img.attributes('style')
      expect(style).toContain('width: 200px')
      expect(style).toContain('height: 150px')
    })
    
    it('应该支持自定义 objectFit', async () => {
      const wrapper = mount(LazyImage, {
        props: {
          src: 'https://example.com/image.jpg',
          alt: '测试图片',
          objectFit: 'contain',
        },
      })
      
      // 进入视口
      mockObserver?.triggerIntersect(true)
      await flushPromises()
      
      const img = wrapper.find('img')
      expect(img.attributes('style')).toContain('object-fit: contain')
    })
    
    it('应该支持自定义图片类名', async () => {
      const wrapper = mount(LazyImage, {
        props: {
          src: 'https://example.com/image.jpg',
          alt: '测试图片',
          imgClass: 'custom-image-class',
        },
      })
      
      // 进入视口
      mockObserver?.triggerIntersect(true)
      await flushPromises()
      
      const img = wrapper.find('img')
      expect(img.classes()).toContain('custom-image-class')
    })
  })
  
  describe('错误状态显示', () => {
    it('启用 showErrorState 时应该显示错误信息', async () => {
      const wrapper = mount(LazyImage, {
        props: {
          src: 'https://example.com/image.jpg',
          alt: '测试图片',
          fallback: '', // 空备用图，直接进入错误状态
          showErrorState: true,
          errorText: '自定义错误信息',
        },
      })
      
      // 进入视口
      mockObserver?.triggerIntersect(true)
      await flushPromises()
      
      // 触发加载失败
      const img = wrapper.find('img')
      await img.trigger('error')
      await flushPromises()
      
      expect(wrapper.find('.lazy-image-error').exists()).toBe(true)
      expect(wrapper.find('.error-text').text()).toBe('自定义错误信息')
    })
  })
  
  describe('事件触发', () => {
    it('应该触发 statusChange 事件', async () => {
      const wrapper = mount(LazyImage, {
        props: {
          src: 'https://example.com/image.jpg',
          alt: '测试图片',
        },
      })
      
      // 进入视口 -> loading
      mockObserver?.triggerIntersect(true)
      await flushPromises()
      
      expect(wrapper.emitted('statusChange')).toContainEqual(['loading'])
      
      // 加载成功 -> loaded
      const img = wrapper.find('img')
      await img.trigger('load')
      
      expect(wrapper.emitted('statusChange')).toContainEqual(['loaded'])
    })
  })
})
