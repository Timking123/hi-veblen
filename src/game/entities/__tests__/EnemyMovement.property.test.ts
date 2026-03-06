/**
 * 敌人移动系统属性测试
 * 
 * 测试属性：
 * - 属性 15: 敌人追踪玩家
 * - 属性 16: 敌人自动下降
 * - 属性 17: 最终 BOSS 位置固定
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Enemy } from '../Enemy'
import { EnemyType } from '../../types'
import { MOVEMENT_CONFIG, PIXEL_BLOCK_CONFIG } from '../../constants'

describe('Enemy Movement System - Property Tests', () => {
  beforeEach(() => {
    // 使用假时间
    vi.useFakeTimers()
  })

  afterEach(() => {
    // 恢复真实时间
    vi.useRealTimers()
  })

  describe('属性 15: 敌人追踪玩家', () => {
    /**
     * **Validates: Requirements 9.1**
     * 
     * 对于任何敌人的移动更新，敌人应该每 500ms 向玩家的 X 坐标方向移动。
     */
    it('should move towards player X coordinate every 500ms - player on left', () => {
      const enemy = new Enemy(EnemyType.WHITE, 400, 100, false, false)
      const initialX = enemy.x
      const playerX = 200 // 玩家在左边
      
      // 第一次调用 trackPlayer，时间未到 500ms，不应该移动
      enemy.trackPlayer(playerX, 300)
      expect(enemy.x).toBe(initialX)
      
      // 前进 500ms
      vi.advanceTimersByTime(MOVEMENT_CONFIG.ENEMY_MOVE_INTERVAL)
      
      // 再次调用 trackPlayer，应该向左移动
      enemy.trackPlayer(playerX, 300)
      expect(enemy.x).toBe(initialX - PIXEL_BLOCK_CONFIG.SIZE)
    })

    it('should move towards player X coordinate every 500ms - player on right', () => {
      const enemy = new Enemy(EnemyType.WHITE, 200, 100, false, false)
      const initialX = enemy.x
      const playerX = 600 // 玩家在右边
      
      // 第一次调用 trackPlayer，时间未到 500ms，不应该移动
      enemy.trackPlayer(playerX, 300)
      expect(enemy.x).toBe(initialX)
      
      // 前进 500ms
      vi.advanceTimersByTime(MOVEMENT_CONFIG.ENEMY_MOVE_INTERVAL)
      
      // 再次调用 trackPlayer，应该向右移动
      enemy.trackPlayer(playerX, 300)
      expect(enemy.x).toBe(initialX + PIXEL_BLOCK_CONFIG.SIZE)
    })

    it('should move exactly 1 pixel block per interval', () => {
      const enemy = new Enemy(EnemyType.GREEN, 400, 100, false, false)
      const initialX = enemy.x
      
      // 前进 500ms
      vi.advanceTimersByTime(MOVEMENT_CONFIG.ENEMY_MOVE_INTERVAL)
      
      // 调用 trackPlayer（玩家在左边）
      enemy.trackPlayer(200, 300)
      
      // 移动距离应该恰好是 1 像素块
      const moveDistance = Math.abs(enemy.x - initialX)
      expect(moveDistance).toBe(PIXEL_BLOCK_CONFIG.SIZE)
    })

    it('should track player continuously over multiple intervals', () => {
      const enemy = new Enemy(EnemyType.BLUE, 500, 100, false, false)
      const initialX = enemy.x
      const playerX = 200 // 玩家在左边
      
      // 移动 3 次
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(MOVEMENT_CONFIG.ENEMY_MOVE_INTERVAL)
        enemy.trackPlayer(playerX, 300)
      }
      
      // 应该向左移动 3 个像素块
      expect(enemy.x).toBe(initialX - PIXEL_BLOCK_CONFIG.SIZE * 3)
    })

    it('should work for elite enemies', () => {
      const enemy = new Enemy(EnemyType.PURPLE, 400, 100, true, false)
      const initialX = enemy.x
      
      vi.advanceTimersByTime(MOVEMENT_CONFIG.ENEMY_MOVE_INTERVAL)
      enemy.trackPlayer(600, 300)
      
      expect(enemy.x).toBe(initialX + PIXEL_BLOCK_CONFIG.SIZE)
    })

    it('should work for boss enemies', () => {
      const enemy = new Enemy(EnemyType.ORANGE, 400, 100, false, true)
      const initialX = enemy.x
      
      vi.advanceTimersByTime(MOVEMENT_CONFIG.ENEMY_MOVE_INTERVAL)
      enemy.trackPlayer(200, 300)
      
      expect(enemy.x).toBe(initialX - PIXEL_BLOCK_CONFIG.SIZE)
    })
  })

  describe('属性 16: 敌人自动下降', () => {
    /**
     * **Validates: Requirements 9.2**
     * 
     * 对于任何非最终 BOSS 的敌人，应该每 500ms 向下移动 1 像素块。
     */
    it('should move down 1 pixel block every 500ms for normal enemies', () => {
      const enemy = new Enemy(EnemyType.WHITE, 400, 100, false, false)
      const initialY = enemy.y
      
      // 第一次调用 trackPlayer，时间未到 500ms，不应该向下移动
      enemy.trackPlayer(400, 300)
      expect(enemy.y).toBe(initialY)
      
      // 前进 500ms
      vi.advanceTimersByTime(MOVEMENT_CONFIG.ENEMY_DOWN_INTERVAL)
      
      // 再次调用 trackPlayer，应该向下移动 1 像素块
      enemy.trackPlayer(400, 300)
      expect(enemy.y).toBe(initialY + PIXEL_BLOCK_CONFIG.SIZE)
    })

    it('should continue moving down at regular intervals', () => {
      const enemy = new Enemy(EnemyType.GREEN, 400, 100, false, false)
      const initialY = enemy.y
      const moveCount = 5
      
      for (let i = 0; i < moveCount; i++) {
        vi.advanceTimersByTime(MOVEMENT_CONFIG.ENEMY_DOWN_INTERVAL)
        enemy.trackPlayer(400, 300)
      }
      
      // 应该向下移动 moveCount 个像素块
      expect(enemy.y).toBe(initialY + PIXEL_BLOCK_CONFIG.SIZE * moveCount)
    })

    it('should move down for elite enemies', () => {
      const enemy = new Enemy(EnemyType.BLUE, 400, 100, true, false)
      const initialY = enemy.y
      
      vi.advanceTimersByTime(MOVEMENT_CONFIG.ENEMY_DOWN_INTERVAL)
      enemy.trackPlayer(400, 300)
      
      expect(enemy.y).toBe(initialY + PIXEL_BLOCK_CONFIG.SIZE)
    })

    it('should move down for non-red boss enemies', () => {
      const enemy = new Enemy(EnemyType.PURPLE, 400, 100, false, true)
      const initialY = enemy.y
      
      vi.advanceTimersByTime(MOVEMENT_CONFIG.ENEMY_DOWN_INTERVAL)
      enemy.trackPlayer(400, 300)
      
      expect(enemy.y).toBe(initialY + PIXEL_BLOCK_CONFIG.SIZE)
    })

    it('should move down for all non-red enemy types', () => {
      const nonRedTypes = [
        EnemyType.WHITE,
        EnemyType.GREEN,
        EnemyType.BLUE,
        EnemyType.PURPLE,
        EnemyType.YELLOW,
        EnemyType.ORANGE
      ]
      
      nonRedTypes.forEach(type => {
        const enemy = new Enemy(type, 400, 100, false, false)
        const initialY = enemy.y
        
        vi.advanceTimersByTime(MOVEMENT_CONFIG.ENEMY_DOWN_INTERVAL)
        enemy.trackPlayer(400, 300)
        
        expect(enemy.y).toBe(initialY + PIXEL_BLOCK_CONFIG.SIZE)
      })
    })
  })

  describe('属性 17: 最终 BOSS 位置固定', () => {
    /**
     * **Validates: Requirements 9.3**
     * 
     * 对于最终 BOSS，Y 坐标应该保持在屏幕最上方不变。
     */
    it('should not move down for final boss (RED boss)', () => {
      // 创建最终 BOSS（红色 BOSS）
      const finalBoss = new Enemy(EnemyType.RED, 400, 100, false, true)
      const initialY = finalBoss.y
      
      // 验证是最终 BOSS
      expect(finalBoss.getIsFinalBoss()).toBe(true)
      
      // 前进 500ms
      vi.advanceTimersByTime(MOVEMENT_CONFIG.ENEMY_DOWN_INTERVAL)
      
      // 调用 trackPlayer
      finalBoss.trackPlayer(400, 300)
      
      // Y 坐标应该保持不变
      expect(finalBoss.y).toBe(initialY)
    })

    it('should not move down over multiple intervals for final boss', () => {
      const finalBoss = new Enemy(EnemyType.RED, 400, 100, false, true)
      const initialY = finalBoss.y
      
      // 多次调用 trackPlayer，每次间隔 500ms
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(MOVEMENT_CONFIG.ENEMY_DOWN_INTERVAL)
        finalBoss.trackPlayer(400, 300)
      }
      
      // Y 坐标应该保持不变
      expect(finalBoss.y).toBe(initialY)
    })

    it('should still track player horizontally for final boss', () => {
      // 创建最终 BOSS
      const finalBoss = new Enemy(EnemyType.RED, 400, 100, false, true)
      const initialX = finalBoss.x
      const initialY = finalBoss.y
      
      // 前进 500ms
      vi.advanceTimersByTime(MOVEMENT_CONFIG.ENEMY_MOVE_INTERVAL)
      
      // 调用 trackPlayer（玩家在左边）
      finalBoss.trackPlayer(200, 300)
      
      // Y 坐标不变
      expect(finalBoss.y).toBe(initialY)
      
      // X 坐标应该向左移动
      expect(finalBoss.x).toBe(initialX - PIXEL_BLOCK_CONFIG.SIZE)
    })

    it('should identify non-red bosses as not final boss', () => {
      const nonRedBossTypes = [
        EnemyType.WHITE,
        EnemyType.GREEN,
        EnemyType.BLUE,
        EnemyType.PURPLE,
        EnemyType.YELLOW,
        EnemyType.ORANGE
      ]
      
      nonRedBossTypes.forEach(type => {
        // 创建非红色的 BOSS
        const boss = new Enemy(type, 400, 100, false, true)
        
        // 不应该是最终 BOSS
        expect(boss.getIsFinalBoss()).toBe(false)
        
        // 应该会向下移动
        const initialY = boss.y
        vi.advanceTimersByTime(MOVEMENT_CONFIG.ENEMY_DOWN_INTERVAL)
        boss.trackPlayer(400, 300)
        
        expect(boss.y).toBe(initialY + PIXEL_BLOCK_CONFIG.SIZE)
      })
    })

    it('should identify red non-boss as not final boss', () => {
      // 创建红色但不是 BOSS 的敌人
      const redEnemy = new Enemy(EnemyType.RED, 400, 100, false, false)
      
      // 不应该是最终 BOSS
      expect(redEnemy.getIsFinalBoss()).toBe(false)
      
      // 应该会向下移动
      const initialY = redEnemy.y
      vi.advanceTimersByTime(MOVEMENT_CONFIG.ENEMY_DOWN_INTERVAL)
      redEnemy.trackPlayer(400, 300)
      
      expect(redEnemy.y).toBe(initialY + PIXEL_BLOCK_CONFIG.SIZE)
    })
  })

  describe('Movement Timing', () => {
    it('should not move before interval elapses', () => {
      const enemy = new Enemy(EnemyType.WHITE, 400, 100, false, false)
      const initialX = enemy.x
      const initialY = enemy.y
      
      // 前进 499ms（小于 500ms）
      vi.advanceTimersByTime(499)
      enemy.trackPlayer(200, 300) // 玩家在左边
      
      // 时间未到，不应该移动
      expect(enemy.x).toBe(initialX)
      expect(enemy.y).toBe(initialY)
    })

    it('should move independently for horizontal and vertical', () => {
      const enemy = new Enemy(EnemyType.WHITE, 400, 100, false, false)
      const initialX = enemy.x
      const initialY = enemy.y
      
      // 前进 500ms，两个方向都应该移动
      vi.advanceTimersByTime(500)
      enemy.trackPlayer(200, 300) // 玩家在左边
      
      expect(enemy.x).toBe(initialX - PIXEL_BLOCK_CONFIG.SIZE) // 向左移动
      expect(enemy.y).toBe(initialY + PIXEL_BLOCK_CONFIG.SIZE) // 向下移动
      
      // 再前进 500ms，两个方向都应该再次移动
      vi.advanceTimersByTime(500)
      enemy.trackPlayer(200, 300)
      
      expect(enemy.x).toBe(initialX - PIXEL_BLOCK_CONFIG.SIZE * 2)
      expect(enemy.y).toBe(initialY + PIXEL_BLOCK_CONFIG.SIZE * 2)
    })

    it('should handle rapid calls within interval', () => {
      const enemy = new Enemy(EnemyType.WHITE, 400, 100, false, false)
      const initialX = enemy.x
      const initialY = enemy.y
      
      // 多次快速调用（时间未到）
      enemy.trackPlayer(200, 300)
      enemy.trackPlayer(200, 300)
      enemy.trackPlayer(200, 300)
      
      // 不应该移动
      expect(enemy.x).toBe(initialX)
      expect(enemy.y).toBe(initialY)
      
      // 前进 500ms
      vi.advanceTimersByTime(500)
      enemy.trackPlayer(200, 300)
      
      // 应该只移动一次
      expect(enemy.x).toBe(initialX - PIXEL_BLOCK_CONFIG.SIZE)
      expect(enemy.y).toBe(initialY + PIXEL_BLOCK_CONFIG.SIZE)
    })
  })
})
