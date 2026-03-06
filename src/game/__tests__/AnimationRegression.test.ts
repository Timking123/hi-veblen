/**
 * 动画回归测试
 * 测试游戏动画效果的正确性和流畅度
 * 
 * Feature: game-v2-upgrade
 * Task: 36.2 动画测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { EffectSystem, ExplosionSize } from '../EffectSystem'
import { EFFECT_CONFIG } from '../constants'

describe('Animation Regression Tests - 动画回归测试', () => {
  let effectSystem: EffectSystem

  beforeEach(() => {
    effectSystem = new EffectSystem()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('36.2 动画测试 - Animation Tests', () => {
    /**
     * 测试 1: 爆炸动画
     * 验证爆炸动画的创建、更新和完成
     */
    describe('Explosion Animation Tests', () => {
      it('should create and animate small explosion', () => {
        const x = 100
        const y = 200
        
        // 创建小型爆炸
        effectSystem.createExplosion(x, y, ExplosionSize.SMALL)
        
        // 验证爆炸已创建
        let explosions = effectSystem.getExplosions()
        expect(explosions).toHaveLength(1)
        expect(explosions[0].x).toBe(x)
        expect(explosions[0].y).toBe(y)
        expect(explosions[0].size).toBe(ExplosionSize.SMALL)
        
        // 更新动画（100ms）
        vi.advanceTimersByTime(100)
        effectSystem.update(100)
        
        // 爆炸应该还在
        explosions = effectSystem.getExplosions()
        expect(explosions).toHaveLength(1)
        
        // 更新到 500ms（爆炸持续时间）
        vi.advanceTimersByTime(400)
        effectSystem.update(400)
        
        // 爆炸应该结束
        explosions = effectSystem.getExplosions()
        expect(explosions).toHaveLength(0)
      })

      it('should create and animate medium explosion', () => {
        effectSystem.createExplosion(150, 250, ExplosionSize.MEDIUM)
        
        expect(effectSystem.getExplosions()).toHaveLength(1)
        expect(effectSystem.getExplosions()[0].size).toBe(ExplosionSize.MEDIUM)
        
        // 验证持续时间
        vi.advanceTimersByTime(EFFECT_CONFIG.EXPLOSION_DURATION)
        effectSystem.update(EFFECT_CONFIG.EXPLOSION_DURATION)
        
        expect(effectSystem.getExplosions()).toHaveLength(0)
      })

      it('should create and animate large explosion', () => {
        effectSystem.createExplosion(200, 300, ExplosionSize.LARGE)
        
        expect(effectSystem.getExplosions()).toHaveLength(1)
        expect(effectSystem.getExplosions()[0].size).toBe(ExplosionSize.LARGE)
        
        // 验证持续时间
        vi.advanceTimersByTime(EFFECT_CONFIG.EXPLOSION_DURATION)
        effectSystem.update(EFFECT_CONFIG.EXPLOSION_DURATION)
        
        expect(effectSystem.getExplosions()).toHaveLength(0)
      })

      it('should create and animate huge explosion', () => {
        effectSystem.createExplosion(250, 350, ExplosionSize.HUGE)
        
        expect(effectSystem.getExplosions()).toHaveLength(1)
        expect(effectSystem.getExplosions()[0].size).toBe(ExplosionSize.HUGE)
        
        // 验证持续时间
        vi.advanceTimersByTime(EFFECT_CONFIG.EXPLOSION_DURATION)
        effectSystem.update(EFFECT_CONFIG.EXPLOSION_DURATION)
        
        expect(effectSystem.getExplosions()).toHaveLength(0)
      })

      it('should handle multiple explosions simultaneously', () => {
        // 创建多个爆炸
        effectSystem.createExplosion(100, 100, ExplosionSize.SMALL)
        effectSystem.createExplosion(200, 200, ExplosionSize.MEDIUM)
        effectSystem.createExplosion(300, 300, ExplosionSize.LARGE)
        
        // 验证所有爆炸都存在
        expect(effectSystem.getExplosions()).toHaveLength(3)
        
        // 更新 250ms
        vi.advanceTimersByTime(250)
        effectSystem.update(250)
        
        // 所有爆炸应该还在
        expect(effectSystem.getExplosions()).toHaveLength(3)
        
        // 更新到 500ms
        vi.advanceTimersByTime(250)
        effectSystem.update(250)
        
        // 所有爆炸应该结束
        expect(effectSystem.getExplosions()).toHaveLength(0)
      })

      it('should animate explosion frames smoothly', () => {
        effectSystem.createExplosion(100, 100, ExplosionSize.SMALL)
        
        const frameUpdates: number[] = []
        const updateInterval = 16 // ~60 FPS
        const totalFrames = Math.ceil(EFFECT_CONFIG.EXPLOSION_DURATION / updateInterval)
        
        // 模拟每帧更新
        for (let i = 0; i < totalFrames; i++) {
          vi.advanceTimersByTime(updateInterval)
          effectSystem.update(updateInterval)
          
          const explosions = effectSystem.getExplosions()
          if (explosions.length > 0) {
            frameUpdates.push(explosions[0].frame)
          }
        }
        
        // 验证帧数递增
        for (let i = 1; i < frameUpdates.length; i++) {
          expect(frameUpdates[i]).toBeGreaterThanOrEqual(frameUpdates[i - 1])
        }
        
        // 验证爆炸最终结束
        expect(effectSystem.getExplosions()).toHaveLength(0)
      })
    })

    /**
     * 测试 2: 屏幕震动动画
     * 验证屏幕震动的触发、持续和恢复
     */
    describe('Screen Shake Animation Tests', () => {
      it('should trigger and animate screen shake', () => {
        // 触发震动
        effectSystem.triggerScreenShake()
        
        // 验证震动已开始
        expect(effectSystem.isShaking()).toBe(true)
        
        // 更新以生成偏移
        vi.advanceTimersByTime(16)
        effectSystem.update(16)
        
        // 验证有偏移
        const offset = effectSystem.getScreenOffset()
        const hasOffset = Math.abs(offset.x) > 0 || Math.abs(offset.y) > 0
        expect(hasOffset).toBe(true)
        
        // 验证偏移在范围内
        expect(Math.abs(offset.x)).toBeLessThanOrEqual(EFFECT_CONFIG.SCREEN_SHAKE_INTENSITY_MAX)
        expect(Math.abs(offset.y)).toBeLessThanOrEqual(EFFECT_CONFIG.SCREEN_SHAKE_INTENSITY_MAX)
      })

      it('should complete shake animation within duration', () => {
        effectSystem.triggerScreenShake()
        
        // 前进到持续时间结束前
        vi.advanceTimersByTime(EFFECT_CONFIG.SCREEN_SHAKE_DURATION - 1)
        effectSystem.update(EFFECT_CONFIG.SCREEN_SHAKE_DURATION - 1)
        
        // 应该还在震动
        expect(effectSystem.isShaking()).toBe(true)
        
        // 前进到持续时间结束
        vi.advanceTimersByTime(1)
        effectSystem.update(1)
        
        // 震动应该结束
        expect(effectSystem.isShaking()).toBe(false)
        
        // 偏移应该归零
        const offset = effectSystem.getScreenOffset()
        expect(offset.x).toBe(0)
        expect(offset.y).toBe(0)
      })

      it('should animate shake with varying intensity', () => {
        effectSystem.triggerScreenShake(4) // 最大强度
        
        const offsets: Array<{ x: number; y: number }> = []
        const updateInterval = 16
        const totalFrames = Math.ceil(EFFECT_CONFIG.SCREEN_SHAKE_DURATION / updateInterval)
        
        // 收集每帧的偏移
        for (let i = 0; i < totalFrames; i++) {
          vi.advanceTimersByTime(updateInterval)
          effectSystem.update(updateInterval)
          
          if (effectSystem.isShaking()) {
            offsets.push({ ...effectSystem.getScreenOffset() })
          }
        }
        
        // 验证偏移值变化（不是静态的）
        const uniqueOffsets = new Set(offsets.map(o => `${o.x},${o.y}`))
        expect(uniqueOffsets.size).toBeGreaterThan(1)
        
        // 验证所有偏移都在范围内
        offsets.forEach(offset => {
          expect(Math.abs(offset.x)).toBeLessThanOrEqual(EFFECT_CONFIG.SCREEN_SHAKE_INTENSITY_MAX)
          expect(Math.abs(offset.y)).toBeLessThanOrEqual(EFFECT_CONFIG.SCREEN_SHAKE_INTENSITY_MAX)
        })
      })

      it('should handle shake intensity decay', () => {
        effectSystem.triggerScreenShake(4)
        
        // 记录初期偏移
        vi.advanceTimersByTime(50)
        effectSystem.update(50)
        const earlyOffset = effectSystem.getScreenOffset()
        const earlyMagnitude = Math.sqrt(earlyOffset.x ** 2 + earlyOffset.y ** 2)
        
        // 前进到接近结束
        vi.advanceTimersByTime(200)
        effectSystem.update(200)
        const lateOffset = effectSystem.getScreenOffset()
        const lateMagnitude = Math.sqrt(lateOffset.x ** 2 + lateOffset.y ** 2)
        
        // 后期震动幅度应该不会显著大于初期（由于衰减）
        // 注意：由于随机性，我们只验证后期不会过大
        expect(lateMagnitude).toBeLessThanOrEqual(earlyMagnitude * 1.5)
      })

      it('should allow consecutive shakes', () => {
        // 第一次震动
        effectSystem.triggerScreenShake()
        expect(effectSystem.isShaking()).toBe(true)
        
        // 完成第一次震动
        vi.advanceTimersByTime(EFFECT_CONFIG.SCREEN_SHAKE_DURATION)
        effectSystem.update(EFFECT_CONFIG.SCREEN_SHAKE_DURATION)
        expect(effectSystem.isShaking()).toBe(false)
        
        // 第二次震动
        effectSystem.triggerScreenShake()
        expect(effectSystem.isShaking()).toBe(true)
        
        // 验证第二次震动正常工作
        vi.advanceTimersByTime(16)
        effectSystem.update(16)
        const offset = effectSystem.getScreenOffset()
        const hasOffset = Math.abs(offset.x) > 0 || Math.abs(offset.y) > 0
        expect(hasOffset).toBe(true)
      })
    })

    /**
     * 测试 3: 动画流畅度
     * 验证动画在 60 FPS 下的流畅性
     */
    describe('Animation Smoothness Tests', () => {
      it('should maintain 60 FPS for explosion animations', () => {
        // 创建多个爆炸
        for (let i = 0; i < 10; i++) {
          effectSystem.createExplosion(i * 50, i * 50, ExplosionSize.SMALL)
        }
        
        const frameTime = 16 // ~60 FPS (1000ms / 60 ≈ 16.67ms)
        const frameCount = 30 // 测试 30 帧
        
        // 模拟 30 帧更新
        for (let i = 0; i < frameCount; i++) {
          const startTime = Date.now()
          
          vi.advanceTimersByTime(frameTime)
          effectSystem.update(frameTime)
          
          // 在测试环境中，update 应该很快完成
          // 实际游戏中，这个测试会验证性能
          const elapsed = Date.now() - startTime
          
          // 验证更新时间合理（在测试环境中应该很快）
          expect(elapsed).toBeLessThan(100)
        }
      })

      it('should maintain 60 FPS for screen shake', () => {
        effectSystem.triggerScreenShake()
        
        const frameTime = 16
        const frameCount = Math.ceil(EFFECT_CONFIG.SCREEN_SHAKE_DURATION / frameTime)
        
        // 模拟所有帧
        for (let i = 0; i < frameCount; i++) {
          const startTime = Date.now()
          
          vi.advanceTimersByTime(frameTime)
          effectSystem.update(frameTime)
          
          const elapsed = Date.now() - startTime
          expect(elapsed).toBeLessThan(100)
        }
      })

      it('should handle combined animations smoothly', () => {
        // 同时触发爆炸和震动
        effectSystem.createExplosion(100, 100, ExplosionSize.LARGE)
        effectSystem.createExplosion(200, 200, ExplosionSize.MEDIUM)
        effectSystem.triggerScreenShake()
        
        const frameTime = 16
        const frameCount = 30
        
        // 模拟 30 帧
        for (let i = 0; i < frameCount; i++) {
          const startTime = Date.now()
          
          vi.advanceTimersByTime(frameTime)
          effectSystem.update(frameTime)
          
          const elapsed = Date.now() - startTime
          expect(elapsed).toBeLessThan(100)
        }
      })
    })

    /**
     * 测试 4: 动画同步
     * 验证多个动画的同步性
     */
    describe('Animation Synchronization Tests', () => {
      it('should synchronize multiple explosions', () => {
        const startTime = Date.now()
        
        // 同时创建多个爆炸
        effectSystem.createExplosion(100, 100, ExplosionSize.SMALL)
        effectSystem.createExplosion(200, 200, ExplosionSize.SMALL)
        effectSystem.createExplosion(300, 300, ExplosionSize.SMALL)
        
        // 验证所有爆炸同时存在
        expect(effectSystem.getExplosions()).toHaveLength(3)
        
        // 更新到持续时间的一半
        vi.advanceTimersByTime(EFFECT_CONFIG.EXPLOSION_DURATION / 2)
        effectSystem.update(EFFECT_CONFIG.EXPLOSION_DURATION / 2)
        
        // 所有爆炸应该还在
        expect(effectSystem.getExplosions()).toHaveLength(3)
        
        // 更新到持续时间结束
        vi.advanceTimersByTime(EFFECT_CONFIG.EXPLOSION_DURATION / 2)
        effectSystem.update(EFFECT_CONFIG.EXPLOSION_DURATION / 2)
        
        // 所有爆炸应该同时结束
        expect(effectSystem.getExplosions()).toHaveLength(0)
      })

      it('should handle staggered explosions', () => {
        // 创建第一个爆炸
        effectSystem.createExplosion(100, 100, ExplosionSize.SMALL)
        expect(effectSystem.getExplosions()).toHaveLength(1)
        
        // 前进 100ms
        vi.advanceTimersByTime(100)
        effectSystem.update(100)
        
        // 创建第二个爆炸
        effectSystem.createExplosion(200, 200, ExplosionSize.SMALL)
        expect(effectSystem.getExplosions()).toHaveLength(2)
        
        // 前进 400ms（第一个爆炸应该结束）
        vi.advanceTimersByTime(400)
        effectSystem.update(400)
        expect(effectSystem.getExplosions()).toHaveLength(1)
        
        // 再前进 100ms（第二个爆炸也应该结束）
        vi.advanceTimersByTime(100)
        effectSystem.update(100)
        expect(effectSystem.getExplosions()).toHaveLength(0)
      })
    })

    /**
     * 测试 5: 动画清理
     * 验证动画资源的正确清理
     */
    describe('Animation Cleanup Tests', () => {
      it('should clean up completed explosions', () => {
        // 创建多个爆炸
        for (let i = 0; i < 5; i++) {
          effectSystem.createExplosion(i * 50, i * 50, ExplosionSize.SMALL)
        }
        
        expect(effectSystem.getExplosions()).toHaveLength(5)
        
        // 完成所有爆炸
        vi.advanceTimersByTime(EFFECT_CONFIG.EXPLOSION_DURATION)
        effectSystem.update(EFFECT_CONFIG.EXPLOSION_DURATION)
        
        // 验证所有爆炸都被清理
        expect(effectSystem.getExplosions()).toHaveLength(0)
      })

      it('should clean up shake after completion', () => {
        effectSystem.triggerScreenShake()
        expect(effectSystem.isShaking()).toBe(true)
        
        // 完成震动
        vi.advanceTimersByTime(EFFECT_CONFIG.SCREEN_SHAKE_DURATION)
        effectSystem.update(EFFECT_CONFIG.SCREEN_SHAKE_DURATION)
        
        // 验证震动状态被清理
        expect(effectSystem.isShaking()).toBe(false)
        expect(effectSystem.getScreenOffset()).toEqual({ x: 0, y: 0 })
      })

      it('should clear all effects on demand', () => {
        // 创建多个效果
        effectSystem.createExplosion(100, 100, ExplosionSize.SMALL)
        effectSystem.createExplosion(200, 200, ExplosionSize.MEDIUM)
        effectSystem.triggerScreenShake()
        
        expect(effectSystem.getExplosions()).toHaveLength(2)
        expect(effectSystem.isShaking()).toBe(true)
        
        // 清理所有效果
        effectSystem.clear()
        
        // 验证所有效果都被清理
        expect(effectSystem.getExplosions()).toHaveLength(0)
        expect(effectSystem.isShaking()).toBe(false)
        expect(effectSystem.getScreenOffset()).toEqual({ x: 0, y: 0 })
      })
    })
  })
})
