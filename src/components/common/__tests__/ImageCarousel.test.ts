/**
 * ImageCarousel 组件单元测试
 * 
 * 测试 ImageCarousel 组件的基本功能：
 * - 图片渲染
 * - 左右切换功能
 * - 自动播放模式
 * - 指示器和箭头控件
 * - 键盘导航
 * 
 * 验证需求：
 * - 需求 5.3: Image_Carousel 支持左右滑动或点击箭头切换项目截图
 * - 需求 5.4: Image_Carousel 支持自动播放和手动控制两种模式
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import ImageCarousel, { calculateNextIndex, calculatePrevIndex } from '../ImageCarousel.vue'

// 模拟 LazyImage 组件
vi.mock('../LazyImage.vue', () => ({
  default: {
    name: 'LazyImage',
    props: ['src', 'alt', 'objectFit', 'width', 'height'],
    template: '<img :src="src" :alt="alt" class="lazy-image" />',
  },
}))

// 模拟 useGesture composable
vi.mock('@/composables/useGesture', () => ({
  useGesture: vi.fn(() => ({
    elementRef: { value: null },
    isSwiping: { value: false },
  })),
}))

describe('ImageCarousel 组件', () => {
  const mockImages = [
    '/images/project1.jpg',
    '/images/project2.jpg',
    '/images/project3.jpg',
  ]

  let wrapper: VueWrapper

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('基本渲染', () => {
    it('应该正确渲染图片', () => {
      wrapper = mount(ImageCarousel, {
        props: { images: mockImages },
      })

      const slides = wrapper.findAll('.carousel-slide')
      expect(slides).toHaveLength(3)
    })

    it('应该默认显示第一张图片', () => {
      wrapper = mount(ImageCarousel, {
        props: { images: mockImages },
      })

      const firstSlide = wrapper.find('.carousel-slide.is-active')
      expect(firstSlide.exists()).toBe(true)
    })

    it('空图片数组时应该正常渲染', () => {
      wrapper = mount(ImageCarousel, {
        props: { images: [] },
      })

      const slides = wrapper.findAll('.carousel-slide')
      expect(slides).toHaveLength(0)
    })

    it('单张图片时不应显示箭头和指示器', () => {
      wrapper = mount(ImageCarousel, {
        props: { images: ['/images/single.jpg'] },
      })

      const arrows = wrapper.findAll('.carousel-arrow')
      const indicators = wrapper.findAll('.carousel-indicator')
      expect(arrows).toHaveLength(0)
      expect(indicators).toHaveLength(0)
    })
  })

  describe('箭头控件', () => {
    it('默认应该显示箭头', () => {
      wrapper = mount(ImageCarousel, {
        props: { images: mockImages },
      })

      const prevArrow = wrapper.find('.carousel-arrow--prev')
      const nextArrow = wrapper.find('.carousel-arrow--next')
      expect(prevArrow.exists()).toBe(true)
      expect(nextArrow.exists()).toBe(true)
    })

    it('showArrows=false 时不应显示箭头', () => {
      wrapper = mount(ImageCarousel, {
        props: { images: mockImages, showArrows: false },
      })

      const arrows = wrapper.findAll('.carousel-arrow')
      expect(arrows).toHaveLength(0)
    })

    it('点击下一张箭头应该切换到下一张图片', async () => {
      wrapper = mount(ImageCarousel, {
        props: { images: mockImages },
      })

      const nextArrow = wrapper.find('.carousel-arrow--next')
      await nextArrow.trigger('click')

      expect(wrapper.vm.currentIndex).toBe(1)
    })

    it('点击上一张箭头应该切换到上一张图片', async () => {
      wrapper = mount(ImageCarousel, {
        props: { images: mockImages },
      })

      // 先切换到第二张
      await wrapper.find('.carousel-arrow--next').trigger('click')
      expect(wrapper.vm.currentIndex).toBe(1)

      // 再切换回第一张
      await wrapper.find('.carousel-arrow--prev').trigger('click')
      expect(wrapper.vm.currentIndex).toBe(0)
    })

    it('在第一张点击上一张应该循环到最后一张', async () => {
      wrapper = mount(ImageCarousel, {
        props: { images: mockImages },
      })

      const prevArrow = wrapper.find('.carousel-arrow--prev')
      await prevArrow.trigger('click')

      expect(wrapper.vm.currentIndex).toBe(2)
    })

    it('在最后一张点击下一张应该循环到第一张', async () => {
      wrapper = mount(ImageCarousel, {
        props: { images: mockImages },
      })

      // 切换到最后一张
      await wrapper.find('.carousel-arrow--next').trigger('click')
      await wrapper.find('.carousel-arrow--next').trigger('click')
      expect(wrapper.vm.currentIndex).toBe(2)

      // 再点击下一张
      await wrapper.find('.carousel-arrow--next').trigger('click')
      expect(wrapper.vm.currentIndex).toBe(0)
    })
  })

  describe('指示器', () => {
    it('默认应该显示指示器', () => {
      wrapper = mount(ImageCarousel, {
        props: { images: mockImages },
      })

      const indicators = wrapper.findAll('.carousel-indicator')
      expect(indicators).toHaveLength(3)
    })

    it('showIndicators=false 时不应显示指示器', () => {
      wrapper = mount(ImageCarousel, {
        props: { images: mockImages, showIndicators: false },
      })

      const indicators = wrapper.findAll('.carousel-indicator')
      expect(indicators).toHaveLength(0)
    })

    it('当前图片的指示器应该高亮', () => {
      wrapper = mount(ImageCarousel, {
        props: { images: mockImages },
      })

      const activeIndicator = wrapper.find('.carousel-indicator.is-active')
      expect(activeIndicator.exists()).toBe(true)
    })

    it('点击指示器应该跳转到对应图片', async () => {
      wrapper = mount(ImageCarousel, {
        props: { images: mockImages },
      })

      const indicators = wrapper.findAll('.carousel-indicator')
      await indicators[2].trigger('click')

      expect(wrapper.vm.currentIndex).toBe(2)
    })
  })

  describe('自动播放', () => {
    it('autoPlay=true 时应该自动切换图片', async () => {
      wrapper = mount(ImageCarousel, {
        props: { images: mockImages, autoPlay: true, interval: 1000 },
      })

      expect(wrapper.vm.currentIndex).toBe(0)

      // 等待自动播放
      vi.advanceTimersByTime(1000)
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.currentIndex).toBe(1)

      vi.advanceTimersByTime(1000)
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.currentIndex).toBe(2)
    })

    it('autoPlay=false 时不应自动切换图片', async () => {
      wrapper = mount(ImageCarousel, {
        props: { images: mockImages, autoPlay: false },
      })

      expect(wrapper.vm.currentIndex).toBe(0)

      vi.advanceTimersByTime(5000)
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.currentIndex).toBe(0)
    })

    it('应该使用自定义的 interval', async () => {
      wrapper = mount(ImageCarousel, {
        props: { images: mockImages, autoPlay: true, interval: 2000 },
      })

      expect(wrapper.vm.currentIndex).toBe(0)

      // 1秒后不应切换
      vi.advanceTimersByTime(1000)
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.currentIndex).toBe(0)

      // 2秒后应该切换
      vi.advanceTimersByTime(1000)
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.currentIndex).toBe(1)
    })
  })

  describe('键盘导航', () => {
    it('按右方向键应该切换到下一张', async () => {
      wrapper = mount(ImageCarousel, {
        props: { images: mockImages },
      })

      await wrapper.trigger('keydown', { key: 'ArrowRight' })
      expect(wrapper.vm.currentIndex).toBe(1)
    })

    it('按左方向键应该切换到上一张', async () => {
      wrapper = mount(ImageCarousel, {
        props: { images: mockImages },
      })

      // 先切换到第二张
      await wrapper.trigger('keydown', { key: 'ArrowRight' })
      expect(wrapper.vm.currentIndex).toBe(1)

      // 再按左方向键
      await wrapper.trigger('keydown', { key: 'ArrowLeft' })
      expect(wrapper.vm.currentIndex).toBe(0)
    })

    it('按 Home 键应该跳转到第一张', async () => {
      wrapper = mount(ImageCarousel, {
        props: { images: mockImages },
      })

      // 先切换到最后一张
      await wrapper.trigger('keydown', { key: 'ArrowRight' })
      await wrapper.trigger('keydown', { key: 'ArrowRight' })
      expect(wrapper.vm.currentIndex).toBe(2)

      // 按 Home 键
      await wrapper.trigger('keydown', { key: 'Home' })
      expect(wrapper.vm.currentIndex).toBe(0)
    })

    it('按 End 键应该跳转到最后一张', async () => {
      wrapper = mount(ImageCarousel, {
        props: { images: mockImages },
      })

      await wrapper.trigger('keydown', { key: 'End' })
      expect(wrapper.vm.currentIndex).toBe(2)
    })
  })

  describe('事件发射', () => {
    it('切换图片时应该发射 change 事件', async () => {
      wrapper = mount(ImageCarousel, {
        props: { images: mockImages },
      })

      await wrapper.find('.carousel-arrow--next').trigger('click')

      expect(wrapper.emitted('change')).toBeTruthy()
      expect(wrapper.emitted('change')![0]).toEqual([1])
    })

    it('点击指示器时应该发射 change 事件', async () => {
      wrapper = mount(ImageCarousel, {
        props: { images: mockImages },
      })

      const indicators = wrapper.findAll('.carousel-indicator')
      await indicators[2].trigger('click')

      expect(wrapper.emitted('change')).toBeTruthy()
      expect(wrapper.emitted('change')![0]).toEqual([2])
    })
  })

  describe('暴露的方法', () => {
    it('应该暴露 next 方法', async () => {
      wrapper = mount(ImageCarousel, {
        props: { images: mockImages },
      })

      wrapper.vm.next()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.currentIndex).toBe(1)
    })

    it('应该暴露 prev 方法', async () => {
      wrapper = mount(ImageCarousel, {
        props: { images: mockImages },
      })

      wrapper.vm.prev()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.currentIndex).toBe(2)
    })

    it('应该暴露 goTo 方法', async () => {
      wrapper = mount(ImageCarousel, {
        props: { images: mockImages },
      })

      wrapper.vm.goTo(2)
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.currentIndex).toBe(2)
    })

    it('goTo 方法应该忽略无效索引', async () => {
      wrapper = mount(ImageCarousel, {
        props: { images: mockImages },
      })

      wrapper.vm.goTo(-1)
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.currentIndex).toBe(0)

      wrapper.vm.goTo(10)
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.currentIndex).toBe(0)
    })
  })
})

describe('索引计算函数', () => {
  describe('calculateNextIndex', () => {
    it('应该返回下一个索引', () => {
      expect(calculateNextIndex(0, 3)).toBe(1)
      expect(calculateNextIndex(1, 3)).toBe(2)
    })

    it('在最后一个索引时应该循环到 0', () => {
      expect(calculateNextIndex(2, 3)).toBe(0)
    })

    it('总数为 0 时应该返回 0', () => {
      expect(calculateNextIndex(0, 0)).toBe(0)
    })

    it('总数为 1 时应该返回 0', () => {
      expect(calculateNextIndex(0, 1)).toBe(0)
    })
  })

  describe('calculatePrevIndex', () => {
    it('应该返回上一个索引', () => {
      expect(calculatePrevIndex(2, 3)).toBe(1)
      expect(calculatePrevIndex(1, 3)).toBe(0)
    })

    it('在第一个索引时应该循环到最后', () => {
      expect(calculatePrevIndex(0, 3)).toBe(2)
    })

    it('总数为 0 时应该返回 0', () => {
      expect(calculatePrevIndex(0, 0)).toBe(0)
    })

    it('总数为 1 时应该返回 0', () => {
      expect(calculatePrevIndex(0, 1)).toBe(0)
    })
  })
})
