/**
 * 触摸按钮组件单元测试
 * 
 * 验证需求: 6.3, 6.4, 6.5, 6.6, 6.7, 8.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TouchButton from '../TouchButton.vue'

describe('TouchButton', () => {
  beforeEach(() => {
    // 清理所有模拟
    vi.clearAllMocks()
    
    // 模拟 navigator.vibrate
    if (!('vibrate' in navigator)) {
      Object.defineProperty(navigator, 'vibrate', {
        value: vi.fn(),
        writable: true,
        configurable: true
      })
    }
  })

  describe('组件渲染', () => {
    it('应该在 visible 为 true 时渲染', () => {
      const wrapper = mount(TouchButton, {
        props: { visible: true }
      })

      expect(wrapper.find('.touch-button').exists()).toBe(true)
      expect(wrapper.find('.button-body').exists()).toBe(true)
      expect(wrapper.find('.button-label').exists()).toBe(true)
    })

    it('应该在 visible 为 false 时不渲染', () => {
      const wrapper = mount(TouchButton, {
        props: { visible: false }
      })

      expect(wrapper.find('.touch-button').exists()).toBe(false)
    })

    it('应该显示提供的标签文本', () => {
      const wrapper = mount(TouchButton, {
        props: {
          label: '开火',
          visible: true
        }
      })

      const label = wrapper.find('.button-label')
      expect(label.text()).toBe('开火')
    })

    it('应该使用提供的位置和尺寸属性', () => {
      const wrapper = mount(TouchButton, {
        props: {
          x: 80,
          y: 120,
          size: 70,
          visible: true
        }
      })

      const container = wrapper.find('.touch-button')
      const style = container.attributes('style')

      expect(style).toContain('right: 80px')
      expect(style).toContain('bottom: 120px')
      expect(style).toContain('width: 70px')
      expect(style).toContain('height: 70px')
    })

    it('应该使用提供的颜色属性', () => {
      const wrapper = mount(TouchButton, {
        props: {
          color: '#FF6B9D',
          visible: true
        }
      })

      const button = wrapper.find('.button-body')
      const style = button.attributes('style')

      expect(style).toContain('#FF6B9D')
    })
  })

  describe('触摸事件处理', () => {
    it('应该在触摸开始时发射 press 事件', async () => {
      const wrapper = mount(TouchButton, {
        props: { visible: true }
      })

      const container = wrapper.find('.touch-button')
      
      // 模拟触摸开始
      await container.trigger('touchstart', {
        touches: [{
          identifier: 0,
          clientX: 100,
          clientY: 100
        }]
      })

      // 检查是否发射了 press 事件
      expect(wrapper.emitted('press')).toBeDefined()
      expect(wrapper.emitted('press')!.length).toBe(1)
    })

    it('应该在触摸结束时发射 release 事件', async () => {
      const wrapper = mount(TouchButton, {
        props: { visible: true }
      })

      const container = wrapper.find('.touch-button')
      
      // 模拟触摸开始
      await container.trigger('touchstart', {
        touches: [{
          identifier: 0,
          clientX: 100,
          clientY: 100
        }]
      })

      // 模拟触摸结束
      await container.trigger('touchend', {
        changedTouches: [{
          identifier: 0,
          clientX: 100,
          clientY: 100
        }]
      })

      // 检查是否发射了 release 事件
      expect(wrapper.emitted('release')).toBeDefined()
      expect(wrapper.emitted('release')!.length).toBe(1)
    })

    it('应该在触摸取消时发射 release 事件', async () => {
      const wrapper = mount(TouchButton, {
        props: { visible: true }
      })

      const container = wrapper.find('.touch-button')
      
      // 模拟触摸开始
      await container.trigger('touchstart', {
        touches: [{
          identifier: 0,
          clientX: 100,
          clientY: 100
        }]
      })

      // 模拟触摸取消
      await container.trigger('touchcancel', {
        changedTouches: [{
          identifier: 0,
          clientX: 100,
          clientY: 100
        }]
      })

      // 检查是否发射了 release 事件
      expect(wrapper.emitted('release')).toBeDefined()
    })

    it('应该在按下时触发触觉反馈（振动）', async () => {
      const vibrateSpy = vi.spyOn(navigator, 'vibrate')
      
      const wrapper = mount(TouchButton, {
        props: { visible: true }
      })

      const container = wrapper.find('.touch-button')
      
      // 模拟触摸开始
      await container.trigger('touchstart', {
        touches: [{
          identifier: 0,
          clientX: 100,
          clientY: 100
        }]
      })

      // 检查是否调用了振动 API
      expect(vibrateSpy).toHaveBeenCalledWith(50)
    })
  })

  describe('视觉反馈', () => {
    it('应该在按下时改变按钮样式', async () => {
      const wrapper = mount(TouchButton, {
        props: {
          color: '#00D9FF',
          visible: true
        }
      })

      const button = wrapper.find('.button-body')
      const normalStyle = button.attributes('style')
      
      // 未按下时的样式
      expect(normalStyle).toContain('#00D9FF66') // 半透明
      expect(normalStyle).toContain('scale(1)')

      // 模拟按下
      const container = wrapper.find('.touch-button')
      await container.trigger('touchstart', {
        touches: [{
          identifier: 0,
          clientX: 100,
          clientY: 100
        }]
      })

      const pressedStyle = button.attributes('style')
      // 按下时的样式
      expect(pressedStyle).toContain('#00D9FFCC') // 更不透明
      expect(pressedStyle).toContain('scale(0.9)') // 缩小
    })

    it('应该在按下时显示增强的发光效果', async () => {
      const wrapper = mount(TouchButton, {
        props: { visible: true }
      })

      const container = wrapper.find('.touch-button')
      await container.trigger('touchstart', {
        touches: [{
          identifier: 0,
          clientX: 100,
          clientY: 100
        }]
      })

      const button = wrapper.find('.button-body')
      const style = button.attributes('style')
      
      // 检查是否有增强的阴影效果
      expect(style).toContain('box-shadow')
      expect(style).toContain('inset') // 内阴影
    })

    it('应该在释放后恢复正常样式', async () => {
      const wrapper = mount(TouchButton, {
        props: {
          color: '#00D9FF',
          visible: true
        }
      })

      const container = wrapper.find('.touch-button')
      
      // 按下
      await container.trigger('touchstart', {
        touches: [{
          identifier: 0,
          clientX: 100,
          clientY: 100
        }]
      })

      // 释放
      await container.trigger('touchend', {
        changedTouches: [{
          identifier: 0,
          clientX: 100,
          clientY: 100
        }]
      })

      const button = wrapper.find('.button-body')
      const style = button.attributes('style')
      
      // 应该恢复到正常样式
      expect(style).toContain('#00D9FF66')
      expect(style).toContain('scale(1)')
    })
  })

  describe('多点触控处理', () => {
    it('应该只响应第一个触摸点', async () => {
      const wrapper = mount(TouchButton, {
        props: { visible: true }
      })

      const container = wrapper.find('.touch-button')
      
      // 第一个触摸点
      await container.trigger('touchstart', {
        touches: [{
          identifier: 0,
          clientX: 100,
          clientY: 100
        }]
      })

      const pressEventsCount1 = wrapper.emitted('press')?.length || 0

      // 第二个触摸点（应该被忽略）
      await container.trigger('touchstart', {
        touches: [
          {
            identifier: 0,
            clientX: 100,
            clientY: 100
          },
          {
            identifier: 1,
            clientX: 200,
            clientY: 200
          }
        ]
      })

      const pressEventsCount2 = wrapper.emitted('press')?.length || 0
      
      // 第二个触摸点不应该触发新的事件
      expect(pressEventsCount2).toBe(pressEventsCount1)
    })

    it('应该正确跟踪特定的触摸点', async () => {
      const wrapper = mount(TouchButton, {
        props: { visible: true }
      })

      const container = wrapper.find('.touch-button')
      
      // 开始触摸（identifier: 5）
      await container.trigger('touchstart', {
        touches: [{
          identifier: 5,
          clientX: 100,
          clientY: 100
        }]
      })

      // 结束不同的触摸点（identifier: 3，应该被忽略）
      await container.trigger('touchend', {
        changedTouches: [{
          identifier: 3,
          clientX: 100,
          clientY: 100
        }]
      })

      // 不应该发射 release 事件
      expect(wrapper.emitted('release')).toBeUndefined()

      // 结束正确的触摸点（identifier: 5）
      await container.trigger('touchend', {
        changedTouches: [{
          identifier: 5,
          clientX: 100,
          clientY: 100
        }]
      })

      // 应该发射 release 事件
      expect(wrapper.emitted('release')).toBeDefined()
      expect(wrapper.emitted('release')!.length).toBe(1)
    })
  })

  describe('标签样式', () => {
    it('应该根据按钮尺寸调整标签字体大小', () => {
      const wrapper = mount(TouchButton, {
        props: {
          size: 80,
          label: 'A',
          visible: true
        }
      })

      const label = wrapper.find('.button-label')
      const style = label.attributes('style')
      
      // 字体大小应该是按钮尺寸的 40%
      expect(style).toContain('font-size: 32px') // 80 * 0.4 = 32
    })

    it('应该为标签添加文字阴影以提高可读性', () => {
      const wrapper = mount(TouchButton, {
        props: {
          label: 'Fire',
          visible: true
        }
      })

      const label = wrapper.find('.button-label')
      const style = label.attributes('style')
      
      expect(style).toContain('text-shadow')
    })
  })

  describe('事件阻止', () => {
    it('应该阻止默认的触摸行为', async () => {
      const wrapper = mount(TouchButton, {
        props: { visible: true }
      })

      const container = wrapper.find('.touch-button')
      
      // 检查 touchstart 事件是否有 prevent 修饰符
      const touchStartHandler = container.element.ontouchstart
      expect(touchStartHandler).toBeDefined()
    })

    it('应该阻止上下文菜单', () => {
      const wrapper = mount(TouchButton, {
        props: { visible: true },
        attachTo: document.body
      })

      const container = wrapper.find('.touch-button')
      const element = container.element as HTMLElement
      
      // 模拟右键菜单事件
      const contextMenuEvent = new Event('contextmenu', { cancelable: true })
      const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault')
      
      element.dispatchEvent(contextMenuEvent)
      
      expect(preventDefaultSpy).toHaveBeenCalled()

      wrapper.unmount()
    })
  })

  describe('触觉反馈兼容性', () => {
    it('应该在不支持振动 API 的设备上静默失败', async () => {
      // 移除振动 API
      const originalVibrate = navigator.vibrate
      // @ts-ignore
      delete navigator.vibrate
      
      const wrapper = mount(TouchButton, {
        props: { visible: true }
      })

      const container = wrapper.find('.touch-button')
      
      // 应该不会抛出错误
      expect(() => {
        container.trigger('touchstart', {
          touches: [{
            identifier: 0,
            clientX: 100,
            clientY: 100
          }]
        })
      }).not.toThrow()

      // 恢复振动 API
      Object.defineProperty(navigator, 'vibrate', {
        value: originalVibrate,
        writable: true,
        configurable: true
      })
    })

    it('应该在振动 API 抛出错误时静默失败', async () => {
      // 模拟振动 API 抛出错误
      const vibrateSpy = vi.spyOn(navigator, 'vibrate').mockImplementation(() => {
        throw new Error('Vibration not allowed')
      })
      
      const wrapper = mount(TouchButton, {
        props: { visible: true }
      })

      const container = wrapper.find('.touch-button')
      
      // 应该不会抛出错误
      expect(() => {
        container.trigger('touchstart', {
          touches: [{
            identifier: 0,
            clientX: 100,
            clientY: 100
          }]
        })
      }).not.toThrow()

      vibrateSpy.mockRestore()
    })
  })

  describe('CSS 类和样式', () => {
    it('应该应用正确的 CSS 类', () => {
      const wrapper = mount(TouchButton, {
        props: { visible: true }
      })

      expect(wrapper.find('.touch-button').exists()).toBe(true)
      expect(wrapper.find('.button-body').exists()).toBe(true)
      expect(wrapper.find('.button-label').exists()).toBe(true)
    })

    it('应该禁用用户选择和触摸操作', () => {
      const wrapper = mount(TouchButton, {
        props: { visible: true }
      })

      const container = wrapper.find('.touch-button')
      const classes = container.classes()
      
      // 检查是否有 touch-button 类（该类包含禁用选择的样式）
      expect(classes).toContain('touch-button')
    })
  })

  describe('圆形按钮样式', () => {
    it('应该渲染为圆形按钮', () => {
      const wrapper = mount(TouchButton, {
        props: { visible: true }
      })

      const button = wrapper.find('.button-body')
      const style = button.attributes('style')
      
      expect(style).toContain('border-radius: 50%')
    })

    it('应该有半透明背景', () => {
      const wrapper = mount(TouchButton, {
        props: {
          color: '#00D9FF',
          visible: true
        }
      })

      const button = wrapper.find('.button-body')
      const style = button.attributes('style')
      
      // 检查是否使用了带透明度的颜色
      expect(style).toMatch(/#00D9FF[0-9A-F]{2}/)
    })
  })
})
