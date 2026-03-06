/**
 * PlayerAircraft 属性测试
 * 
 * 验证玩家飞机移动系统的正确性属性
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { PlayerAircraft } from '../PlayerAircraft'
import { MOVEMENT_CONFIG, SCENE_CONFIG } from '../../constants'

describe('PlayerAircraft Movement Property Tests', () => {
  let player: PlayerAircraft
  
  beforeEach(() => {
    // 在场景中心创建玩家
    const centerX = SCENE_CONFIG.CANVAS_WIDTH_V2 / 2
    const centerY = SCENE_CONFIG.CANVAS_HEIGHT_V2 / 2
    player = new PlayerAircraft(centerX, centerY)
  })

  describe('属性 12: 单次按键移动距离', () => {
    /**
     * Feature: game-v2-upgrade, Property 12: 单次按键移动距离
     * 
     * *对于任何*单次方向键按下，玩家飞船应该移动恰好 1 像素块的距离。
     * 
     * **验证需求: 8.1**
     */
    it('should move exactly 1 pixel block on single key press', () => {
      const initialX = player.x
      const initialY = player.y
      const pixelBlockSize = MOVEMENT_CONFIG.PLAYER_MOVE_DISTANCE
      
      // 测试向右移动
      player.move(1, 0)
      expect(player.x).toBe(initialX + pixelBlockSize)
      expect(player.y).toBe(initialY)
      
      // 重置位置
      player.x = initialX
      player.y = initialY
      
      // 测试向左移动
      player.move(-1, 0)
      expect(player.x).toBe(initialX - pixelBlockSize)
      expect(player.y).toBe(initialY)
      
      // 重置位置
      player.x = initialX
      player.y = initialY
      
      // 测试向上移动
      player.move(0, -1)
      expect(player.x).toBe(initialX)
      expect(player.y).toBe(initialY - pixelBlockSize)
      
      // 重置位置
      player.x = initialX
      player.y = initialY
      
      // 测试向下移动
      player.move(0, 1)
      expect(player.x).toBe(initialX)
      expect(player.y).toBe(initialY + pixelBlockSize)
    })

    it('should move exactly 1 pixel block for diagonal movement', () => {
      const initialX = player.x
      const initialY = player.y
      const pixelBlockSize = MOVEMENT_CONFIG.PLAYER_MOVE_DISTANCE
      
      // 测试对角线移动（右上）
      player.move(1, -1)
      expect(player.x).toBe(initialX + pixelBlockSize)
      expect(player.y).toBe(initialY - pixelBlockSize)
      
      // 重置位置
      player.x = initialX
      player.y = initialY
      
      // 测试对角线移动（左下）
      player.move(-1, 1)
      expect(player.x).toBe(initialX - pixelBlockSize)
      expect(player.y).toBe(initialY + pixelBlockSize)
    })

    it('should use MOVEMENT_CONFIG.PLAYER_MOVE_DISTANCE constant', () => {
      // 验证常量值为 8（1 像素块）
      expect(MOVEMENT_CONFIG.PLAYER_MOVE_DISTANCE).toBe(8)
      
      const initialX = player.x
      player.move(1, 0)
      
      // 移动距离应该等于常量值
      expect(player.x - initialX).toBe(MOVEMENT_CONFIG.PLAYER_MOVE_DISTANCE)
    })
  })

  describe('属性 13: 长按移动速率', () => {
    /**
     * Feature: game-v2-upgrade, Property 13: 长按移动速率
     * 
     * *对于任何*长按方向键的情况，玩家飞船应该每 200ms 移动 1 像素块。
     * 
     * **验证需求: 8.2**
     */
    it('should move 1 pixel block per 200ms interval when held', () => {
      const initialX = player.x
      const pixelBlockSize = MOVEMENT_CONFIG.PLAYER_MOVE_DISTANCE
      const interval = MOVEMENT_CONFIG.PLAYER_MOVE_INTERVAL
      
      // 验证间隔为 200ms
      expect(interval).toBe(200)
      
      // 模拟长按：每 200ms 调用一次 move
      player.move(1, 0) // t=0ms
      expect(player.x).toBe(initialX + pixelBlockSize)
      
      player.move(1, 0) // t=200ms
      expect(player.x).toBe(initialX + pixelBlockSize * 2)
      
      player.move(1, 0) // t=400ms
      expect(player.x).toBe(initialX + pixelBlockSize * 3)
      
      player.move(1, 0) // t=600ms
      expect(player.x).toBe(initialX + pixelBlockSize * 4)
    })

    it('should maintain consistent movement speed over multiple intervals', () => {
      const initialX = player.x
      const pixelBlockSize = MOVEMENT_CONFIG.PLAYER_MOVE_DISTANCE
      const moveCount = 10
      
      // 模拟 10 次移动（2 秒）
      for (let i = 0; i < moveCount; i++) {
        player.move(1, 0)
      }
      
      // 总移动距离应该是 10 个像素块
      expect(player.x).toBe(initialX + pixelBlockSize * moveCount)
    })
  })

  describe('属性 14: 释放按键停止移动', () => {
    /**
     * Feature: game-v2-upgrade, Property 14: 释放按键停止移动
     * 
     * *对于任何*方向键释放事件，玩家飞船应该在下一帧停止移动。
     * 
     * **验证需求: 8.3**
     */
    it('should stop moving when no input is provided', () => {
      const initialX = player.x
      const initialY = player.y
      
      // 移动一次
      player.move(1, 0)
      expect(player.x).not.toBe(initialX)
      
      // 记录移动后的位置
      const movedX = player.x
      
      // 不提供输入（模拟释放按键）
      player.move(0, 0)
      
      // 位置应该保持不变
      expect(player.x).toBe(movedX)
      expect(player.y).toBe(initialY)
    })

    it('should stop immediately without momentum', () => {
      const initialX = player.x
      const pixelBlockSize = MOVEMENT_CONFIG.PLAYER_MOVE_DISTANCE
      
      // 连续移动多次
      for (let i = 0; i < 5; i++) {
        player.move(1, 0)
      }
      
      const positionAfterMoving = player.x
      expect(positionAfterMoving).toBe(initialX + pixelBlockSize * 5)
      
      // 停止输入
      player.move(0, 0)
      
      // 位置应该立即停止，没有惯性
      expect(player.x).toBe(positionAfterMoving)
      
      // 再次调用 move(0, 0) 应该仍然保持不变
      player.move(0, 0)
      expect(player.x).toBe(positionAfterMoving)
    })
  })

  describe('边界检测（需求 5.1）', () => {
    it('should not move beyond left boundary', () => {
      // 将玩家移到左边界
      player.x = 0
      player.y = 100
      
      // 尝试向左移动
      player.move(-1, 0)
      
      // 应该停留在边界
      expect(player.x).toBe(0)
    })

    it('should not move beyond right boundary', () => {
      // 将玩家移到右边界
      const rightBoundary = SCENE_CONFIG.CANVAS_WIDTH_V2 - player.width
      player.x = rightBoundary
      player.y = 100
      
      // 尝试向右移动
      player.move(1, 0)
      
      // 应该停留在边界
      expect(player.x).toBe(rightBoundary)
    })

    it('should not move beyond top boundary', () => {
      // 将玩家移到上边界
      player.x = 100
      player.y = 0
      
      // 尝试向上移动
      player.move(0, -1)
      
      // 应该停留在边界
      expect(player.y).toBe(0)
    })

    it('should not move beyond bottom boundary', () => {
      // 将玩家移到下边界
      const bottomBoundary = SCENE_CONFIG.CANVAS_HEIGHT_V2 - player.height
      player.x = 100
      player.y = bottomBoundary
      
      // 尝试向下移动
      player.move(0, 1)
      
      // 应该停留在边界
      expect(player.y).toBe(bottomBoundary)
    })

    it('should use V2 expanded scene dimensions for boundaries', () => {
      // 验证使用的是扩展后的场景尺寸
      expect(SCENE_CONFIG.CANVAS_WIDTH_V2).toBe(1200)
      expect(SCENE_CONFIG.CANVAS_HEIGHT_V2).toBe(900)
      
      // 玩家应该能够在扩展后的场景中移动
      const rightBoundary = SCENE_CONFIG.CANVAS_WIDTH_V2 - player.width
      const bottomBoundary = SCENE_CONFIG.CANVAS_HEIGHT_V2 - player.height
      
      // 移动到右下角
      player.x = rightBoundary
      player.y = bottomBoundary
      
      // 验证位置在有效范围内
      expect(player.x).toBeGreaterThan(0)
      expect(player.y).toBeGreaterThan(0)
      expect(player.x).toBeLessThanOrEqual(rightBoundary)
      expect(player.y).toBeLessThanOrEqual(bottomBoundary)
    })

    it('should clamp position when trying to move beyond boundaries', () => {
      // 测试左上角
      player.x = 0
      player.y = 0
      player.move(-1, -1)
      expect(player.x).toBe(0)
      expect(player.y).toBe(0)
      
      // 测试右下角
      const rightBoundary = SCENE_CONFIG.CANVAS_WIDTH_V2 - player.width
      const bottomBoundary = SCENE_CONFIG.CANVAS_HEIGHT_V2 - player.height
      player.x = rightBoundary
      player.y = bottomBoundary
      player.move(1, 1)
      expect(player.x).toBe(rightBoundary)
      expect(player.y).toBe(bottomBoundary)
    })
  })

  describe('移动系统集成', () => {
    it('should handle complex movement patterns', () => {
      const initialX = player.x
      const initialY = player.y
      const pixelBlockSize = MOVEMENT_CONFIG.PLAYER_MOVE_DISTANCE
      
      // 复杂移动模式：右、右、下、左、上
      player.move(1, 0)
      player.move(1, 0)
      player.move(0, 1)
      player.move(-1, 0)
      player.move(0, -1)
      
      // 最终位置应该是 (initialX + pixelBlockSize, initialY)
      expect(player.x).toBe(initialX + pixelBlockSize)
      expect(player.y).toBe(initialY)
    })

    it('should maintain position precision over many moves', () => {
      const initialX = player.x
      const initialY = player.y
      
      // 执行大量移动操作
      for (let i = 0; i < 100; i++) {
        player.move(1, 0)
      }
      for (let i = 0; i < 100; i++) {
        player.move(-1, 0)
      }
      
      // 应该回到初始位置（或者由于边界限制而接近）
      // 如果没有碰到边界，应该完全相同
      if (initialX + MOVEMENT_CONFIG.PLAYER_MOVE_DISTANCE * 100 < SCENE_CONFIG.CANVAS_WIDTH_V2 - player.width) {
        expect(player.x).toBe(initialX)
      }
      expect(player.y).toBe(initialY)
    })

    it('should not accumulate floating point errors', () => {
      const initialX = player.x
      const pixelBlockSize = MOVEMENT_CONFIG.PLAYER_MOVE_DISTANCE
      
      // 移动 10 次
      for (let i = 0; i < 10; i++) {
        player.move(1, 0)
      }
      
      // 位置应该是精确的整数倍
      const expectedX = initialX + pixelBlockSize * 10
      expect(player.x).toBe(expectedX)
      expect(Number.isInteger(player.x)).toBe(true)
    })
  })

  describe('边界情况', () => {
    it('should handle zero movement', () => {
      const initialX = player.x
      const initialY = player.y
      
      player.move(0, 0)
      
      expect(player.x).toBe(initialX)
      expect(player.y).toBe(initialY)
    })

    it('should handle movement at spawn position', () => {
      const centerX = SCENE_CONFIG.CANVAS_WIDTH_V2 / 2
      const centerY = SCENE_CONFIG.CANVAS_HEIGHT_V2 / 2
      const newPlayer = new PlayerAircraft(centerX, centerY)
      
      // 应该能够向所有方向移动
      const initialX = newPlayer.x
      const initialY = newPlayer.y
      
      newPlayer.move(1, 0)
      expect(newPlayer.x).toBeGreaterThan(initialX)
      
      newPlayer.x = initialX
      newPlayer.move(-1, 0)
      expect(newPlayer.x).toBeLessThan(initialX)
      
      newPlayer.x = initialX
      newPlayer.move(0, 1)
      expect(newPlayer.y).toBeGreaterThan(initialY)
      
      newPlayer.y = initialY
      newPlayer.move(0, -1)
      expect(newPlayer.y).toBeLessThan(initialY)
    })

    it('should handle rapid direction changes', () => {
      const initialX = player.x
      const initialY = player.y
      
      // 快速改变方向
      player.move(1, 0)
      player.move(-1, 0)
      player.move(0, 1)
      player.move(0, -1)
      
      // 应该回到初始位置
      expect(player.x).toBe(initialX)
      expect(player.y).toBe(initialY)
    })
  })
})
