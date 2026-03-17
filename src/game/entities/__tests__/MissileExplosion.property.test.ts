/**
 * 导弹爆炸范围伤害属性测试
 * Feature: website-v3-major-update
 * Property 13: 爆炸范围伤害正确性
 * 
 * 验证需求: 3.5
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { Missile } from '../Missile'
import { Enemy } from '../Enemy'
import { EnemyType } from '../../types'
import type { Entity } from '../../types'

describe('导弹爆炸范围伤害属性测试', () => {
  /**
   * Property 13: 爆炸范围伤害正确性
   * 
   * For any 导弹位置和敌人位置，当导弹爆炸时，
   * 所有在爆炸范围内的敌人都应该受到伤害，
   * 所有在爆炸范围外的敌人不应该受到伤害。
   * 
   * Validates: Requirements 3.5
   */
  it('Property 13: 爆炸范围内的所有敌人都应该受到伤害', () => {
    fc.assert(
      fc.property(
        // 生成随机导弹位置（在游戏区域内）
        fc.float({ min: 50, max: 750 }), // 导弹 X 坐标
        fc.float({ min: 50, max: 550 }), // 导弹 Y 坐标
        // 生成随机敌人数组（1-10 个敌人）
        fc.array(
          fc.record({
            x: fc.float({ min: 0, max: 800 }),
            y: fc.float({ min: 0, max: 600 }),
            type: fc.constantFrom(
              EnemyType.WHITE,
              EnemyType.RED,
              EnemyType.BLUE,
              EnemyType.GREEN
            )
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (missileX, missileY, enemyConfigs) => {
          // 创建导弹（使用当前配置：伤害 7.5，爆炸范围 4.5）
          const missile = new Missile(
            missileX,
            missileY,
            7.5, // damage（1.5 倍提升后的值）
            12, // speed
            4.5, // explosionRadius（1.5 倍提升后的值）
            'player'
          )

          // 创建敌人实体
          const enemies: Entity[] = enemyConfigs.map(config => 
            new Enemy(config.type, config.x, config.y)
          )

          // 记录每个敌人的初始血量
          const initialHealths = enemies.map(enemy => 
            (enemy as Enemy).getCurrentHealth()
          )

          // 计算导弹爆炸中心（导弹中心点）
          const explosionCenterX = missile.getCenterX()
          const explosionCenterY = missile.getCenterY()
          const explosionPixelRadius = missile.explosionRadius * 10 // 转换为像素

          // 触发爆炸
          missile.explode(enemies)

          // 验证：对每个敌人检查是否在爆炸范围内
          enemies.forEach((entity, index) => {
            const enemy = entity as Enemy
            const enemyCenterX = enemy.getCenterX()
            const enemyCenterY = enemy.getCenterY()

            // 计算敌人到爆炸中心的距离
            const distance = Math.sqrt(
              Math.pow(enemyCenterX - explosionCenterX, 2) +
              Math.pow(enemyCenterY - explosionCenterY, 2)
            )

            if (distance <= explosionPixelRadius) {
              // 范围内的敌人应该受到伤害
              expect(enemy.getCurrentHealth()).toBeLessThan(initialHealths[index])
            } else {
              // 范围外的敌人不应该受到伤害
              expect(enemy.getCurrentHealth()).toBe(initialHealths[index])
            }
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 13 (对比测试): 范围外的敌人不应该受到任何伤害', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 200, max: 600 }), // 导弹 X
        fc.float({ min: 200, max: 400 }), // 导弹 Y
        fc.float({ min: 0, max: Math.fround(2 * Math.PI) }), // 角度
        fc.float({ min: 50, max: 200 }), // 额外距离（确保在范围外）
        (missileX, missileY, angle, extraDistance) => {
          const missile = new Missile(missileX, missileY, 7.5, 12, 4.5, 'player')
          
          const explosionCenterX = missile.getCenterX()
          const explosionCenterY = missile.getCenterY()
          const explosionPixelRadius = missile.explosionRadius * 10

          // 将敌人放置在爆炸范围外（距离大于爆炸半径）
          const distance = explosionPixelRadius + extraDistance
          const enemyX = explosionCenterX + Math.cos(angle) * distance
          const enemyY = explosionCenterY + Math.sin(angle) * distance

          // 确保敌人在游戏区域内
          if (enemyX < 0 || enemyX > 800 || enemyY < 0 || enemyY > 600) {
            return // 跳过超出游戏区域的情况
          }

          const enemy = new Enemy(EnemyType.WHITE, enemyX, enemyY)
          const enemies: Entity[] = [enemy]
          const initialHealth = enemy.getCurrentHealth()

          missile.explode(enemies)

          // 范围外的敌人不应该受到伤害
          expect(enemy.getCurrentHealth()).toBe(initialHealth)
          expect(enemy.isActive).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})

