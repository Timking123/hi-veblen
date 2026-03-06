/**
 * useRipple Composable 属性测试
 * 
 * Feature: website-enhancement-v2
 * 
 * 使用 fast-check 进行属性测试，验证涟漪效果的核心属性：
 * - 属性 5: 涟漪效果位置计算
 * 
 * 测试配置：
 * - 测试框架：Vitest + fast-check
 * - 最小迭代次数：每个属性测试至少运行 100 次
 * - 标签格式：Feature: website-enhancement-v2, Property N: {property_text}
 * 
 * 涟漪位置计算逻辑：
 * - 涟漪大小 = max(元素宽度, 元素高度) * 2
 * - x = 点击位置相对于元素左边的距离 - 涟漪半径
 * - y = 点击位置相对于元素顶部的距离 - 涟漪半径
 */

import { describe, it, expect, vi } from 'vitest'
import * as fc from 'fast-check'
import { calculateRipplePosition, RIPPLE_DURATION } from '../useRipple'

// ========== 自定义生成器 ==========

/**
 * 生成正数的元素尺寸（宽度或高度）
 * 约束到合理的 UI 元素尺寸范围：1px - 1000px
 */
const dimensionArb = fc.integer({ min: 1, max: 1000 })

/**
 * 生成元素位置（left 或 top）
 * 约束到合理的屏幕坐标范围：0 - 2000px
 */
const positionArb = fc.integer({ min: 0, max: 2000 })

/**
 * 生成按钮元素的边界矩形配置
 * 包含宽度、高度、左边距、顶边距
 */
const elementRectArb = fc.record({
  width: dimensionArb,
  height: dimensionArb,
  left: positionArb,
  top: positionArb,
})

/**
 * 生成元素内部的点击坐标
 * 点击位置相对于元素边界，确保点击在元素内部
 */
const clickInsideElementArb = (rect: { width: number; height: number; left: number; top: number }) => {
  return fc.record({
    // 点击的 clientX 在元素范围内
    clientX: fc.integer({ min: rect.left, max: rect.left + rect.width }),
    // 点击的 clientY 在元素范围内
    clientY: fc.integer({ min: rect.top, max: rect.top + rect.height }),
  })
}

/**
 * 生成任意点击坐标（可能在元素外部）
 * 用于测试边界情况
 */
const clickCoordinateArb = fc.record({
  clientX: fc.integer({ min: 0, max: 3000 }),
  clientY: fc.integer({ min: 0, max: 3000 }),
})

// ========== 辅助函数 ==========

/**
 * 创建模拟的 HTMLElement
 */
function createMockElement(
  width: number,
  height: number,
  left: number,
  top: number
): HTMLElement {
  const element = document.createElement('button')
  
  // Mock getBoundingClientRect
  element.getBoundingClientRect = vi.fn().mockReturnValue({
    width,
    height,
    left,
    top,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
  })
  
  return element
}

/**
 * 创建模拟的 MouseEvent
 */
function createMockMouseEvent(
  clientX: number,
  clientY: number,
  target: HTMLElement
): MouseEvent {
  const event = new MouseEvent('click', {
    clientX,
    clientY,
    bubbles: true,
    cancelable: true,
  })
  
  // 设置 currentTarget
  Object.defineProperty(event, 'currentTarget', {
    value: target,
    writable: false,
  })
  
  return event
}

// ========== 测试套件 ==========

describe('useRipple 属性测试', () => {
  /**
   * 属性 5：涟漪效果位置计算
   * 
   * *对于任意* 按钮元素和点击坐标，涟漪效果的位置应该以点击位置为中心，
   * 大小应该足以覆盖整个按钮。
   * 
   * **Validates: Requirements 2.1**
   */
  describe('Feature: website-enhancement-v2, Property 5: 涟漪效果位置计算', () => {
    it('涟漪大小应等于元素最大边长的 2 倍', () => {
      fc.assert(
        fc.property(
          elementRectArb,
          (rect) => {
            const element = createMockElement(rect.width, rect.height, rect.left, rect.top)
            // 点击元素中心
            const clientX = rect.left + rect.width / 2
            const clientY = rect.top + rect.height / 2
            const event = createMockMouseEvent(clientX, clientY, element)
            
            const result = calculateRipplePosition(event)
            
            expect(result).not.toBeNull()
            
            // 涟漪大小 = max(width, height) * 2
            const expectedSize = Math.max(rect.width, rect.height) * 2
            expect(result!.size).toBe(expectedSize)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('涟漪大小应足以覆盖整个元素（从任意点击位置）', () => {
      fc.assert(
        fc.property(
          elementRectArb.chain(rect => 
            clickInsideElementArb(rect).map(click => ({ rect, click }))
          ),
          ({ rect, click }) => {
            const element = createMockElement(rect.width, rect.height, rect.left, rect.top)
            const event = createMockMouseEvent(click.clientX, click.clientY, element)
            
            const result = calculateRipplePosition(event)
            
            expect(result).not.toBeNull()
            
            // 涟漪大小应该至少是元素对角线长度
            // 这样从任意点击位置都能覆盖整个元素
            const diagonal = Math.sqrt(rect.width ** 2 + rect.height ** 2)
            expect(result!.size).toBeGreaterThanOrEqual(diagonal)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('涟漪中心应位于点击位置', () => {
      fc.assert(
        fc.property(
          elementRectArb.chain(rect => 
            clickInsideElementArb(rect).map(click => ({ rect, click }))
          ),
          ({ rect, click }) => {
            const element = createMockElement(rect.width, rect.height, rect.left, rect.top)
            const event = createMockMouseEvent(click.clientX, click.clientY, element)
            
            const result = calculateRipplePosition(event)
            
            expect(result).not.toBeNull()
            
            // 涟漪的中心位置计算
            // 涟漪左上角 x = clickX - rect.left - size/2
            // 涟漪中心 x = 涟漪左上角 x + size/2 = clickX - rect.left
            const rippleCenterX = result!.x + result!.size / 2
            const rippleCenterY = result!.y + result!.size / 2
            
            // 点击位置相对于元素的坐标
            const clickRelativeX = click.clientX - rect.left
            const clickRelativeY = click.clientY - rect.top
            
            // 涟漪中心应该等于点击位置（相对于元素）
            expect(rippleCenterX).toBeCloseTo(clickRelativeX, 5)
            expect(rippleCenterY).toBeCloseTo(clickRelativeY, 5)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('涟漪位置计算公式应正确：x = clickX - left - size/2, y = clickY - top - size/2', () => {
      fc.assert(
        fc.property(
          elementRectArb,
          clickCoordinateArb,
          (rect, click) => {
            const element = createMockElement(rect.width, rect.height, rect.left, rect.top)
            const event = createMockMouseEvent(click.clientX, click.clientY, element)
            
            const result = calculateRipplePosition(event)
            
            expect(result).not.toBeNull()
            
            // 验证计算公式
            const expectedSize = Math.max(rect.width, rect.height) * 2
            const expectedX = click.clientX - rect.left - expectedSize / 2
            const expectedY = click.clientY - rect.top - expectedSize / 2
            
            expect(result!.size).toBe(expectedSize)
            expect(result!.x).toBe(expectedX)
            expect(result!.y).toBe(expectedY)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('对于正方形元素，涟漪大小应为边长的 2 倍', () => {
      fc.assert(
        fc.property(
          dimensionArb,
          positionArb,
          positionArb,
          (side, left, top) => {
            // 正方形元素：宽度 = 高度
            const element = createMockElement(side, side, left, top)
            const clientX = left + side / 2
            const clientY = top + side / 2
            const event = createMockMouseEvent(clientX, clientY, element)
            
            const result = calculateRipplePosition(event)
            
            expect(result).not.toBeNull()
            expect(result!.size).toBe(side * 2)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('对于宽度大于高度的元素，涟漪大小应基于宽度', () => {
      fc.assert(
        fc.property(
          // 确保宽度 > 高度
          fc.integer({ min: 2, max: 1000 }).chain(width =>
            fc.integer({ min: 1, max: width - 1 }).map(height => ({ width, height }))
          ),
          positionArb,
          positionArb,
          ({ width, height }, left, top) => {
            const element = createMockElement(width, height, left, top)
            const clientX = left + width / 2
            const clientY = top + height / 2
            const event = createMockMouseEvent(clientX, clientY, element)
            
            const result = calculateRipplePosition(event)
            
            expect(result).not.toBeNull()
            expect(result!.size).toBe(width * 2)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('对于高度大于宽度的元素，涟漪大小应基于高度', () => {
      fc.assert(
        fc.property(
          // 确保高度 > 宽度
          fc.integer({ min: 2, max: 1000 }).chain(height =>
            fc.integer({ min: 1, max: height - 1 }).map(width => ({ width, height }))
          ),
          positionArb,
          positionArb,
          ({ width, height }, left, top) => {
            const element = createMockElement(width, height, left, top)
            const clientX = left + width / 2
            const clientY = top + height / 2
            const event = createMockMouseEvent(clientX, clientY, element)
            
            const result = calculateRipplePosition(event)
            
            expect(result).not.toBeNull()
            expect(result!.size).toBe(height * 2)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('点击元素左上角时，涟漪位置应正确计算', () => {
      fc.assert(
        fc.property(
          elementRectArb,
          (rect) => {
            const element = createMockElement(rect.width, rect.height, rect.left, rect.top)
            // 点击左上角
            const event = createMockMouseEvent(rect.left, rect.top, element)
            
            const result = calculateRipplePosition(event)
            
            expect(result).not.toBeNull()
            
            const expectedSize = Math.max(rect.width, rect.height) * 2
            // x = 0 - size/2 = -size/2
            // y = 0 - size/2 = -size/2
            expect(result!.x).toBe(-expectedSize / 2)
            expect(result!.y).toBe(-expectedSize / 2)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('点击元素右下角时，涟漪位置应正确计算', () => {
      fc.assert(
        fc.property(
          elementRectArb,
          (rect) => {
            const element = createMockElement(rect.width, rect.height, rect.left, rect.top)
            // 点击右下角
            const event = createMockMouseEvent(rect.left + rect.width, rect.top + rect.height, element)
            
            const result = calculateRipplePosition(event)
            
            expect(result).not.toBeNull()
            
            const expectedSize = Math.max(rect.width, rect.height) * 2
            // x = width - size/2
            // y = height - size/2
            expect(result!.x).toBe(rect.width - expectedSize / 2)
            expect(result!.y).toBe(rect.height - expectedSize / 2)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('涟漪应能覆盖元素的所有四个角', () => {
      fc.assert(
        fc.property(
          elementRectArb.chain(rect => 
            clickInsideElementArb(rect).map(click => ({ rect, click }))
          ),
          ({ rect, click }) => {
            const element = createMockElement(rect.width, rect.height, rect.left, rect.top)
            const event = createMockMouseEvent(click.clientX, click.clientY, element)
            
            const result = calculateRipplePosition(event)
            
            expect(result).not.toBeNull()
            
            // 涟漪的边界
            const rippleLeft = result!.x
            const rippleTop = result!.y
            const rippleRight = result!.x + result!.size
            const rippleBottom = result!.y + result!.size
            
            // 元素的四个角（相对于元素自身）
            const corners = [
              { x: 0, y: 0 },                           // 左上角
              { x: rect.width, y: 0 },                  // 右上角
              { x: 0, y: rect.height },                 // 左下角
              { x: rect.width, y: rect.height },        // 右下角
            ]
            
            // 验证涟漪覆盖所有四个角
            for (const corner of corners) {
              expect(corner.x).toBeGreaterThanOrEqual(rippleLeft)
              expect(corner.x).toBeLessThanOrEqual(rippleRight)
              expect(corner.y).toBeGreaterThanOrEqual(rippleTop)
              expect(corner.y).toBeLessThanOrEqual(rippleBottom)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('当 currentTarget 为 null 时应返回 null', () => {
      fc.assert(
        fc.property(
          clickCoordinateArb,
          (click) => {
            // 创建没有 currentTarget 的事件
            const event = new MouseEvent('click', {
              clientX: click.clientX,
              clientY: click.clientY,
            })
            
            const result = calculateRipplePosition(event)
            
            expect(result).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * 涟漪持续时间常量测试
   */
  describe('涟漪持续时间常量', () => {
    it('RIPPLE_DURATION 应为 600ms', () => {
      expect(RIPPLE_DURATION).toBe(600)
    })
  })

  /**
   * 额外的边界情况测试
   */
  describe('边界情况', () => {
    it('极小元素（1x1）的涟漪大小应为 2', () => {
      fc.assert(
        fc.property(
          positionArb,
          positionArb,
          (left, top) => {
            const element = createMockElement(1, 1, left, top)
            const event = createMockMouseEvent(left, top, element)
            
            const result = calculateRipplePosition(event)
            
            expect(result).not.toBeNull()
            expect(result!.size).toBe(2) // max(1, 1) * 2 = 2
          }
        ),
        { numRuns: 100 }
      )
    })

    it('极端宽高比元素的涟漪大小应基于较大边', () => {
      fc.assert(
        fc.property(
          // 极端宽高比：宽度是高度的 10 倍以上
          fc.integer({ min: 100, max: 1000 }).chain(width =>
            fc.integer({ min: 1, max: Math.floor(width / 10) }).map(height => ({ width, height }))
          ),
          positionArb,
          positionArb,
          ({ width, height }, left, top) => {
            const element = createMockElement(width, height, left, top)
            const clientX = left + width / 2
            const clientY = top + height / 2
            const event = createMockMouseEvent(clientX, clientY, element)
            
            const result = calculateRipplePosition(event)
            
            expect(result).not.toBeNull()
            // 宽度远大于高度，涟漪大小应基于宽度
            expect(result!.size).toBe(width * 2)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('元素位于屏幕边缘时涟漪计算应正确', () => {
      fc.assert(
        fc.property(
          dimensionArb,
          dimensionArb,
          (width, height) => {
            // 元素位于屏幕左上角 (0, 0)
            const element = createMockElement(width, height, 0, 0)
            const clientX = width / 2
            const clientY = height / 2
            const event = createMockMouseEvent(clientX, clientY, element)
            
            const result = calculateRipplePosition(event)
            
            expect(result).not.toBeNull()
            
            const expectedSize = Math.max(width, height) * 2
            const expectedX = clientX - expectedSize / 2
            const expectedY = clientY - expectedSize / 2
            
            expect(result!.size).toBe(expectedSize)
            expect(result!.x).toBe(expectedX)
            expect(result!.y).toBe(expectedY)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
