/**
 * 弹道速度属性测试
 * 
 * 验证子弹和导弹移动速率的正确性属性
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Bullet } from '../Bullet'
import { Missile } from '../Missile'
import { SHOOTING_CONFIG } from '../../constants'

describe('Projectile Speed Property Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('属性 18: 子弹移动速率', () => {
    /**
     * Feature: game-v2-upgrade, Property 18: 子弹移动速率
     * 
     * *对于任何*机炮子弹，应该每 100ms 向前移动 1 像素块。
     * 
     * **验证需求: 10.1**
     */
    it('should move every 100ms', () => {
      const bullet = new Bullet(100, 100, 2, 20, 'player', 0)
      const initialY = bullet.y
      
      // 立即更新，不应该移动
      bullet.update(0)
      expect(bullet.y).toBe(initialY)
      
      // 前进 99ms，仍然不应该移动
      vi.advanceTimersByTime(99)
      bullet.update(0)
      expect(bullet.y).toBe(initialY)
      
      // 前进到 100ms，应该移动
      vi.advanceTimersByTime(1)
      bullet.update(0)
      expect(bullet.y).toBeLessThan(initialY) // 向上移动，y 减小
    })

    it('should maintain 100ms interval across multiple moves', () => {
      const bullet = new Bullet(100, 100, 2, 20, 'player', 0)
      const movePositions: number[] = [bullet.y]
      
      // 模拟 500ms 的时间
      for (let t = 0; t <= 500; t += 50) {
        bullet.update(0)
        if (bullet.y !== movePositions[movePositions.length - 1]) {
          movePositions.push(bullet.y)
        }
        vi.advanceTimersByTime(50)
      }
      
      // 应该移动了 5 次（100ms, 200ms, 300ms, 400ms, 500ms）
      // 加上初始位置，应该有 6 个不同的位置
      expect(movePositions.length).toBeGreaterThanOrEqual(5)
    })

    it('should use exactly 100ms move interval', () => {
      // 测试移动间隔
      expect(SHOOTING_CONFIG.BULLET_MOVE_INTERVAL).toBe(100)
    })

    it('should move in correct direction for player bullets', () => {
      const bullet = new Bullet(100, 100, 2, 20, 'player', 0)
      const initialY = bullet.y
      
      vi.advanceTimersByTime(100)
      bullet.update(0)
      
      // 玩家子弹应该向上移动（y 减小）
      expect(bullet.y).toBeLessThan(initialY)
    })

    it('should move in correct direction for enemy bullets', () => {
      const bullet = new Bullet(100, 100, 2, 20, 'enemy', 0)
      const initialY = bullet.y
      
      vi.advanceTimersByTime(100)
      bullet.update(0)
      
      // 敌人子弹应该向下移动（y 增大）
      expect(bullet.y).toBeGreaterThan(initialY)
    })
  })

  describe('属性 19: 导弹移动速率', () => {
    /**
     * Feature: game-v2-upgrade, Property 19: 导弹移动速率
     * 
     * *对于任何*导弹，应该每 150ms 向前移动 1 像素块。
     * 
     * **验证需求: 10.2**
     */
    it('should move every 150ms', () => {
      const missile = new Missile(100, 100, 5, 12, 3, 'player', 0)
      const initialY = missile.y
      
      // 立即更新，不应该移动
      missile.update(0)
      expect(missile.y).toBe(initialY)
      
      // 前进 149ms，仍然不应该移动
      vi.advanceTimersByTime(149)
      missile.update(0)
      expect(missile.y).toBe(initialY)
      
      // 前进到 150ms，应该移动
      vi.advanceTimersByTime(1)
      missile.update(0)
      expect(missile.y).toBeLessThan(initialY) // 向上移动，y 减小
    })

    it('should maintain 150ms interval across multiple moves', () => {
      const missile = new Missile(100, 100, 5, 12, 3, 'player', 0)
      const movePositions: number[] = [missile.y]
      
      // 模拟 750ms 的时间
      for (let t = 0; t <= 750; t += 50) {
        missile.update(0)
        if (missile.y !== movePositions[movePositions.length - 1]) {
          movePositions.push(missile.y)
        }
        vi.advanceTimersByTime(50)
      }
      
      // 应该移动了 5 次（150ms, 300ms, 450ms, 600ms, 750ms）
      // 加上初始位置，应该有 6 个不同的位置
      expect(movePositions.length).toBeGreaterThanOrEqual(5)
    })

    it('should use exactly 150ms move interval', () => {
      // 测试移动间隔
      expect(SHOOTING_CONFIG.MISSILE_MOVE_INTERVAL).toBe(150)
    })

    it('should move in correct direction for player missiles', () => {
      const missile = new Missile(100, 100, 5, 12, 3, 'player', 0)
      const initialY = missile.y
      
      vi.advanceTimersByTime(150)
      missile.update(0)
      
      // 玩家导弹应该向上移动（y 减小）
      expect(missile.y).toBeLessThan(initialY)
    })

    it('should move in correct direction for enemy missiles', () => {
      const missile = new Missile(100, 100, 5, 12, 3, 'enemy', 0)
      const initialY = missile.y
      
      vi.advanceTimersByTime(150)
      missile.update(0)
      
      // 敌人导弹应该向下移动（y 增大）
      expect(missile.y).toBeGreaterThan(initialY)
    })

    it('should not move while exploding', () => {
      const missile = new Missile(100, 100, 5, 12, 3, 'player', 0)
      
      // 触发爆炸
      missile.explode([])
      const explosionY = missile.y
      
      // 前进时间
      vi.advanceTimersByTime(150)
      missile.update(150)
      
      // 爆炸时不应该移动位置
      expect(missile.y).toBe(explosionY)
    })
  })

  describe('Bullet vs Missile Speed Comparison', () => {
    it('should have different move intervals', () => {
      expect(SHOOTING_CONFIG.BULLET_MOVE_INTERVAL).toBe(100)
      expect(SHOOTING_CONFIG.MISSILE_MOVE_INTERVAL).toBe(150)
      expect(SHOOTING_CONFIG.MISSILE_MOVE_INTERVAL).toBeGreaterThan(
        SHOOTING_CONFIG.BULLET_MOVE_INTERVAL
      )
    })

    it('should result in bullets moving faster than missiles', () => {
      const bullet = new Bullet(100, 500, 2, 20, 'player', 0)
      const missile = new Missile(200, 500, 5, 12, 3, 'player', 0)
      
      const bulletInitialY = bullet.y
      const missileInitialY = missile.y
      
      // 模拟 300ms
      for (let t = 0; t <= 300; t += 50) {
        bullet.update(0)
        missile.update(0)
        vi.advanceTimersByTime(50)
      }
      
      const bulletDistance = Math.abs(bullet.y - bulletInitialY)
      const missileDistance = Math.abs(missile.y - missileInitialY)
      
      // 子弹应该移动得更远（300ms 内子弹移动 3 次，导弹移动 2 次）
      expect(bulletDistance).toBeGreaterThan(missileDistance)
    })
  })
})
