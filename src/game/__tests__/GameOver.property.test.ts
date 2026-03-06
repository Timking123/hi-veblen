/**
 * 游戏结束属性测试
 * Feature: project-audit-upgrade, Property 1: 玩家死亡触发游戏结束
 *
 * **Validates: Requirements 1.1**
 *
 * 属性描述：
 * For any 玩家飞机实例和任意伤害序列，当累计伤害使血量降至零或以下时，
 * 游戏结束回调应该被恰好调用一次。
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { PlayerAircraft } from '../entities/PlayerAircraft'
import { GAME_CONFIG } from '../constants'

describe('Property 1: 玩家死亡触发游戏结束', () => {
  const initialHealth = GAME_CONFIG.PLAYER_INITIAL_HEALTH

  /**
   * 属性 1a：当累计伤害 >= 初始血量时，死亡回调恰好被调用一次
   * **Validates: Requirements 1.1**
   */
  it('累计伤害致死时，死亡回调恰好被调用一次', () => {
    fc.assert(
      fc.property(
        // 生成一个正整数伤害序列，确保总和 >= 初始血量
        fc.array(fc.integer({ min: 1, max: initialHealth }), { minLength: 1, maxLength: 20 })
          .filter(damages => damages.reduce((sum, d) => sum + d, 0) >= initialHealth),
        (damages) => {
          const player = new PlayerAircraft(100, 100)
          let deathCallCount = 0

          player.setOnDeath(() => {
            deathCallCount++
          })

          // 依次施加伤害
          for (const damage of damages) {
            player.takeDamage(damage)
          }

          // 死亡回调应恰好被调用一次
          expect(deathCallCount).toBe(1)
          // 玩家应不再存活
          expect(player.isActive).toBe(false)
          // 血量应为 0
          expect(player.health).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 1b：当累计伤害 < 初始血量时，死亡回调不被调用
   * **Validates: Requirements 1.1**
   */
  it('累计伤害不致死时，死亡回调不被调用', () => {
    fc.assert(
      fc.property(
        // 生成一个正整数伤害序列，确保总和 < 初始血量
        fc.array(fc.integer({ min: 1, max: initialHealth - 1 }), { minLength: 1, maxLength: 20 })
          .filter(damages => damages.reduce((sum, d) => sum + d, 0) < initialHealth),
        (damages) => {
          const player = new PlayerAircraft(100, 100)
          let deathCallCount = 0

          player.setOnDeath(() => {
            deathCallCount++
          })

          // 依次施加伤害
          for (const damage of damages) {
            player.takeDamage(damage)
          }

          // 死亡回调不应被调用
          expect(deathCallCount).toBe(0)
          // 玩家应仍然存活
          expect(player.isActive).toBe(true)
          // 血量应大于 0
          expect(player.health).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 1c：单次致命伤害（伤害 >= 初始血量）也恰好触发一次回调
   * **Validates: Requirements 1.1**
   */
  it('单次致命伤害恰好触发一次死亡回调', () => {
    fc.assert(
      fc.property(
        // 生成一个 >= 初始血量的伤害值
        fc.integer({ min: initialHealth, max: initialHealth * 10 }),
        (damage) => {
          const player = new PlayerAircraft(100, 100)
          let deathCallCount = 0

          player.setOnDeath(() => {
            deathCallCount++
          })

          player.takeDamage(damage)

          expect(deathCallCount).toBe(1)
          expect(player.isActive).toBe(false)
          expect(player.health).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 1d：未注册回调时，玩家死亡不会抛出异常
   * **Validates: Requirements 1.1**
   */
  it('未注册死亡回调时，玩家死亡不抛出异常', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: initialHealth, max: initialHealth * 10 }),
        (damage) => {
          const player = new PlayerAircraft(100, 100)
          // 不注册回调

          expect(() => player.takeDamage(damage)).not.toThrow()
          expect(player.isActive).toBe(false)
          expect(player.health).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})
