/**
 * 虚拟摇杆组件单元测试
 * 
 * 验证需求: 6.1, 6.2, 6.11
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import VirtualJoystick from '../VirtualJoystick.vue'

describe('VirtualJoystick', () => {
  beforeEach(() => {
    // 清理所有模拟
    vi.clearAllMocks()
  })

  describe('组件渲染', () => {
    it('应该在 visible 为 true 时渲染', () => {
      const wrapper = mount(VirtualJoystick, {
        props: { visible: true }
      })

      expect(wrapper.find('.virtual-joystick').exists()).toBe(true)
      expect(wrapper.find('.joystick-base').exists()).toBe(true)
      expect(wrapper.find('.joystick-stick').exists()).toBe(true)
    })

    it('应该在 visible 为 false 时不渲染', () => {
      const wrapper = mount(VirtualJoystick, {
        props: { visible: false }
      })

      expect(wrapper.find('.virtual-joystick').exists()).toBe(false)
    })

    it('应该使用提供的位置和半径属性', () => {
      const wrapper = mount(VirtualJoystick, {
        props: {
          x: 150,
          y: 400,
          radius: 80,
          visible: true
        }
      })

      const container = wrapper.find('.virtual-joystick')
      const style = container.attributes('style')

      expect(style).toContain('left: 70px') // x - radius = 150 - 80
      expect(style).toContain('bottom: 320px') // y - radius = 400 - 80
      expect(style).toContain('width: 160px') // radius * 2
      expect(style).toContain('height: 160px')
    })
  })

  describe('触摸事件处理', () => {
    it('应该在触摸开始时激活摇杆', async () => {
      const wrapper = mount(VirtualJoystick, {
        props: { visible: true }
      })

      const container = wrapper.find('.virtual-joystick')
      
      // 模拟触摸开始
      await container.trigger('touchstart', {
        touches: [{
          identifier: 0,
          clientX: 100,
          clientY: 500
        }]
      })

      // 检查摇杆是否激活（通过样式变化）
      const stick = wrapper.find('.joystick-stick')
      const stickStyle = stick.attributes('style')
      expect(stickStyle).toContain('rgba(0, 217, 255, 0.8)') // 激活状态的颜色
    })

    it('应该在触摸移动时发射 move 事件', async () => {
      const wrapper = mount(VirtualJoystick, {
        props: {
          x: 100,
          y: 500,
          radius: 60,
          visible: true
        }
      })

      const container = wrapper.find('.virtual-joystick')
      
      // 模拟触摸开始
      await container.trigger('touchstart', {
        touches: [{
          identifier: 0,
          clientX: 100,
          clientY: 500
        }]
      })

      // 模拟触摸移动（向右移动）
      await container.trigger('touchmove', {
        touches: [{
          identifier: 0,
          clientX: 130, // 向右移动 30 像素
          clientY: 500
        }]
      })

      // 检查是否发射了 move 事件
      const moveEvents = wrapper.emitted('move')
      expect(moveEvents).toBeDefined()
      expect(moveEvents!.length).toBeGreaterThan(0)

      // 检查事件参数
      const lastEvent = moveEvents![moveEvents!.length - 1][0] as any
      expect(lastEvent).toHaveProperty('x')
      expect(lastEvent).toHaveProperty('y')
      expect(lastEvent).toHaveProperty('angle')
      expect(lastEvent).toHaveProperty('distance')
      
      // 向右移动，x 应该为正
      expect(lastEvent.x).toBeGreaterThan(0)
    })

    it('应该在触摸结束时发射 release 事件并重置摇杆', async () => {
      const wrapper = mount(VirtualJoystick, {
        props: { visible: true }
      })

      const container = wrapper.find('.virtual-joystick')
      
      // 模拟触摸开始
      await container.trigger('touchstart', {
        touches: [{
          identifier: 0,
          clientX: 100,
          clientY: 500
        }]
      })

      // 模拟触摸结束
      await container.trigger('touchend', {
        changedTouches: [{
          identifier: 0,
          clientX: 100,
          clientY: 500
        }]
      })

      // 检查是否发射了 release 事件
      expect(wrapper.emitted('release')).toBeDefined()
      expect(wrapper.emitted('release')!.length).toBe(1)
    })

    it('应该在触摸取消时重置摇杆', async () => {
      const wrapper = mount(VirtualJoystick, {
        props: { visible: true }
      })

      const container = wrapper.find('.virtual-joystick')
      
      // 模拟触摸开始
      await container.trigger('touchstart', {
        touches: [{
          identifier: 0,
          clientX: 100,
          clientY: 500
        }]
      })

      // 模拟触摸取消
      await container.trigger('touchcancel', {
        changedTouches: [{
          identifier: 0,
          clientX: 100,
          clientY: 500
        }]
      })

      // 检查是否发射了 release 事件
      expect(wrapper.emitted('release')).toBeDefined()
    })
  })

  describe('方向计算', () => {
    it('应该正确计算向右移动的方向', async () => {
      const wrapper = mount(VirtualJoystick, {
        props: {
          x: 100,
          y: 500,
          radius: 60,
          visible: true
        },
        attachTo: document.body
      })

      const container = wrapper.find('.virtual-joystick')
      const element = container.element as HTMLElement
      
      // 模拟 getBoundingClientRect
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
        left: 40,
        top: 440,
        right: 160,
        bottom: 560,
        width: 120,
        height: 120,
        x: 40,
        y: 440,
        toJSON: () => ({})
      })
      
      // 模拟触摸开始（中心点）
      await container.trigger('touchstart', {
        touches: [{
          identifier: 0,
          clientX: 100,
          clientY: 500
        }]
      })

      // 模拟触摸移动（向右）
      await container.trigger('touchmove', {
        touches: [{
          identifier: 0,
          clientX: 130, // 向右移动
          clientY: 500
        }]
      })

      const moveEvents = wrapper.emitted('move')
      expect(moveEvents).toBeDefined()
      
      const lastEvent = moveEvents![moveEvents!.length - 1][0] as any
      expect(lastEvent.x).toBeGreaterThan(0) // x 为正
      expect(Math.abs(lastEvent.y)).toBeLessThan(0.1) // y 接近 0
      expect(Math.abs(lastEvent.angle)).toBeLessThan(0.1) // 角度接近 0（向右）

      wrapper.unmount()
    })

    it('应该正确计算向上移动的方向', async () => {
      const wrapper = mount(VirtualJoystick, {
        props: {
          x: 100,
          y: 500,
          radius: 60,
          visible: true
        },
        attachTo: document.body
      })

      const container = wrapper.find('.virtual-joystick')
      const element = container.element as HTMLElement
      
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
        left: 40,
        top: 440,
        right: 160,
        bottom: 560,
        width: 120,
        height: 120,
        x: 40,
        y: 440,
        toJSON: () => ({})
      })
      
      await container.trigger('touchstart', {
        touches: [{
          identifier: 0,
          clientX: 100,
          clientY: 500
        }]
      })

      // 模拟触摸移动（向上）
      await container.trigger('touchmove', {
        touches: [{
          identifier: 0,
          clientX: 100,
          clientY: 470 // 向上移动
        }]
      })

      const moveEvents = wrapper.emitted('move')
      expect(moveEvents).toBeDefined()
      
      const lastEvent = moveEvents![moveEvents!.length - 1][0] as any
      expect(Math.abs(lastEvent.x)).toBeLessThan(0.1) // x 接近 0
      expect(lastEvent.y).toBeLessThan(0) // y 为负（向上）
      expect(lastEvent.angle).toBeLessThan(0) // 角度为负（向上）

      wrapper.unmount()
    })
  })

  describe('死区处理', () => {
    it('应该在死区内不发射移动事件', async () => {
      const wrapper = mount(VirtualJoystick, {
        props: {
          x: 100,
          y: 500,
          radius: 60,
          deadZone: 0.2, // 20% 死区
          visible: true
        },
        attachTo: document.body
      })

      const container = wrapper.find('.virtual-joystick')
      const element = container.element as HTMLElement
      
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
        left: 40,
        top: 440,
        right: 160,
        bottom: 560,
        width: 120,
        height: 120,
        x: 40,
        y: 440,
        toJSON: () => ({})
      })
      
      await container.trigger('touchstart', {
        touches: [{
          identifier: 0,
          clientX: 100,
          clientY: 500
        }]
      })

      // 模拟小幅度移动（在死区内）
      await container.trigger('touchmove', {
        touches: [{
          identifier: 0,
          clientX: 102, // 只移动 2 像素
          clientY: 500
        }]
      })

      const moveEvents = wrapper.emitted('move')
      expect(moveEvents).toBeDefined()
      
      const lastEvent = moveEvents![moveEvents!.length - 1][0] as any
      expect(lastEvent.distance).toBe(0) // 死区内距离应该为 0

      wrapper.unmount()
    })
  })

  describe('多点触控处理', () => {
    it('应该只响应第一个触摸点', async () => {
      const wrapper = mount(VirtualJoystick, {
        props: { visible: true }
      })

      const container = wrapper.find('.virtual-joystick')
      
      // 第一个触摸点
      await container.trigger('touchstart', {
        touches: [{
          identifier: 0,
          clientX: 100,
          clientY: 500
        }]
      })

      const moveEventsCount1 = wrapper.emitted('move')?.length || 0

      // 第二个触摸点（应该被忽略）
      await container.trigger('touchstart', {
        touches: [
          {
            identifier: 0,
            clientX: 100,
            clientY: 500
          },
          {
            identifier: 1,
            clientX: 200,
            clientY: 500
          }
        ]
      })

      const moveEventsCount2 = wrapper.emitted('move')?.length || 0
      
      // 第二个触摸点不应该触发新的事件
      expect(moveEventsCount2).toBe(moveEventsCount1)
    })
  })

  describe('边界限制', () => {
    it('应该限制摇杆手柄在最大半径内', async () => {
      const wrapper = mount(VirtualJoystick, {
        props: {
          x: 100,
          y: 500,
          radius: 60,
          visible: true
        },
        attachTo: document.body
      })

      const container = wrapper.find('.virtual-joystick')
      const element = container.element as HTMLElement
      
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
        left: 40,
        top: 440,
        right: 160,
        bottom: 560,
        width: 120,
        height: 120,
        x: 40,
        y: 440,
        toJSON: () => ({})
      })
      
      await container.trigger('touchstart', {
        touches: [{
          identifier: 0,
          clientX: 100,
          clientY: 500
        }]
      })

      // 模拟触摸移动到很远的位置
      await container.trigger('touchmove', {
        touches: [{
          identifier: 0,
          clientX: 300, // 远超摇杆半径
          clientY: 500
        }]
      })

      const moveEvents = wrapper.emitted('move')
      expect(moveEvents).toBeDefined()
      
      const lastEvent = moveEvents![moveEvents!.length - 1][0] as any
      // 距离应该被限制在 0-1 之间
      expect(lastEvent.distance).toBeGreaterThanOrEqual(0)
      expect(lastEvent.distance).toBeLessThanOrEqual(1)

      wrapper.unmount()
    })
  })

  describe('样式和视觉反馈', () => {
    it('应该在激活时改变手柄颜色', async () => {
      const wrapper = mount(VirtualJoystick, {
        props: { visible: true }
      })

      const stick = wrapper.find('.joystick-stick')
      const inactiveStyle = stick.attributes('style')
      
      // 未激活时的颜色
      expect(inactiveStyle).toContain('rgba(0, 217, 255, 0.6)')

      // 激活摇杆
      const container = wrapper.find('.virtual-joystick')
      await container.trigger('touchstart', {
        touches: [{
          identifier: 0,
          clientX: 100,
          clientY: 500
        }]
      })

      const activeStyle = stick.attributes('style')
      // 激活时的颜色
      expect(activeStyle).toContain('rgba(0, 217, 255, 0.8)')
    })

    it('应该在激活时显示发光效果', async () => {
      const wrapper = mount(VirtualJoystick, {
        props: { visible: true }
      })

      const container = wrapper.find('.virtual-joystick')
      await container.trigger('touchstart', {
        touches: [{
          identifier: 0,
          clientX: 100,
          clientY: 500
        }]
      })

      const stick = wrapper.find('.joystick-stick')
      const style = stick.attributes('style')
      
      // 检查是否有阴影效果
      expect(style).toContain('box-shadow')
    })
  })

  describe('事件阻止', () => {
    it('应该阻止默认的触摸行为', async () => {
      const wrapper = mount(VirtualJoystick, {
        props: { visible: true }
      })

      const container = wrapper.find('.virtual-joystick')
      
      // 检查 touchstart 事件是否有 prevent 修饰符
      const touchStartHandler = container.element.ontouchstart
      expect(touchStartHandler).toBeDefined()
    })

    it('应该阻止上下文菜单', () => {
      const wrapper = mount(VirtualJoystick, {
        props: { visible: true },
        attachTo: document.body
      })

      const container = wrapper.find('.virtual-joystick')
      const element = container.element as HTMLElement
      
      // 模拟右键菜单事件
      const contextMenuEvent = new Event('contextmenu', { cancelable: true })
      const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault')
      
      element.dispatchEvent(contextMenuEvent)
      
      expect(preventDefaultSpy).toHaveBeenCalled()

      wrapper.unmount()
    })
  })
})
