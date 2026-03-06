/**
 * 武器射速属性测试
 * 
 * 验证武器射速系统的正确性属性
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MachineGun } from '../MachineGun'
import { MissileLauncher } from '../MissileLauncher'
import { SHOOTING_CONFIG } from '../../constants'

describe('Weapon Fire Rate Property Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('属性 10: 玩家机炮射速限制', () => {
    /**
     * Feature: game-v2-upgrade, Property 10: 玩家机炮射速限制
     * 
     * *对于任何*连续的机炮发射，两次发射之间的时间间隔应该不小于 200ms。
     * 
     * **验证需求: 7.1**
     */
    it('should enforce 200ms cooldown for player machine gun', () => {
      const playerGun = new MachineGun(undefined, 'player')
      
      // 第一次发射应该成功
      expect(playerGun.canFire()).toBe(true)
      playerGun.fire(100, 100, 'player')
      
      // 立即尝试第二次发射应该失败
      expect(playerGun.canFire()).toBe(false)
      
      // 前进 199ms，仍然不能发射
      vi.advanceTimersByTime(199)
      expect(playerGun.canFire()).toBe(false)
      
      // 前进到 200ms，应该可以发射
      vi.advanceTimersByTime(1)
      expect(playerGun.canFire()).toBe(true)
    })

    it('should maintain 200ms minimum interval across multiple shots', () => {
      const playerGun = new MachineGun(undefined, 'player')
      const fireAttempts = 10
      const successfulFires: number[] = []
      
      for (let i = 0; i < fireAttempts; i++) {
        if (playerGun.canFire()) {
          playerGun.fire(100, 100, 'player')
          successfulFires.push(Date.now())
        }
        vi.advanceTimersByTime(50) // 尝试每 50ms 发射一次
      }
      
      // 验证所有成功发射之间的间隔都 >= 200ms
      for (let i = 1; i < successfulFires.length; i++) {
        const interval = successfulFires[i] - successfulFires[i - 1]
        expect(interval).toBeGreaterThanOrEqual(SHOOTING_CONFIG.PLAYER_GUN_COOLDOWN)
      }
    })

    it('should use exactly 200ms cooldown for player', () => {
      const playerGun = new MachineGun(undefined, 'player')
      expect(playerGun.config.fireRate).toBe(200)
    })
  })

  describe('属性 11: 敌人机炮射速', () => {
    /**
     * Feature: game-v2-upgrade, Property 11: 敌人机炮射速
     * 
     * *对于任何*敌人的机炮发射，两次发射之间的时间间隔应该为 1000ms。
     * 
     * **验证需求: 7.2**
     */
    it('should enforce 1000ms cooldown for enemy machine gun', () => {
      const enemyGun = new MachineGun(undefined, 'enemy')
      
      // 第一次发射应该成功
      expect(enemyGun.canFire()).toBe(true)
      enemyGun.fire(100, 100, 'enemy')
      
      // 立即尝试第二次发射应该失败
      expect(enemyGun.canFire()).toBe(false)
      
      // 前进 999ms，仍然不能发射
      vi.advanceTimersByTime(999)
      expect(enemyGun.canFire()).toBe(false)
      
      // 前进到 1000ms，应该可以发射
      vi.advanceTimersByTime(1)
      expect(enemyGun.canFire()).toBe(true)
    })

    it('should maintain 1000ms interval across multiple shots', () => {
      const enemyGun = new MachineGun(undefined, 'enemy')
      const fireAttempts = 10
      const successfulFires: number[] = []
      
      for (let i = 0; i < fireAttempts; i++) {
        if (enemyGun.canFire()) {
          enemyGun.fire(100, 100, 'enemy')
          successfulFires.push(Date.now())
        }
        vi.advanceTimersByTime(200) // 尝试每 200ms 发射一次
      }
      
      // 验证所有成功发射之间的间隔都 >= 1000ms
      for (let i = 1; i < successfulFires.length; i++) {
        const interval = successfulFires[i] - successfulFires[i - 1]
        expect(interval).toBeGreaterThanOrEqual(SHOOTING_CONFIG.ENEMY_GUN_COOLDOWN)
      }
    })

    it('should use exactly 1000ms cooldown for enemy', () => {
      const enemyGun = new MachineGun(undefined, 'enemy')
      expect(enemyGun.config.fireRate).toBe(1000)
    })
  })

  describe('属性 20: 导弹单次发射', () => {
    /**
     * Feature: game-v2-upgrade, Property 20: 导弹单次发射
     * 
     * *对于任何*单次 K 键按下（包括长按），应该只发射一枚导弹。
     * 
     * **验证需求: 11.1, 11.2**
     */
    it('should fire only one missile per key press', () => {
      const launcher = new MissileLauncher({ missileCount: 10 })
      
      // 第一次发射应该成功
      expect(launcher.canFire()).toBe(true)
      const missile1 = launcher.fire(100, 100, 40, 'player')
      expect(missile1).not.toBeNull()
      expect(launcher.getMissileCount()).toBe(9)
      
      // 立即尝试第二次发射应该失败（因为 canFireAgain 为 false）
      expect(launcher.canFire()).toBe(false)
      const missile2 = launcher.fire(100, 100, 40, 'player')
      expect(missile2).toBeNull()
      expect(launcher.getMissileCount()).toBe(9) // 数量不变
    })

    it('should not fire continuously when holding key', () => {
      const launcher = new MissileLauncher({ missileCount: 10 })
      const initialCount = launcher.getMissileCount()
      
      // 模拟长按：连续尝试发射多次
      const attempts = 10
      let successfulFires = 0
      
      for (let i = 0; i < attempts; i++) {
        if (launcher.canFire()) {
          const missile = launcher.fire(100, 100, 40, 'player')
          if (missile) {
            successfulFires++
          }
        }
        vi.advanceTimersByTime(50) // 每 50ms 尝试一次
      }
      
      // 应该只发射一次
      expect(successfulFires).toBe(1)
      expect(launcher.getMissileCount()).toBe(initialCount - 1)
    })

    it('should allow firing again after resetFireState is called', () => {
      const launcher = new MissileLauncher({ missileCount: 10 })
      
      // 第一次发射
      launcher.fire(100, 100, 40, 'player')
      expect(launcher.canFire()).toBe(false)
      
      // 重置发射状态（模拟按键释放）
      launcher.resetFireState()
      
      // 现在应该可以再次发射
      expect(launcher.canFire()).toBe(true)
      const missile = launcher.fire(100, 100, 40, 'player')
      expect(missile).not.toBeNull()
      expect(launcher.getMissileCount()).toBe(8)
    })

    it('should handle multiple press-release cycles correctly', () => {
      const launcher = new MissileLauncher({ missileCount: 10 })
      const cycles = 5
      
      for (let i = 0; i < cycles; i++) {
        // 按下并发射
        expect(launcher.canFire()).toBe(true)
        const missile = launcher.fire(100, 100, 40, 'player')
        expect(missile).not.toBeNull()
        
        // 尝试再次发射应该失败
        expect(launcher.canFire()).toBe(false)
        
        // 释放按键
        launcher.resetFireState()
      }
      
      // 应该发射了 5 次
      expect(launcher.getMissileCount()).toBe(5)
    })

    it('should not fire when missile count is zero', () => {
      const launcher = new MissileLauncher({ missileCount: 0 })
      
      expect(launcher.canFire()).toBe(false)
      const missile = launcher.fire(100, 100, 40, 'player')
      expect(missile).toBeNull()
    })
  })

  describe('Player vs Enemy Fire Rate Difference', () => {
    it('should have different fire rates for player and enemy', () => {
      const playerGun = new MachineGun(undefined, 'player')
      const enemyGun = new MachineGun(undefined, 'enemy')
      
      expect(playerGun.config.fireRate).toBe(200)
      expect(enemyGun.config.fireRate).toBe(1000)
      expect(enemyGun.config.fireRate).toBeGreaterThan(playerGun.config.fireRate)
    })

    it('should allow player to fire 5 times while enemy fires once', () => {
      const playerGun = new MachineGun(undefined, 'player')
      const enemyGun = new MachineGun(undefined, 'enemy')
      
      let playerFires = 0
      let enemyFires = 0
      
      // 模拟 1000ms 的时间
      for (let t = 0; t <= 1000; t += 50) {
        if (playerGun.canFire()) {
          playerGun.fire(100, 100, 'player')
          playerFires++
        }
        if (enemyGun.canFire()) {
          enemyGun.fire(100, 100, 'enemy')
          enemyFires++
        }
        vi.advanceTimersByTime(50)
      }
      
      // 玩家应该能发射 5 次（0ms, 200ms, 400ms, 600ms, 800ms, 1000ms = 6次）
      // 敌人应该只能发射 2 次（0ms, 1000ms）
      expect(playerFires).toBeGreaterThanOrEqual(5)
      expect(enemyFires).toBeLessThanOrEqual(2)
    })
  })
})
