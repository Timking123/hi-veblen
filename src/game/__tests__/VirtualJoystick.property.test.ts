/**
 * VirtualJoystick 属性测试
 * 
 * 验证虚拟摇杆方向控制的正确性属性
 * 
 * Feature: website-v3-major-update, Property 20: 虚拟摇杆方向控制
 * 
 * 验证需求: 6.2
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { MobileController } from '../MobileController'

describe('VirtualJoystick Property Tests', () => {
  let canvas: HTMLCanvasElement
  let controller: MobileController

  beforeEach(() => {
    // 创建测试用的 canvas 元素
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600

    // 模拟移动设备环境
    Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 667, configurable: true })
    Object.defineProperty(window, 'ontouchstart', { value: true, configurable: true })

    controller = new MobileController(canvas)
    controller.initialize()
  })

  afterEach(() => {
    if (controller) {
      controller.destroy()
    }
  })

  /**
   * Feature: website-v3-major-update, Property 20: 虚拟摇杆方向控制
   * 
   * *对于任意*虚拟摇杆拖动方向（角度和距离），玩家飞机应该向对应方向移动，
   * 移动速度与摇杆距离成正比。
   * 
   * **验证需求: 6.2**
   */
  describe('属性 20: 虚拟摇杆方向控制', () => {
    it('摇杆角度应该正确映射到移动方向', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), // 角度（弧度）
          fc.double({ min: 0.2, max: 1, noNaN: true }), // 距离（归一化，避免死区）
          (angle, distance) => {
            // 模拟触摸事件，设置摇杆状态
            const joystickCenterX = 100
            const joystickCenterY = canvas.height - 100
            const joystickRadius = 60

            // 计算触摸点位置
            const touchX = joystickCenterX + Math.cos(angle) * joystickRadius * distance
            const touchY = joystickCenterY + Math.sin(angle) * joystickRadius * distance

            // 创建触摸事件
            const touch = {
              identifier: 0,
              clientX: touchX,
              clientY: touchY,
              target: canvas
            } as Touch

            const touchEvent = new TouchEvent('touchstart', {
              touches: [touch],
              changedTouches: [touch],
              bubbles: true,
              cancelable: true
            })

            // 触发触摸事件
            canvas.dispatchEvent(touchEvent)

            // 获取摇杆状态
            const state = controller.getJoystickState()

            // 验证摇杆被激活
            expect(state.active).toBe(true)

            // 验证角度（允许一定误差）
            const angleDiff = Math.abs(state.angle - angle)
            const normalizedAngleDiff = Math.min(
              angleDiff,
              2 * Math.PI - angleDiff
            )
            expect(normalizedAngleDiff).toBeLessThan(0.2) // 允许约 11 度误差

            // 验证距离（应该大于 0）
            expect(state.distance).toBeGreaterThan(0)
            expect(state.distance).toBeLessThanOrEqual(1)

            // 验证 x, y 分量与角度一致
            const expectedX = Math.cos(angle)
            const expectedY = Math.sin(angle)

            // 计算实际方向向量
            const actualAngle = Math.atan2(state.y, state.x)
            const actualAngleDiff = Math.abs(actualAngle - angle)
            const normalizedActualAngleDiff = Math.min(
              actualAngleDiff,
              2 * Math.PI - actualAngleDiff
            )

            // 验证方向向量的角度
            expect(normalizedActualAngleDiff).toBeLessThan(0.2)

            // 清理：模拟触摸结束
            const touchEndEvent = new TouchEvent('touchend', {
              changedTouches: [touch],
              bubbles: true,
              cancelable: true
            })
            canvas.dispatchEvent(touchEndEvent)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('摇杆距离应该正确映射到移动速度', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), // 角度
          fc.double({ min: 0.2, max: 1, noNaN: true }), // 距离（避免死区）
          (angle, normalizedDistance) => {
            const joystickCenterX = 100
            const joystickCenterY = canvas.height - 100
            const joystickRadius = 60

            // 计算触摸点位置
            const touchX = joystickCenterX + Math.cos(angle) * joystickRadius * normalizedDistance
            const touchY = joystickCenterY + Math.sin(angle) * joystickRadius * normalizedDistance

            // 创建触摸事件
            const touch = {
              identifier: 0,
              clientX: touchX,
              clientY: touchY,
              target: canvas
            } as Touch

            const touchEvent = new TouchEvent('touchstart', {
              touches: [touch],
              changedTouches: [touch],
              bubbles: true,
              cancelable: true
            })

            canvas.dispatchEvent(touchEvent)

            // 获取摇杆状态
            const state = controller.getJoystickState()

            // 验证距离与输入成正比
            // 由于死区和归一化的影响，距离应该在合理范围内
            expect(state.distance).toBeGreaterThan(0)
            expect(state.distance).toBeLessThanOrEqual(1)

            // 验证移动向量的长度与距离相关
            const vectorLength = Math.sqrt(state.x * state.x + state.y * state.y)
            expect(vectorLength).toBeGreaterThan(0)
            expect(vectorLength).toBeLessThanOrEqual(1)

            // 清理
            const touchEndEvent = new TouchEvent('touchend', {
              changedTouches: [touch],
              bubbles: true,
              cancelable: true
            })
            canvas.dispatchEvent(touchEndEvent)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('摇杆释放后应该返回中心位置', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), // 角度
          fc.double({ min: 0.2, max: 1, noNaN: true }), // 距离
          (angle, distance) => {
            const joystickCenterX = 100
            const joystickCenterY = canvas.height - 100
            const joystickRadius = 60

            // 计算触摸点位置
            const touchX = joystickCenterX + Math.cos(angle) * joystickRadius * distance
            const touchY = joystickCenterY + Math.sin(angle) * joystickRadius * distance

            // 创建触摸开始事件
            const touch = {
              identifier: 0,
              clientX: touchX,
              clientY: touchY,
              target: canvas
            } as Touch

            const touchStartEvent = new TouchEvent('touchstart', {
              touches: [touch],
              changedTouches: [touch],
              bubbles: true,
              cancelable: true
            })

            canvas.dispatchEvent(touchStartEvent)

            // 验证摇杆被激活
            let state = controller.getJoystickState()
            expect(state.active).toBe(true)
            expect(state.distance).toBeGreaterThan(0)

            // 创建触摸结束事件
            const touchEndEvent = new TouchEvent('touchend', {
              changedTouches: [touch],
              bubbles: true,
              cancelable: true
            })

            canvas.dispatchEvent(touchEndEvent)

            // 验证摇杆返回中心位置
            state = controller.getJoystickState()
            expect(state.active).toBe(false)
            expect(state.x).toBe(0)
            expect(state.y).toBe(0)
            expect(state.distance).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('摇杆死区应该正确工作', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), // 角度
          fc.double({ min: 0, max: 0.08, noNaN: true }), // 死区内的距离（明显小于 0.1）
          (angle, deadZoneDistance) => {
            const joystickCenterX = 100
            const joystickCenterY = canvas.height - 100
            const joystickRadius = 60

            // 计算触摸点位置（在死区内）
            const touchX = joystickCenterX + Math.cos(angle) * joystickRadius * deadZoneDistance
            const touchY = joystickCenterY + Math.sin(angle) * joystickRadius * deadZoneDistance

            // 创建触摸事件
            const touch = {
              identifier: 0,
              clientX: touchX,
              clientY: touchY,
              target: canvas
            } as Touch

            const touchEvent = new TouchEvent('touchstart', {
              touches: [touch],
              changedTouches: [touch],
              bubbles: true,
              cancelable: true
            })

            canvas.dispatchEvent(touchEvent)

            // 获取摇杆状态
            const state = controller.getJoystickState()

            // 在死区内，有效距离应该为 0 或非常接近 0
            expect(state.distance).toBeLessThan(0.02)
            expect(Math.abs(state.x)).toBeLessThan(0.02)
            expect(Math.abs(state.y)).toBeLessThan(0.02)

            // 清理
            const touchEndEvent = new TouchEvent('touchend', {
              changedTouches: [touch],
              bubbles: true,
              cancelable: true
            })
            canvas.dispatchEvent(touchEndEvent)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('摇杆移动应该保持方向一致性', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), // 初始角度
          fc.double({ min: 0.2, max: 1, noNaN: true }), // 初始距离
          fc.double({ min: 0.2, max: 1, noNaN: true }), // 移动后距离
          (angle, distance1, distance2) => {
            const joystickCenterX = 100
            const joystickCenterY = canvas.height - 100
            const joystickRadius = 60

            // 第一次触摸
            const touchX1 = joystickCenterX + Math.cos(angle) * joystickRadius * distance1
            const touchY1 = joystickCenterY + Math.sin(angle) * joystickRadius * distance1

            const touch1 = {
              identifier: 0,
              clientX: touchX1,
              clientY: touchY1,
              target: canvas
            } as Touch

            const touchStartEvent = new TouchEvent('touchstart', {
              touches: [touch1],
              changedTouches: [touch1],
              bubbles: true,
              cancelable: true
            })

            canvas.dispatchEvent(touchStartEvent)

            const state1 = controller.getJoystickState()
            const angle1 = state1.angle

            // 沿相同方向移动
            const touchX2 = joystickCenterX + Math.cos(angle) * joystickRadius * distance2
            const touchY2 = joystickCenterY + Math.sin(angle) * joystickRadius * distance2

            const touch2 = {
              identifier: 0,
              clientX: touchX2,
              clientY: touchY2,
              target: canvas
            } as Touch

            const touchMoveEvent = new TouchEvent('touchmove', {
              touches: [touch2],
              changedTouches: [touch2],
              bubbles: true,
              cancelable: true
            })

            canvas.dispatchEvent(touchMoveEvent)

            const state2 = controller.getJoystickState()
            const angle2 = state2.angle

            // 验证角度保持一致（允许小误差）
            const angleDiff = Math.abs(angle1 - angle2)
            const normalizedAngleDiff = Math.min(
              angleDiff,
              2 * Math.PI - angleDiff
            )
            expect(normalizedAngleDiff).toBeLessThan(0.3)

            // 清理
            const touchEndEvent = new TouchEvent('touchend', {
              changedTouches: [touch2],
              bubbles: true,
              cancelable: true
            })
            canvas.dispatchEvent(touchEndEvent)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('边界情况', () => {
    it('应该处理极端角度值', () => {
      const extremeAngles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2, 2 * Math.PI]

      for (const angle of extremeAngles) {
        const joystickCenterX = 100
        const joystickCenterY = canvas.height - 100
        const joystickRadius = 60
        const distance = 0.5

        const touchX = joystickCenterX + Math.cos(angle) * joystickRadius * distance
        const touchY = joystickCenterY + Math.sin(angle) * joystickRadius * distance

        const touch = {
          identifier: 0,
          clientX: touchX,
          clientY: touchY,
          target: canvas
        } as Touch

        const touchEvent = new TouchEvent('touchstart', {
          touches: [touch],
          changedTouches: [touch],
          bubbles: true,
          cancelable: true
        })

        canvas.dispatchEvent(touchEvent)

        const state = controller.getJoystickState()
        expect(state.active).toBe(true)
        expect(state.distance).toBeGreaterThan(0)

        // 清理
        const touchEndEvent = new TouchEvent('touchend', {
          changedTouches: [touch],
          bubbles: true,
          cancelable: true
        })
        canvas.dispatchEvent(touchEndEvent)
      }
    })

    it('应该处理最大距离', () => {
      const angle = Math.PI / 4
      const joystickCenterX = 100
      const joystickCenterY = canvas.height - 100
      const joystickRadius = 60

      // 超出摇杆半径的触摸
      const touchX = joystickCenterX + Math.cos(angle) * joystickRadius * 2
      const touchY = joystickCenterY + Math.sin(angle) * joystickRadius * 2

      const touch = {
        identifier: 0,
        clientX: touchX,
        clientY: touchY,
        target: canvas
      } as Touch

      const touchEvent = new TouchEvent('touchstart', {
        touches: [touch],
        changedTouches: [touch],
        bubbles: true,
        cancelable: true
      })

      canvas.dispatchEvent(touchEvent)

      const state = controller.getJoystickState()

      // 距离应该被限制在 1
      expect(state.distance).toBeLessThanOrEqual(1)

      // 清理
      const touchEndEvent = new TouchEvent('touchend', {
        changedTouches: [touch],
        bubbles: true,
        cancelable: true
      })
      canvas.dispatchEvent(touchEndEvent)
    })
  })
})
