/**
 * useCard3D Composable 单元测试
 * 
 * 测试卡片 3D 效果功能的核心逻辑：
 * - 鼠标位置追踪
 * - 3D 变换计算（旋转角度限制在 ±maxRotation 度）
 * - 悬停状态管理
 * - CSS transform 样式生成
 * 
 * 验证需求：
 * - 需求 2.3: 用户将鼠标悬停在卡片上时应用透视变换效果
 * - 需求 2.4: 根据鼠标位置动态调整旋转角度（最大 ±10 度）
 */

import { describe, it, expect, vi } from 'vitest'
import {
  useCard3D,
  calculateCard3DTransform,
  generateTransformStyle,
  calculateNormalizedMousePosition,
  DEFAULT_MAX_ROTATION,
  DEFAULT_HOVER_SCALE,
  DEFAULT_PERSPECTIVE,
} from '../useCard3D'

/**
 * 创建模拟的 MouseEvent
 */
function createMockMouseEvent(
  clientX: number,
  clientY: number,
  target: HTMLElement
): MouseEvent {
  const event = new MouseEvent('mousemove', {
    clientX,
    clientY,
    bubbles: true,
    cancelable: true,
  })
  
  Object.defineProperty(event, 'currentTarget', {
    value: target,
    writable: false,
  })
  
  return event
}

/**
 * 创建模拟的 HTMLElement
 */
function createMockElement(
  width: number,
  height: number,
  left: number = 0,
  top: number = 0
): HTMLElement {
  const element = document.createElement('div')
  
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

describe('useCard3D', () => {
  describe('初始状态', () => {
    it('初始时不应处于悬停状态', () => {
      const { isHovering } = useCard3D()
      expect(isHovering.value).toBe(false)
    })

    it('初始时鼠标位置应为 (0, 0)', () => {
      const { mouseX, mouseY } = useCard3D()
      expect(mouseX.value).toBe(0)
      expect(mouseY.value).toBe(0)
    })

    it('初始时变换值应为默认值（无旋转，无缩放）', () => {
      const { transform } = useCard3D()
      expect(transform.value).toEqual({
        rotateX: 0,
        rotateY: 0,
        scale: 1,
      })
    })

    it('初始时 transformStyle 应包含默认变换', () => {
      const { transformStyle } = useCard3D()
      expect(transformStyle.value.transform).toContain('perspective(1000px)')
      expect(transformStyle.value.transform).toContain('rotateX(0deg)')
      expect(transformStyle.value.transform).toContain('rotateY(0deg)')
      expect(transformStyle.value.transform).toContain('scale(1)')
    })
  })

  describe('handleMouseEnter', () => {
    it('应将悬停状态设置为 true', () => {
      const { isHovering, handleMouseEnter } = useCard3D()
      
      handleMouseEnter()
      
      expect(isHovering.value).toBe(true)
    })
  })

  describe('handleMouseLeave', () => {
    it('应将悬停状态设置为 false', () => {
      const { isHovering, handleMouseEnter, handleMouseLeave } = useCard3D()
      
      handleMouseEnter()
      expect(isHovering.value).toBe(true)
      
      handleMouseLeave()
      expect(isHovering.value).toBe(false)
    })

    it('应重置鼠标位置到中心', () => {
      const { mouseX, mouseY, handleMouseMove, handleMouseEnter, handleMouseLeave } = useCard3D()
      const element = createMockElement(100, 100)
      
      handleMouseEnter()
      handleMouseMove(createMockMouseEvent(25, 25, element))
      
      expect(mouseX.value).toBe(0.25)
      expect(mouseY.value).toBe(0.25)
      
      handleMouseLeave()
      
      expect(mouseX.value).toBe(0.5)
      expect(mouseY.value).toBe(0.5)
    })

    it('离开后变换值应恢复为默认值', () => {
      const { transform, handleMouseMove, handleMouseEnter, handleMouseLeave } = useCard3D()
      const element = createMockElement(100, 100)
      
      handleMouseEnter()
      handleMouseMove(createMockMouseEvent(25, 25, element))
      
      expect(transform.value.rotateX).not.toBe(0)
      expect(transform.value.rotateY).not.toBe(0)
      
      handleMouseLeave()
      
      expect(transform.value).toEqual({
        rotateX: 0,
        rotateY: 0,
        scale: 1,
      })
    })
  })

  describe('handleMouseMove', () => {
    it('应正确更新鼠标位置（元素中心）', () => {
      const { mouseX, mouseY, handleMouseMove } = useCard3D()
      const element = createMockElement(100, 100, 0, 0)
      
      // 鼠标在元素中心 (50, 50)
      handleMouseMove(createMockMouseEvent(50, 50, element))
      
      expect(mouseX.value).toBe(0.5)
      expect(mouseY.value).toBe(0.5)
    })

    it('应正确更新鼠标位置（元素左上角）', () => {
      const { mouseX, mouseY, handleMouseMove } = useCard3D()
      const element = createMockElement(100, 100, 0, 0)
      
      // 鼠标在元素左上角 (0, 0)
      handleMouseMove(createMockMouseEvent(0, 0, element))
      
      expect(mouseX.value).toBe(0)
      expect(mouseY.value).toBe(0)
    })

    it('应正确更新鼠标位置（元素右下角）', () => {
      const { mouseX, mouseY, handleMouseMove } = useCard3D()
      const element = createMockElement(100, 100, 0, 0)
      
      // 鼠标在元素右下角 (100, 100)
      handleMouseMove(createMockMouseEvent(100, 100, element))
      
      expect(mouseX.value).toBe(1)
      expect(mouseY.value).toBe(1)
    })

    it('应正确处理带偏移的元素', () => {
      const { mouseX, mouseY, handleMouseMove } = useCard3D()
      const element = createMockElement(100, 100, 50, 50)
      
      // 鼠标在元素中心 (100, 100)，元素偏移 (50, 50)
      handleMouseMove(createMockMouseEvent(100, 100, element))
      
      expect(mouseX.value).toBe(0.5)
      expect(mouseY.value).toBe(0.5)
    })

    it('当 currentTarget 为 null 时不应更新位置', () => {
      const { mouseX, mouseY, handleMouseMove } = useCard3D()
      const event = new MouseEvent('mousemove', { clientX: 50, clientY: 50 })
      
      handleMouseMove(event)
      
      expect(mouseX.value).toBe(0)
      expect(mouseY.value).toBe(0)
    })
  })

  describe('transform 计算', () => {
    it('悬停时鼠标在中心应产生零旋转', () => {
      const { transform, handleMouseMove, handleMouseEnter } = useCard3D()
      const element = createMockElement(100, 100)
      
      handleMouseEnter()
      handleMouseMove(createMockMouseEvent(50, 50, element))
      
      // 使用 toBeCloseTo 避免 -0 和 +0 的比较问题
      expect(transform.value.rotateX).toBeCloseTo(0)
      expect(transform.value.rotateY).toBeCloseTo(0)
      expect(transform.value.scale).toBe(DEFAULT_HOVER_SCALE)
    })

    it('悬停时鼠标在左上角应产生正确的旋转', () => {
      const { transform, handleMouseMove, handleMouseEnter } = useCard3D(10)
      const element = createMockElement(100, 100)
      
      handleMouseEnter()
      handleMouseMove(createMockMouseEvent(0, 0, element))
      
      // mouseX = 0, mouseY = 0
      // rotateY = (0 - 0.5) * 10 = -5
      // rotateX = (0 - 0.5) * 10 * -1 = 5
      expect(transform.value.rotateY).toBe(-5)
      expect(transform.value.rotateX).toBe(5)
    })

    it('悬停时鼠标在右下角应产生正确的旋转', () => {
      const { transform, handleMouseMove, handleMouseEnter } = useCard3D(10)
      const element = createMockElement(100, 100)
      
      handleMouseEnter()
      handleMouseMove(createMockMouseEvent(100, 100, element))
      
      // mouseX = 1, mouseY = 1
      // rotateY = (1 - 0.5) * 10 = 5
      // rotateX = (1 - 0.5) * 10 * -1 = -5
      expect(transform.value.rotateY).toBe(5)
      expect(transform.value.rotateX).toBe(-5)
    })

    it('应支持自定义最大旋转角度', () => {
      const { transform, handleMouseMove, handleMouseEnter } = useCard3D(20)
      const element = createMockElement(100, 100)
      
      handleMouseEnter()
      handleMouseMove(createMockMouseEvent(100, 100, element))
      
      // mouseX = 1, mouseY = 1
      // rotateY = (1 - 0.5) * 20 = 10
      // rotateX = (1 - 0.5) * 20 * -1 = -10
      expect(transform.value.rotateY).toBe(10)
      expect(transform.value.rotateX).toBe(-10)
    })

    it('非悬停状态应返回默认变换值', () => {
      const { transform, handleMouseMove } = useCard3D()
      const element = createMockElement(100, 100)
      
      // 不调用 handleMouseEnter，直接移动鼠标
      handleMouseMove(createMockMouseEvent(100, 100, element))
      
      expect(transform.value).toEqual({
        rotateX: 0,
        rotateY: 0,
        scale: 1,
      })
    })
  })

  describe('transformStyle', () => {
    it('应生成正确的 CSS transform 字符串', () => {
      const { transformStyle, handleMouseMove, handleMouseEnter } = useCard3D(10)
      const element = createMockElement(100, 100)
      
      handleMouseEnter()
      handleMouseMove(createMockMouseEvent(100, 100, element))
      
      const style = transformStyle.value.transform
      expect(style).toContain('perspective(1000px)')
      expect(style).toContain('rotateX(-5deg)')
      expect(style).toContain('rotateY(5deg)')
      expect(style).toContain('scale(1.02)')
    })
  })

  describe('reset', () => {
    it('应重置所有状态', () => {
      const { isHovering, mouseX, mouseY, handleMouseMove, handleMouseEnter, reset } = useCard3D()
      const element = createMockElement(100, 100)
      
      handleMouseEnter()
      handleMouseMove(createMockMouseEvent(75, 75, element))
      
      expect(isHovering.value).toBe(true)
      expect(mouseX.value).toBe(0.75)
      expect(mouseY.value).toBe(0.75)
      
      reset()
      
      expect(isHovering.value).toBe(false)
      expect(mouseX.value).toBe(0)
      expect(mouseY.value).toBe(0)
    })
  })
})

describe('calculateCard3DTransform', () => {
  it('非悬停状态应返回默认值', () => {
    const result = calculateCard3DTransform(0.5, 0.5, 10, false)
    
    expect(result).toEqual({
      rotateX: 0,
      rotateY: 0,
      scale: 1,
    })
  })

  it('悬停时鼠标在中心应返回零旋转', () => {
    const result = calculateCard3DTransform(0.5, 0.5, 10, true)
    
    // 使用 toBeCloseTo 避免 -0 和 +0 的比较问题
    expect(result.rotateX).toBeCloseTo(0)
    expect(result.rotateY).toBeCloseTo(0)
    expect(result.scale).toBe(DEFAULT_HOVER_SCALE)
  })

  it('悬停时鼠标在左边应产生负 Y 旋转', () => {
    const result = calculateCard3DTransform(0, 0.5, 10, true)
    
    // rotateY = (0 - 0.5) * 10 = -5
    expect(result.rotateY).toBe(-5)
    // 使用 toBeCloseTo 避免 -0 和 +0 的比较问题
    expect(result.rotateX).toBeCloseTo(0)
  })

  it('悬停时鼠标在右边应产生正 Y 旋转', () => {
    const result = calculateCard3DTransform(1, 0.5, 10, true)
    
    // rotateY = (1 - 0.5) * 10 = 5
    expect(result.rotateY).toBe(5)
    // 使用 toBeCloseTo 避免 -0 和 +0 的比较问题
    expect(result.rotateX).toBeCloseTo(0)
  })

  it('悬停时鼠标在上方应产生正 X 旋转', () => {
    const result = calculateCard3DTransform(0.5, 0, 10, true)
    
    // rotateX = (0 - 0.5) * 10 * -1 = 5
    expect(result.rotateX).toBe(5)
    expect(result.rotateY).toBe(0)
  })

  it('悬停时鼠标在下方应产生负 X 旋转', () => {
    const result = calculateCard3DTransform(0.5, 1, 10, true)
    
    // rotateX = (1 - 0.5) * 10 * -1 = -5
    expect(result.rotateX).toBe(-5)
    expect(result.rotateY).toBe(0)
  })

  it('旋转角度应在 ±maxRotation/2 范围内', () => {
    const maxRotation = 10
    
    // 测试极端位置
    const topLeft = calculateCard3DTransform(0, 0, maxRotation, true)
    const bottomRight = calculateCard3DTransform(1, 1, maxRotation, true)
    
    // 最大旋转角度应为 maxRotation / 2 = 5
    expect(Math.abs(topLeft.rotateX)).toBeLessThanOrEqual(maxRotation / 2)
    expect(Math.abs(topLeft.rotateY)).toBeLessThanOrEqual(maxRotation / 2)
    expect(Math.abs(bottomRight.rotateX)).toBeLessThanOrEqual(maxRotation / 2)
    expect(Math.abs(bottomRight.rotateY)).toBeLessThanOrEqual(maxRotation / 2)
  })
})

describe('generateTransformStyle', () => {
  it('应生成正确的 CSS transform 字符串', () => {
    const transform = { rotateX: 5, rotateY: -3, scale: 1.02 }
    const result = generateTransformStyle(transform)
    
    expect(result.transform).toBe('perspective(1000px) rotateX(5deg) rotateY(-3deg) scale(1.02)')
  })

  it('应支持自定义透视距离', () => {
    const transform = { rotateX: 0, rotateY: 0, scale: 1 }
    const result = generateTransformStyle(transform, 500)
    
    expect(result.transform).toContain('perspective(500px)')
  })

  it('默认透视距离应为 1000px', () => {
    const transform = { rotateX: 0, rotateY: 0, scale: 1 }
    const result = generateTransformStyle(transform)
    
    expect(result.transform).toContain('perspective(1000px)')
  })
})

describe('calculateNormalizedMousePosition', () => {
  it('应正确计算归一化位置（元素中心）', () => {
    const element = createMockElement(100, 100, 0, 0)
    const event = createMockMouseEvent(50, 50, element)
    
    const result = calculateNormalizedMousePosition(event)
    
    expect(result).toEqual({ x: 0.5, y: 0.5 })
  })

  it('应正确计算归一化位置（元素左上角）', () => {
    const element = createMockElement(100, 100, 0, 0)
    const event = createMockMouseEvent(0, 0, element)
    
    const result = calculateNormalizedMousePosition(event)
    
    expect(result).toEqual({ x: 0, y: 0 })
  })

  it('应正确计算归一化位置（元素右下角）', () => {
    const element = createMockElement(100, 100, 0, 0)
    const event = createMockMouseEvent(100, 100, element)
    
    const result = calculateNormalizedMousePosition(event)
    
    expect(result).toEqual({ x: 1, y: 1 })
  })

  it('应正确处理带偏移的元素', () => {
    const element = createMockElement(100, 100, 50, 50)
    const event = createMockMouseEvent(100, 100, element)
    
    const result = calculateNormalizedMousePosition(event)
    
    expect(result).toEqual({ x: 0.5, y: 0.5 })
  })

  it('当 currentTarget 为 null 时应返回 null', () => {
    const event = new MouseEvent('mousemove', { clientX: 50, clientY: 50 })
    
    const result = calculateNormalizedMousePosition(event)
    
    expect(result).toBeNull()
  })

  it('当元素宽度为 0 时应返回 null', () => {
    const element = createMockElement(0, 100, 0, 0)
    const event = createMockMouseEvent(50, 50, element)
    
    const result = calculateNormalizedMousePosition(event)
    
    expect(result).toBeNull()
  })

  it('当元素高度为 0 时应返回 null', () => {
    const element = createMockElement(100, 0, 0, 0)
    const event = createMockMouseEvent(50, 50, element)
    
    const result = calculateNormalizedMousePosition(event)
    
    expect(result).toBeNull()
  })
})

describe('常量', () => {
  it('DEFAULT_MAX_ROTATION 应为 10', () => {
    expect(DEFAULT_MAX_ROTATION).toBe(10)
  })

  it('DEFAULT_HOVER_SCALE 应为 1.02', () => {
    expect(DEFAULT_HOVER_SCALE).toBe(1.02)
  })

  it('DEFAULT_PERSPECTIVE 应为 1000', () => {
    expect(DEFAULT_PERSPECTIVE).toBe(1000)
  })
})
