/**
 * EnhancedInputManager 属性测试
 * 
 * 验证增强输入管理器的正确性属性
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EnhancedInputManager } from '../EnhancedInputManager'
import { MOVEMENT_CONFIG, SHOOTING_CONFIG } from '../constants'

describe('EnhancedInputManager Property Tests', () => {
  let inputManager: EnhancedInputManager
  
  beforeEach(() => {
    inputManager = new EnhancedInputManager()
    vi.useFakeTimers()
  })
  
  afterEach(() => {
    inputManager.destroy()
    vi.useRealTimers()
  })

  /**
   * 模拟按键按下
   */
  const simulateKeyDown = (key: string) => {
    const event = new KeyboardEvent('keydown', { key })
    window.dispatchEvent(event)
  }

  /**
   * 模拟按键释放
   */
  const simulateKeyUp = (key: string) => {
    const event = new KeyboardEvent('keyup', { key })
    window.dispatchEvent(event)
  }

  describe('属性 12: 单次按键移动距离', () => {
    /**
     * Feature: game-v2-upgrade, Property 12: 单次按键移动距离
     * 
     * *对于任何*单次方向键按下，玩家飞船应该移动恰好 1 像素块的距离。
     * 
     * **验证需求: 8.1**
     */
    it('should move exactly 1 pixel block on single key press', () => {
      // 测试所有方向键
      const directions = ['w', 'a', 's', 'd']
      
      for (const key of directions) {
        // 重置输入管理器
        inputManager.reset()
        
        // 模拟单次按键
        simulateKeyDown(key)
        // 不要在这里调用 update()，因为 justPressed 需要在下一帧才清除
        
        // 获取移动输入
        const movement = inputManager.getMovementInput()
        
        // 验证移动向量的长度为 1（单位向量）
        const magnitude = Math.abs(movement.x) + Math.abs(movement.y)
        expect(magnitude).toBe(1)
        
        // 清理
        simulateKeyUp(key)
        inputManager.update(0)
      }
    })

    it('should move immediately on first key press', () => {
      // 按下 D 键
      simulateKeyDown('d')
      // 不调用 update()，直接获取移动输入
      
      // 第一次获取移动输入应该立即返回移动
      const movement1 = inputManager.getMovementInput()
      expect(movement1.x).toBe(1)
      expect(movement1.y).toBe(0)
      
      // 第二次获取（没有经过足够时间）应该不移动
      const movement2 = inputManager.getMovementInput()
      expect(movement2.x).toBe(0)
      expect(movement2.y).toBe(0)
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
    it('should move every 200ms when key is held', () => {
      // 按下 D 键
      simulateKeyDown('d')
      
      // 第一次移动（立即）
      const movement1 = inputManager.getMovementInput()
      expect(movement1.x).toBe(1)
      
      // 等待 100ms（不足 200ms）
      vi.advanceTimersByTime(100)
      const movement2 = inputManager.getMovementInput()
      expect(movement2.x).toBe(0) // 不应该移动
      
      // 再等待 100ms（总共 200ms）
      vi.advanceTimersByTime(100)
      const movement3 = inputManager.getMovementInput()
      expect(movement3.x).toBe(1) // 应该移动
      
      // 再等待 200ms
      vi.advanceTimersByTime(200)
      const movement4 = inputManager.getMovementInput()
      expect(movement4.x).toBe(1) // 应该再次移动
    })

    it('should respect PLAYER_MOVE_INTERVAL constant', () => {
      const interval = MOVEMENT_CONFIG.PLAYER_MOVE_INTERVAL
      expect(interval).toBe(200)
      
      // 按下 W 键
      simulateKeyDown('w')
      inputManager.update(0)
      
      // 第一次移动
      inputManager.getMovementInput()
      
      // 等待 interval - 1 ms
      vi.advanceTimersByTime(interval - 1)
      const movement1 = inputManager.getMovementInput()
      expect(movement1.y).toBe(0) // 不应该移动
      
      // 再等待 1ms
      vi.advanceTimersByTime(1)
      const movement2 = inputManager.getMovementInput()
      expect(movement2.y).toBe(-1) // 应该移动
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
    it('should stop moving immediately when key is released', () => {
      // 按下 D 键
      simulateKeyDown('d')
      
      // 验证正在移动
      const movement1 = inputManager.getMovementInput()
      expect(movement1.x).toBe(1)
      
      // 释放按键
      simulateKeyUp('d')
      
      // 验证停止移动
      const movement2 = inputManager.getMovementInput()
      expect(movement2.x).toBe(0)
      expect(movement2.y).toBe(0)
    })

    it('should detect key release with isKeyJustReleased', () => {
      // 按下并释放 A 键
      simulateKeyDown('a')
      inputManager.update(0)
      
      simulateKeyUp('a')
      
      // 在 update 之前，justReleased 应该为 true
      expect(inputManager.isKeyJustReleased('a')).toBe(true)
      
      // update 后，justReleased 应该被清除
      inputManager.update(0)
      expect(inputManager.isKeyJustReleased('a')).toBe(false)
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
    it('should fire missile only once per key press', () => {
      // 按下 K 键
      simulateKeyDown('k')
      inputManager.update(0)
      
      // 第一次检查应该返回 true
      expect(inputManager.shouldFireMissile()).toBe(true)
      
      // 第二次检查应该返回 false（即使按键仍然按下）
      expect(inputManager.shouldFireMissile()).toBe(false)
      
      // 继续按住，仍然应该返回 false
      vi.advanceTimersByTime(1000)
      expect(inputManager.shouldFireMissile()).toBe(false)
    })

    it('should not fire missile continuously when key is held', () => {
      // 按下 K 键
      simulateKeyDown('k')
      inputManager.update(0)
      
      // 第一次发射
      const fired1 = inputManager.shouldFireMissile()
      expect(fired1).toBe(true)
      
      // 长按 5 秒，检查多次
      let fireCount = fired1 ? 1 : 0
      for (let i = 0; i < 50; i++) {
        vi.advanceTimersByTime(100)
        if (inputManager.shouldFireMissile()) {
          fireCount++
        }
      }
      
      // 应该只发射一次
      expect(fireCount).toBe(1)
    })
  })

  describe('属性 21: 导弹释放后可再发射', () => {
    /**
     * Feature: game-v2-upgrade, Property 21: 导弹释放后可再发射
     * 
     * *对于任何*K 键释放后再按下的情况，应该发射新的一枚导弹。
     * 
     * **验证需求: 11.3**
     */
    it('should allow firing missile again after key release', () => {
      // 第一次按下和释放
      simulateKeyDown('k')
      expect(inputManager.shouldFireMissile()).toBe(true)
      
      simulateKeyUp('k')
      
      // 第二次按下
      simulateKeyDown('k')
      expect(inputManager.shouldFireMissile()).toBe(true)
      
      // 第三次按下
      simulateKeyUp('k')
      simulateKeyDown('k')
      expect(inputManager.shouldFireMissile()).toBe(true)
    })

    it('should reset missile state on key release', () => {
      // 按下 K 键
      simulateKeyDown('k')
      inputManager.shouldFireMissile() // 消耗第一次发射
      
      // 释放按键
      simulateKeyUp('k')
      
      // 再次按下应该可以发射
      simulateKeyDown('k')
      expect(inputManager.shouldFireMissile()).toBe(true)
    })
  })

  describe('机炮射速限制', () => {
    /**
     * 验证机炮射速限制（200ms 冷却）
     * 
     * **验证需求: 7.1**
     */
    it('should enforce 200ms cooldown for gun firing', () => {
      const cooldown = SHOOTING_CONFIG.PLAYER_GUN_COOLDOWN
      expect(cooldown).toBe(200)
      
      // 按下 J 键
      simulateKeyDown('j')
      inputManager.update(0)
      
      // 第一次发射
      expect(inputManager.shouldFireGun()).toBe(true)
      
      // 立即检查，应该不能发射
      expect(inputManager.shouldFireGun()).toBe(false)
      
      // 等待 100ms（不足冷却时间）
      vi.advanceTimersByTime(100)
      expect(inputManager.shouldFireGun()).toBe(false)
      
      // 再等待 100ms（总共 200ms）
      vi.advanceTimersByTime(100)
      expect(inputManager.shouldFireGun()).toBe(true)
    })
  })

  describe('按键状态跟踪', () => {
    it('should track key down state', () => {
      simulateKeyDown('w')
      expect(inputManager.isKeyHeld('w')).toBe(true)
      
      simulateKeyUp('w')
      expect(inputManager.isKeyHeld('w')).toBe(false)
    })

    it('should track just pressed state', () => {
      simulateKeyDown('j')
      expect(inputManager.isKeyJustPressed('j')).toBe(true)
      
      inputManager.update(0)
      expect(inputManager.isKeyJustPressed('j')).toBe(false)
    })

    it('should handle multiple keys simultaneously', () => {
      simulateKeyDown('w')
      simulateKeyDown('d')
      
      const movement = inputManager.getMovementInput()
      expect(movement.x).toBe(1)
      expect(movement.y).toBe(-1)
    })
  })

  describe('边界情况', () => {
    it('should handle rapid key presses', () => {
      for (let i = 0; i < 10; i++) {
        simulateKeyDown('d')
        inputManager.update(0)
        simulateKeyUp('d')
        inputManager.update(0)
      }
      
      // 应该不会崩溃或产生错误状态
      const movement = inputManager.getMovementInput()
      expect(movement.x).toBe(0)
    })

    it('should handle reset correctly', () => {
      simulateKeyDown('w')
      simulateKeyDown('j')
      inputManager.update(0)
      
      inputManager.reset()
      
      expect(inputManager.isKeyHeld('w')).toBe(false)
      expect(inputManager.shouldFireGun()).toBe(false)
      expect(inputManager.shouldFireMissile()).toBe(false)
    })

    it('should handle destroy correctly', () => {
      simulateKeyDown('d')
      inputManager.destroy()
      
      // 创建新的输入管理器
      const newManager = new EnhancedInputManager()
      expect(newManager.isKeyHeld('d')).toBe(false)
      newManager.destroy()
    })
  })
})
