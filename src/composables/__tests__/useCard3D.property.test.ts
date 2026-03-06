/**
 * useCard3D Composable 属性测试
 * 
 * Feature: website-enhancement-v2
 * 
 * 使用 fast-check 进行属性测试，验证卡片 3D 变换的核心属性：
 * - 属性 6: 卡片 3D 变换计算
 * 
 * 测试配置：
 * - 测试框架：Vitest + fast-check
 * - 最小迭代次数：每个属性测试至少运行 100 次
 * - 标签格式：Feature: website-enhancement-v2, Property N: {property_text}
 * 
 * 变换计算逻辑：
 * - rotateY = (mouseX - 0.5) * maxRotation
 * - rotateX = (mouseY - 0.5) * maxRotation * -1
 * - 旋转角度范围：[-maxRotation/2, +maxRotation/2]
 * 
 * **Validates: Requirements 2.3, 2.4**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  calculateCard3DTransform,
  DEFAULT_MAX_ROTATION,
  DEFAULT_HOVER_SCALE,
} from '../useCard3D'

// ========== 自定义生成器 ==========

/**
 * 生成归一化的鼠标坐标（0-1 范围）
 * 表示鼠标在卡片上的相对位置
 */
const normalizedCoordinateArb = fc.double({ min: 0, max: 1, noNaN: true })

/**
 * 生成最大旋转角度
 * 约束到合理的范围：1-45 度
 */
const maxRotationArb = fc.double({ min: 1, max: 45, noNaN: true })

/**
 * 生成鼠标位置配置
 * 包含 x 和 y 的归一化坐标
 */
const mousePositionArb = fc.record({
  x: normalizedCoordinateArb,
  y: normalizedCoordinateArb,
})

/**
 * 生成完整的变换计算输入
 * 包含鼠标位置和最大旋转角度
 */
const transformInputArb = fc.record({
  mouseX: normalizedCoordinateArb,
  mouseY: normalizedCoordinateArb,
  maxRotation: maxRotationArb,
})

/**
 * 生成中心位置的鼠标坐标
 * 用于测试中心点旋转为零的属性
 */
const centerPositionArb = fc.constant({ x: 0.5, y: 0.5 })

/**
 * 生成边缘位置的鼠标坐标
 * 用于测试最大旋转角度的属性
 */
const edgePositionArb = fc.oneof(
  fc.constant({ x: 0, y: 0 }),     // 左上角
  fc.constant({ x: 1, y: 0 }),     // 右上角
  fc.constant({ x: 0, y: 1 }),     // 左下角
  fc.constant({ x: 1, y: 1 }),     // 右下角
  fc.constant({ x: 0, y: 0.5 }),   // 左边中点
  fc.constant({ x: 1, y: 0.5 }),   // 右边中点
  fc.constant({ x: 0.5, y: 0 }),   // 上边中点
  fc.constant({ x: 0.5, y: 1 }),   // 下边中点
)

// ========== 测试套件 ==========

describe('useCard3D 属性测试', () => {
  /**
   * 属性 6：卡片 3D 变换计算
   * 
   * *对于任意* 卡片元素和鼠标位置（相对于卡片的 0-1 归一化坐标），
   * 计算出的旋转角度应该在 [-maxRotation, +maxRotation] 范围内，
   * 且鼠标在中心时旋转角度为 0。
   * 
   * **Validates: Requirements 2.3, 2.4**
   */
  describe('Feature: website-enhancement-v2, Property 6: 卡片 3D 变换计算', () => {
    
    // ========== 核心属性：旋转角度范围 ==========
    
    it('旋转角度应在 [-maxRotation/2, +maxRotation/2] 范围内', () => {
      fc.assert(
        fc.property(
          transformInputArb,
          ({ mouseX, mouseY, maxRotation }) => {
            const result = calculateCard3DTransform(mouseX, mouseY, maxRotation, true)
            
            // 根据计算公式：
            // rotateY = (mouseX - 0.5) * maxRotation
            // rotateX = (mouseY - 0.5) * maxRotation * -1
            // 当 mouseX/mouseY 在 [0, 1] 范围内时
            // (mouseX - 0.5) 在 [-0.5, 0.5] 范围内
            // 所以旋转角度在 [-maxRotation/2, +maxRotation/2] 范围内
            const halfMax = maxRotation / 2
            
            expect(result.rotateX).toBeGreaterThanOrEqual(-halfMax - 0.0001)
            expect(result.rotateX).toBeLessThanOrEqual(halfMax + 0.0001)
            expect(result.rotateY).toBeGreaterThanOrEqual(-halfMax - 0.0001)
            expect(result.rotateY).toBeLessThanOrEqual(halfMax + 0.0001)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('使用默认 maxRotation (10度) 时，旋转角度应在 [-5, +5] 范围内', () => {
      fc.assert(
        fc.property(
          mousePositionArb,
          ({ x, y }) => {
            const result = calculateCard3DTransform(x, y, DEFAULT_MAX_ROTATION, true)
            
            // 默认 maxRotation = 10，所以范围是 [-5, +5]
            expect(result.rotateX).toBeGreaterThanOrEqual(-5 - 0.0001)
            expect(result.rotateX).toBeLessThanOrEqual(5 + 0.0001)
            expect(result.rotateY).toBeGreaterThanOrEqual(-5 - 0.0001)
            expect(result.rotateY).toBeLessThanOrEqual(5 + 0.0001)
          }
        ),
        { numRuns: 100 }
      )
    })

    // ========== 核心属性：中心点旋转为零 ==========

    it('鼠标在中心 (0.5, 0.5) 时，旋转角度应为 0', () => {
      fc.assert(
        fc.property(
          maxRotationArb,
          (maxRotation) => {
            const result = calculateCard3DTransform(0.5, 0.5, maxRotation, true)
            
            // 中心点：mouseX = 0.5, mouseY = 0.5
            // rotateY = (0.5 - 0.5) * maxRotation = 0
            // rotateX = (0.5 - 0.5) * maxRotation * -1 = 0
            expect(result.rotateX).toBeCloseTo(0, 10)
            expect(result.rotateY).toBeCloseTo(0, 10)
          }
        ),
        { numRuns: 100 }
      )
    })

    // ========== 旋转方向属性 ==========

    it('鼠标在左侧 (x < 0.5) 时，rotateY 应为负值', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 0.49, noNaN: true }),
          normalizedCoordinateArb,
          maxRotationArb,
          (mouseX, mouseY, maxRotation) => {
            const result = calculateCard3DTransform(mouseX, mouseY, maxRotation, true)
            
            // rotateY = (mouseX - 0.5) * maxRotation
            // 当 mouseX < 0.5 时，rotateY < 0
            expect(result.rotateY).toBeLessThan(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('鼠标在右侧 (x > 0.5) 时，rotateY 应为正值', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.51, max: 1, noNaN: true }),
          normalizedCoordinateArb,
          maxRotationArb,
          (mouseX, mouseY, maxRotation) => {
            const result = calculateCard3DTransform(mouseX, mouseY, maxRotation, true)
            
            // rotateY = (mouseX - 0.5) * maxRotation
            // 当 mouseX > 0.5 时，rotateY > 0
            expect(result.rotateY).toBeGreaterThan(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('鼠标在上方 (y < 0.5) 时，rotateX 应为正值（卡片向上倾斜）', () => {
      fc.assert(
        fc.property(
          normalizedCoordinateArb,
          fc.double({ min: 0, max: 0.49, noNaN: true }),
          maxRotationArb,
          (mouseX, mouseY, maxRotation) => {
            const result = calculateCard3DTransform(mouseX, mouseY, maxRotation, true)
            
            // rotateX = (mouseY - 0.5) * maxRotation * -1
            // 当 mouseY < 0.5 时，(mouseY - 0.5) < 0，乘以 -1 后 rotateX > 0
            expect(result.rotateX).toBeGreaterThan(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('鼠标在下方 (y > 0.5) 时，rotateX 应为负值（卡片向下倾斜）', () => {
      fc.assert(
        fc.property(
          normalizedCoordinateArb,
          fc.double({ min: 0.51, max: 1, noNaN: true }),
          maxRotationArb,
          (mouseX, mouseY, maxRotation) => {
            const result = calculateCard3DTransform(mouseX, mouseY, maxRotation, true)
            
            // rotateX = (mouseY - 0.5) * maxRotation * -1
            // 当 mouseY > 0.5 时，(mouseY - 0.5) > 0，乘以 -1 后 rotateX < 0
            expect(result.rotateX).toBeLessThan(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    // ========== 计算公式验证 ==========

    it('rotateY 计算公式应为 (mouseX - 0.5) * maxRotation', () => {
      fc.assert(
        fc.property(
          transformInputArb,
          ({ mouseX, mouseY, maxRotation }) => {
            const result = calculateCard3DTransform(mouseX, mouseY, maxRotation, true)
            
            const expectedRotateY = (mouseX - 0.5) * maxRotation
            expect(result.rotateY).toBeCloseTo(expectedRotateY, 10)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('rotateX 计算公式应为 (mouseY - 0.5) * maxRotation * -1', () => {
      fc.assert(
        fc.property(
          transformInputArb,
          ({ mouseX, mouseY, maxRotation }) => {
            const result = calculateCard3DTransform(mouseX, mouseY, maxRotation, true)
            
            const expectedRotateX = (mouseY - 0.5) * maxRotation * -1
            expect(result.rotateX).toBeCloseTo(expectedRotateX, 10)
          }
        ),
        { numRuns: 100 }
      )
    })

    // ========== 边缘位置测试 ==========

    it('鼠标在边缘位置时，旋转角度应达到最大值的一半', () => {
      fc.assert(
        fc.property(
          edgePositionArb,
          maxRotationArb,
          (position, maxRotation) => {
            const result = calculateCard3DTransform(position.x, position.y, maxRotation, true)
            
            const halfMax = maxRotation / 2
            
            // 验证旋转角度在允许范围内
            expect(Math.abs(result.rotateX)).toBeLessThanOrEqual(halfMax + 0.0001)
            expect(Math.abs(result.rotateY)).toBeLessThanOrEqual(halfMax + 0.0001)
            
            // 对于角落位置，两个旋转角度都应该达到最大值
            if ((position.x === 0 || position.x === 1) && (position.y === 0 || position.y === 1)) {
              expect(Math.abs(result.rotateX)).toBeCloseTo(halfMax, 5)
              expect(Math.abs(result.rotateY)).toBeCloseTo(halfMax, 5)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('鼠标在左上角 (0, 0) 时，rotateX 应为正，rotateY 应为负', () => {
      fc.assert(
        fc.property(
          maxRotationArb,
          (maxRotation) => {
            const result = calculateCard3DTransform(0, 0, maxRotation, true)
            
            // rotateY = (0 - 0.5) * maxRotation = -maxRotation/2
            // rotateX = (0 - 0.5) * maxRotation * -1 = maxRotation/2
            expect(result.rotateY).toBeCloseTo(-maxRotation / 2, 10)
            expect(result.rotateX).toBeCloseTo(maxRotation / 2, 10)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('鼠标在右下角 (1, 1) 时，rotateX 应为负，rotateY 应为正', () => {
      fc.assert(
        fc.property(
          maxRotationArb,
          (maxRotation) => {
            const result = calculateCard3DTransform(1, 1, maxRotation, true)
            
            // rotateY = (1 - 0.5) * maxRotation = maxRotation/2
            // rotateX = (1 - 0.5) * maxRotation * -1 = -maxRotation/2
            expect(result.rotateY).toBeCloseTo(maxRotation / 2, 10)
            expect(result.rotateX).toBeCloseTo(-maxRotation / 2, 10)
          }
        ),
        { numRuns: 100 }
      )
    })

    // ========== 缩放属性 ==========

    it('悬停时缩放比例应为 DEFAULT_HOVER_SCALE (1.02)', () => {
      fc.assert(
        fc.property(
          transformInputArb,
          ({ mouseX, mouseY, maxRotation }) => {
            const result = calculateCard3DTransform(mouseX, mouseY, maxRotation, true)
            
            expect(result.scale).toBe(DEFAULT_HOVER_SCALE)
          }
        ),
        { numRuns: 100 }
      )
    })

    // ========== 非悬停状态属性 ==========

    it('非悬停状态时，所有变换值应为默认值', () => {
      fc.assert(
        fc.property(
          transformInputArb,
          ({ mouseX, mouseY, maxRotation }) => {
            const result = calculateCard3DTransform(mouseX, mouseY, maxRotation, false)
            
            expect(result.rotateX).toBe(0)
            expect(result.rotateY).toBe(0)
            expect(result.scale).toBe(1)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('非悬停状态时，鼠标位置不应影响变换值', () => {
      fc.assert(
        fc.property(
          mousePositionArb,
          mousePositionArb,
          maxRotationArb,
          (pos1, pos2, maxRotation) => {
            const result1 = calculateCard3DTransform(pos1.x, pos1.y, maxRotation, false)
            const result2 = calculateCard3DTransform(pos2.x, pos2.y, maxRotation, false)
            
            // 非悬停状态下，不同鼠标位置应该产生相同的结果
            expect(result1).toEqual(result2)
          }
        ),
        { numRuns: 100 }
      )
    })

    // ========== 对称性属性 ==========

    it('关于中心点对称的位置应产生相反的旋转角度', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 0.5, noNaN: true }),
          fc.double({ min: 0, max: 0.5, noNaN: true }),
          maxRotationArb,
          (offsetX, offsetY, maxRotation) => {
            // 两个关于中心点对称的位置
            const pos1 = { x: 0.5 - offsetX, y: 0.5 - offsetY }
            const pos2 = { x: 0.5 + offsetX, y: 0.5 + offsetY }
            
            const result1 = calculateCard3DTransform(pos1.x, pos1.y, maxRotation, true)
            const result2 = calculateCard3DTransform(pos2.x, pos2.y, maxRotation, true)
            
            // 对称位置的旋转角度应该相反
            expect(result1.rotateX).toBeCloseTo(-result2.rotateX, 10)
            expect(result1.rotateY).toBeCloseTo(-result2.rotateY, 10)
          }
        ),
        { numRuns: 100 }
      )
    })

    // ========== 线性关系属性 ==========

    it('旋转角度应与鼠标偏移量成线性关系', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.1, max: 0.4, noNaN: true }),
          maxRotationArb,
          (offset, maxRotation) => {
            // 测试两个不同偏移量
            const offset1 = offset
            const offset2 = offset * 2
            
            const result1 = calculateCard3DTransform(0.5 + offset1, 0.5, maxRotation, true)
            const result2 = calculateCard3DTransform(0.5 + offset2, 0.5, maxRotation, true)
            
            // rotateY 应该与偏移量成正比
            // result2.rotateY / result1.rotateY 应该约等于 2
            if (Math.abs(result1.rotateY) > 0.0001) {
              expect(result2.rotateY / result1.rotateY).toBeCloseTo(2, 5)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    // ========== maxRotation 参数影响 ==========

    it('maxRotation 加倍时，旋转角度也应加倍', () => {
      fc.assert(
        fc.property(
          mousePositionArb,
          fc.double({ min: 1, max: 20, noNaN: true }),
          ({ x, y }, baseRotation) => {
            const result1 = calculateCard3DTransform(x, y, baseRotation, true)
            const result2 = calculateCard3DTransform(x, y, baseRotation * 2, true)
            
            // 当 maxRotation 加倍时，旋转角度也应该加倍
            expect(result2.rotateX).toBeCloseTo(result1.rotateX * 2, 10)
            expect(result2.rotateY).toBeCloseTo(result1.rotateY * 2, 10)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // ========== 常量验证 ==========

  describe('常量验证', () => {
    it('DEFAULT_MAX_ROTATION 应为 10', () => {
      expect(DEFAULT_MAX_ROTATION).toBe(10)
    })

    it('DEFAULT_HOVER_SCALE 应为 1.02', () => {
      expect(DEFAULT_HOVER_SCALE).toBe(1.02)
    })
  })
})
