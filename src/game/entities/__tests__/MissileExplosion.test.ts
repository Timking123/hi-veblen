/**
 * 导弹爆炸范围和伤害测试
 * 验证需求 3.2, 3.3, 3.5
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { Missile } from '../Missile'
import { Enemy } from '../Enemy'
import { EnemyType } from '../../types'
import type { Entity } from '../../types'

describe('导弹爆炸系统', () => {
  let missile: Missile
  let enemies: Entity[]

  beforeEach(() => {
    // 创建导弹（使用新的配置值）
    missile = new Missile(
      400, // x
      300, // y
      7.5, // damage（1.5 倍提升）
      12, // speed
      4.5, // explosionRadius（1.5 倍提升）
      'player'
    )

    // 创建测试敌人
    enemies = []
  })

  describe('子任务 9.1: 导弹爆炸范围', () => {
    it('应该使用新的爆炸范围 4.5（原来的 1.5 倍）', () => {
      expect(missile.explosionRadius).toBe(4.5)
    })

    it('爆炸范围应该是原来 3 的 1.5 倍', () => {
      const originalRadius = 3
      const expectedRadius = originalRadius * 1.5
      expect(missile.explosionRadius).toBe(expectedRadius)
    })
  })

  describe('子任务 9.2: 导弹爆炸伤害', () => {
    it('应该使用新的伤害值 7.5（原来的 1.5 倍）', () => {
      expect(missile.damage).toBe(7.5)
    })

    it('伤害值应该是原来 5 的 1.5 倍', () => {
      const originalDamage = 5
      const expectedDamage = originalDamage * 1.5
      expect(missile.damage).toBe(expectedDamage)
    })
  })

  describe('子任务 9.3: 爆炸范围伤害计算', () => {
    it('应该对爆炸范围内的敌人造成伤害', () => {
      // 创建一个在爆炸范围内的敌人
      const enemy = new Enemy(EnemyType.WHITE, 405, 305)
      enemies.push(enemy)

      const initialHealth = enemy.getCurrentHealth()

      // 触发爆炸
      missile.explode(enemies)

      // 验证敌人受到伤害（敌人初始血量为 2，受到 7.5 伤害后应该死亡）
      expect(enemy.getCurrentHealth()).toBeLessThan(initialHealth)
      expect(enemy.isActive).toBe(false) // 敌人应该被击杀
    })

    it('不应该对爆炸范围外的敌人造成伤害', () => {
      // 创建一个在爆炸范围外的敌人（距离超过 45 像素）
      const enemy = new Enemy(EnemyType.WHITE, 404 + 100, 308 + 100)
      enemies.push(enemy)

      const initialHealth = enemy.getCurrentHealth()

      // 触发爆炸
      missile.explode(enemies)

      // 验证敌人没有受到伤害
      expect(enemy.getCurrentHealth()).toBe(initialHealth)
      expect(enemy.isActive).toBe(true)
    })

    it('应该对范围内的多个敌人都造成伤害', () => {
      // 创建多个在爆炸范围内的敌人
      const enemy1 = new Enemy(EnemyType.WHITE, 405, 305)
      const enemy2 = new Enemy(EnemyType.WHITE, 410, 310)
      const enemy3 = new Enemy(EnemyType.WHITE, 400, 300)
      enemies.push(enemy1, enemy2, enemy3)

      // 触发爆炸
      missile.explode(enemies)

      // 验证所有敌人都受到伤害并被击杀
      expect(enemy1.isActive).toBe(false)
      expect(enemy2.isActive).toBe(false)
      expect(enemy3.isActive).toBe(false)
    })

    it('爆炸后导弹应该标记为已爆炸', () => {
      const enemy = new Enemy(EnemyType.WHITE, 405, 305)
      enemies.push(enemy)

      expect(missile.hasExploded).toBe(false)

      missile.explode(enemies)

      expect(missile.hasExploded).toBe(true)
    })

    it('已爆炸的导弹不应该再次爆炸', () => {
      const enemy = new Enemy(EnemyType.WHITE, 405, 305)
      enemies.push(enemy)

      // 第一次爆炸
      missile.explode(enemies)
      const healthAfterFirstExplosion = enemy.getCurrentHealth()

      // 尝试第二次爆炸
      missile.explode(enemies)
      const healthAfterSecondExplosion = enemy.getCurrentHealth()

      // 验证第二次爆炸没有效果
      expect(healthAfterSecondExplosion).toBe(healthAfterFirstExplosion)
    })
  })

  describe('爆炸范围提升验证', () => {
    it('新的爆炸范围应该能覆盖更大的区域', () => {
      // 原来的范围：3 * 10 = 30 像素
      // 新的范围：4.5 * 10 = 45 像素
      // 验证爆炸半径确实是 45 像素
      const pixelRadius = missile.explosionRadius * 10
      expect(pixelRadius).toBe(45)
      
      // 验证比原来的范围大 1.5 倍
      const originalPixelRadius = 3 * 10
      expect(pixelRadius).toBe(originalPixelRadius * 1.5)
    })
  })

  describe('伤害值提升验证', () => {
    it('新的伤害值应该能造成更高的伤害', () => {
      const enemy = new Enemy(EnemyType.WHITE, 405, 305)
      enemies.push(enemy)

      const initialHealth = enemy.getCurrentHealth()

      missile.explode(enemies)

      // 原来伤害 5，现在伤害 7.5
      // 敌人生命值应该减少（由于初始血量只有 2，会被直接击杀）
      expect(enemy.getCurrentHealth()).toBeLessThan(initialHealth)
    })

    it('新伤害值应该能更快击杀敌人', () => {
      // 创建一个敌人
      const enemy = new Enemy(EnemyType.WHITE, 405, 305)
      enemies.push(enemy)

      missile.explode(enemies)

      // 新伤害 7.5 应该能击杀低血量敌人
      expect(enemy.getCurrentHealth()).toBeLessThanOrEqual(0)
      expect(enemy.isActive).toBe(false)
    })
  })
})
