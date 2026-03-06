/**
 * EffectSystem 属性测试
 * Feature: project-audit-upgrade
 * Property 11: reducedMotion 禁用屏幕震动
 * 
 * 验证需求: 9.1
 */

import { describe, it, expect, beforeEach } from 'vitest'
import fc from 'fast-check'
import { EffectSystem } from '../EffectSystem'

describe('EffectSystem 属性测试', () => {
  let effectSystem: EffectSystem

  beforeEach(() => {
    effectSystem = new EffectSystem()
  })

  /**
   * Property 11: reducedMotion 禁用屏幕震动
   * 
   * For any EffectSystem 实例，当 reducedMotion 设置为 true 时，
   * 无论调用多少次 triggerScreenShake，getScreenOffset 返回的偏移量应始终为 {x: 0, y: 0}
   * 
   * Validates: Requirements 9.1
   */
  it('Property 11: reducedMotion 为 true 时应禁用所有屏幕震动', () => {
    fc.assert(
      fc.property(
        // 生成随机的震动强度数组（1-10 次调用）
        fc.array(fc.float({ min: 1, max: 20 }), { minLength: 1, maxLength: 10 }),
        (intensities) => {
          // 启用 reducedMotion
          effectSystem.setReducedMotion(true)

          // 多次触发屏幕震动
          intensities.forEach(intensity => {
            effectSystem.triggerScreenShake(intensity)
          })

          // 更新效果系统（模拟游戏循环）
          effectSystem.update(16) // 16ms ≈ 60fps

          // 验证：屏幕偏移应始终为 0
          const offset = effectSystem.getScreenOffset()
          expect(offset.x).toBe(0)
          expect(offset.y).toBe(0)

          // 验证：不应处于震动状态
          expect(effectSystem.isShaking()).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 11 (边界情况): reducedMotion 切换后应立即停止震动', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 5, max: 15 }),
        (intensity) => {
          // 先不启用 reducedMotion，触发震动
          effectSystem.setReducedMotion(false)
          effectSystem.triggerScreenShake(intensity)

          // 验证震动已激活
          expect(effectSystem.isShaking()).toBe(true)

          // 启用 reducedMotion
          effectSystem.setReducedMotion(true)

          // 验证：震动应立即停止
          expect(effectSystem.isShaking()).toBe(false)
          const offset = effectSystem.getScreenOffset()
          expect(offset.x).toBe(0)
          expect(offset.y).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 11 (对比测试): reducedMotion 为 false 时震动应正常工作', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 5, max: 15 }),
        (intensity) => {
          // 不启用 reducedMotion
          effectSystem.setReducedMotion(false)
          effectSystem.triggerScreenShake(intensity)

          // 验证震动已激活
          expect(effectSystem.isShaking()).toBe(true)

          // 更新效果系统
          effectSystem.update(16)

          // 验证：屏幕偏移不应为 0（震动生效）
          const offset = effectSystem.getScreenOffset()
          const hasOffset = offset.x !== 0 || offset.y !== 0
          expect(hasOffset).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 11 (持久性): reducedMotion 设置应在多次更新后保持有效', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 1, max: 20 }), { minLength: 5, maxLength: 20 }),
        (intensities) => {
          // 启用 reducedMotion
          effectSystem.setReducedMotion(true)

          // 模拟多帧游戏循环
          intensities.forEach(intensity => {
            effectSystem.triggerScreenShake(intensity)
            effectSystem.update(16)

            // 每次更新后验证偏移仍为 0
            const offset = effectSystem.getScreenOffset()
            expect(offset.x).toBe(0)
            expect(offset.y).toBe(0)
            expect(effectSystem.isShaking()).toBe(false)
          })
        }
      ),
      { numRuns: 50 }
    )
  })
})
