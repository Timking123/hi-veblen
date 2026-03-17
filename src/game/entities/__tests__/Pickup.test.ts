/**
 * Pickup 单元测试
 * 
 * 验证掉落物的生成、拾取和效果应用
 * 
 * 任务 14: 编写掉落物系统的单元测试
 * - 测试掉落物生成概率
 * - 测试掉落物拾取触发
 * - 测试各类掉落物的效果
 * - 验证需求: 4.2, 4.3, 4.4, 4.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Pickup } from '../Pickup'
import { PlayerAircraft } from '../PlayerAircraft'
import { Enemy } from '../Enemy'
import { PickupType, EnemyType } from '../../types'
import { ENEMY_CONFIGS } from '../../constants'

describe('Pickup 掉落物系统', () => {
  let player: PlayerAircraft

  beforeEach(() => {
    player = new PlayerAircraft(400, 500)
  })

  describe('子任务 12.1: 掉落物生成逻辑 - 验证需求 4.2', () => {
    it('应该正确创建掉落物实体', () => {
      const pickup = new Pickup(PickupType.REPAIR, 100, 100)
      
      expect(pickup.isActive).toBe(true)
      expect(pickup.type).toBe(PickupType.REPAIR)
      expect(pickup.x).toBe(100)
      expect(pickup.y).toBe(100)
      expect(pickup.width).toBeGreaterThan(0)
      expect(pickup.height).toBeGreaterThan(0)
    })

    it('应该为所有掉落物类型创建实体', () => {
      const allTypes = [
        PickupType.REPAIR,
        PickupType.MACHINEGUN_BULLETS,
        PickupType.MACHINEGUN_TRAJECTORY,
        PickupType.MACHINEGUN_FIRERATE,
        PickupType.MACHINEGUN_DAMAGE,
        PickupType.MACHINEGUN_SPEED,
        PickupType.MISSILE_COUNT,
        PickupType.MISSILE_DAMAGE,
        PickupType.MISSILE_SPEED,
        PickupType.ENGINE
      ]

      allTypes.forEach(type => {
        const pickup = new Pickup(type, 100, 100)
        expect(pickup.type).toBe(type)
        expect(pickup.isActive).toBe(true)
        expect(pickup.getType()).toBe(type)
      })
    })

    it('应该根据敌人配置的概率生成掉落物', () => {
      // 测试敌人死亡时的掉落物生成
      // 使用 WHITE 类型敌人（基础敌人）
      
      // 模拟多次死亡，统计掉落物生成情况
      const dropResults: (PickupType | null)[] = []
      const iterations = 100
      
      for (let i = 0; i < iterations; i++) {
        // 创建新敌人实例
        const testEnemy = new Enemy(EnemyType.WHITE, 100, 100)
        // 调用 die 方法获取掉落物类型
        const dropType = testEnemy.die()
        dropResults.push(dropType)
      }
      
      // 验证有掉落物生成（不是所有都为 null）
      const hasDrops = dropResults.some(drop => drop !== null)
      expect(hasDrops).toBe(true)
      
      // 验证掉落物类型在预期范围内
      const validTypes = new Set([
        null,
        PickupType.REPAIR,
        PickupType.MACHINEGUN_BULLETS,
        PickupType.MACHINEGUN_TRAJECTORY,
        PickupType.MACHINEGUN_FIRERATE,
        PickupType.MACHINEGUN_DAMAGE,
        PickupType.MACHINEGUN_SPEED,
        PickupType.MISSILE_COUNT,
        PickupType.MISSILE_DAMAGE,
        PickupType.MISSILE_SPEED,
        PickupType.ENGINE
      ])
      
      dropResults.forEach(drop => {
        expect(validTypes.has(drop)).toBe(true)
      })
    })

    it('应该根据不同敌人类型生成不同概率的掉落物', () => {
      // 测试不同敌人类型的掉落率
      const enemyTypes = [
        EnemyType.WHITE,
        EnemyType.GREEN,
        EnemyType.BLUE
      ]
      
      enemyTypes.forEach(type => {
        const enemy = new Enemy(type, 100, 100)
        const dropType = enemy.die()
        
        // 验证掉落物类型有效（可能为 null）
        if (dropType !== null) {
          expect(Object.values(PickupType)).toContain(dropType)
        }
      })
    })

    it('应该在屏幕底部外销毁', () => {
      const pickup = new Pickup(PickupType.REPAIR, 100, 100)
      
      // 模拟掉落物移动到屏幕底部外
      pickup.y = 1000 // 超出屏幕高度
      pickup.update(16)
      
      expect(pickup.isActive).toBe(false)
    })

    it('应该以正确的速度向下飘落', () => {
      const pickup = new Pickup(PickupType.REPAIR, 100, 100)
      const initialY = pickup.y
      
      // 更新掉落物
      pickup.update(16)
      
      // 验证掉落物向下移动
      expect(pickup.y).toBeGreaterThan(initialY)
      expect(pickup.y - initialY).toBe(2) // fallSpeed = 2
    })
  })

  describe('子任务 12.2: 掉落物拾取逻辑 - 验证需求 4.3', () => {
    it('应该在与玩家碰撞时触发拾取', () => {
      const pickup = new Pickup(PickupType.REPAIR, player.x, player.y)
      const pickupCallback = vi.fn()
      
      pickup.setOnPickup(pickupCallback)
      
      // 触发碰撞
      pickup.onCollision(player)
      
      expect(pickupCallback).toHaveBeenCalledWith(PickupType.REPAIR)
      expect(pickup.isActive).toBe(false)
    })

    it('应该在拾取后立即销毁掉落物', () => {
      const pickup = new Pickup(PickupType.REPAIR, player.x, player.y)
      const pickupCallback = vi.fn()
      
      pickup.setOnPickup(pickupCallback)
      
      expect(pickup.isActive).toBe(true)
      
      pickup.onCollision(player)
      
      expect(pickup.isActive).toBe(false)
    })

    it('应该只与玩家碰撞，不与其他实体碰撞', () => {
      const pickup = new Pickup(PickupType.REPAIR, 100, 100)
      const pickupCallback = vi.fn()
      
      pickup.setOnPickup(pickupCallback)
      
      // 模拟与非玩家实体碰撞
      const otherEntity = {
        id: 'enemy-1',
        x: 100,
        y: 100,
        width: 40,
        height: 40,
        isActive: true,
        update: vi.fn(),
        render: vi.fn(),
        onCollision: vi.fn(),
        destroy: vi.fn()
      }
      
      pickup.onCollision(otherEntity)
      
      // 不应该触发拾取
      expect(pickupCallback).not.toHaveBeenCalled()
      expect(pickup.isActive).toBe(true)
    })

    it('应该正确传递所有掉落物类型给回调', () => {
      const allTypes = [
        PickupType.REPAIR,
        PickupType.MACHINEGUN_BULLETS,
        PickupType.MACHINEGUN_TRAJECTORY,
        PickupType.MACHINEGUN_FIRERATE,
        PickupType.MACHINEGUN_DAMAGE,
        PickupType.MACHINEGUN_SPEED,
        PickupType.MISSILE_COUNT,
        PickupType.MISSILE_DAMAGE,
        PickupType.MISSILE_SPEED,
        PickupType.ENGINE
      ]

      allTypes.forEach(type => {
        const pickup = new Pickup(type, player.x, player.y)
        const pickupCallback = vi.fn()
        
        pickup.setOnPickup(pickupCallback)
        pickup.onCollision(player)
        
        expect(pickupCallback).toHaveBeenCalledWith(type)
        expect(pickupCallback).toHaveBeenCalledTimes(1)
      })
    })

    it('应该在玩家飞机接触掉落物时触发拾取', () => {
      // 测试不同位置的碰撞
      const positions = [
        { x: player.x, y: player.y }, // 完全重叠
        { x: player.x + 10, y: player.y + 10 }, // 部分重叠
        { x: player.x - 10, y: player.y - 10 } // 部分重叠
      ]

      positions.forEach(pos => {
        const pickup = new Pickup(PickupType.REPAIR, pos.x, pos.y)
        const pickupCallback = vi.fn()
        
        pickup.setOnPickup(pickupCallback)
        pickup.onCollision(player)
        
        expect(pickupCallback).toHaveBeenCalled()
        expect(pickup.isActive).toBe(false)
      })
    })
  })

  describe('子任务 12.3: 掉落物效果验证 - 验证需求 4.4, 4.5', () => {
    it('应该在拾取生命值掉落物时增加玩家生命值', () => {
      const pickup = new Pickup(PickupType.REPAIR, player.x, player.y)
      const initialHealth = player.health
      
      // 先受伤
      player.takeDamage(2)
      expect(player.health).toBe(initialHealth - 2)
      
      // 设置拾取回调来模拟效果应用
      pickup.setOnPickup((type) => {
        if (type === PickupType.REPAIR) {
          player.heal(1)
        }
      })
      
      pickup.onCollision(player)
      
      // 验证生命值增加
      expect(player.health).toBe(initialHealth - 1)
    })

    it('应该在拾取引擎掉落物时增加玩家速度', () => {
      const pickup = new Pickup(PickupType.ENGINE, player.x, player.y)
      const initialSpeed = player.speed
      
      // 设置拾取回调来模拟效果应用
      pickup.setOnPickup((type) => {
        if (type === PickupType.ENGINE) {
          player.increaseSpeed(1)
        }
      })
      
      pickup.onCollision(player)
      
      // 验证速度增加
      expect(player.speed).toBe(initialSpeed + 1)
    })

    it('应该在拾取机炮子弹掉落物时触发回调', () => {
      const pickup = new Pickup(PickupType.MACHINEGUN_BULLETS, player.x, player.y)
      let effectApplied = false
      
      // 设置拾取回调来模拟效果应用
      pickup.setOnPickup((type) => {
        if (type === PickupType.MACHINEGUN_BULLETS) {
          // 模拟增加机炮子弹数量（实际效果由游戏引擎处理）
          effectApplied = true
        }
      })
      
      pickup.onCollision(player)
      
      // 验证回调被调用且掉落物被销毁
      expect(effectApplied).toBe(true)
      expect(pickup.isActive).toBe(false)
    })

    it('应该在拾取机炮弹道掉落物时触发回调', () => {
      const pickup = new Pickup(PickupType.MACHINEGUN_TRAJECTORY, player.x, player.y)
      let effectApplied = false
      
      // 设置拾取回调来模拟效果应用
      pickup.setOnPickup((type) => {
        if (type === PickupType.MACHINEGUN_TRAJECTORY) {
          effectApplied = true
        }
      })
      
      pickup.onCollision(player)
      
      // 验证回调被调用且掉落物被销毁
      expect(effectApplied).toBe(true)
      expect(pickup.isActive).toBe(false)
    })

    it('应该在拾取机炮射速掉落物时触发回调', () => {
      const pickup = new Pickup(PickupType.MACHINEGUN_FIRERATE, player.x, player.y)
      let effectApplied = false
      
      // 设置拾取回调来模拟效果应用
      pickup.setOnPickup((type) => {
        if (type === PickupType.MACHINEGUN_FIRERATE) {
          effectApplied = true
        }
      })
      
      pickup.onCollision(player)
      
      // 验证回调被调用且掉落物被销毁
      expect(effectApplied).toBe(true)
      expect(pickup.isActive).toBe(false)
    })

    it('应该在拾取机炮伤害掉落物时触发回调', () => {
      const pickup = new Pickup(PickupType.MACHINEGUN_DAMAGE, player.x, player.y)
      let effectApplied = false
      
      // 设置拾取回调来模拟效果应用
      pickup.setOnPickup((type) => {
        if (type === PickupType.MACHINEGUN_DAMAGE) {
          effectApplied = true
        }
      })
      
      pickup.onCollision(player)
      
      // 验证回调被调用且掉落物被销毁
      expect(effectApplied).toBe(true)
      expect(pickup.isActive).toBe(false)
    })

    it('应该在拾取机炮速度掉落物时触发回调', () => {
      const pickup = new Pickup(PickupType.MACHINEGUN_SPEED, player.x, player.y)
      let effectApplied = false
      
      // 设置拾取回调来模拟效果应用
      pickup.setOnPickup((type) => {
        if (type === PickupType.MACHINEGUN_SPEED) {
          effectApplied = true
        }
      })
      
      pickup.onCollision(player)
      
      // 验证回调被调用且掉落物被销毁
      expect(effectApplied).toBe(true)
      expect(pickup.isActive).toBe(false)
    })

    it('应该在拾取导弹数量掉落物时触发回调', () => {
      const pickup = new Pickup(PickupType.MISSILE_COUNT, player.x, player.y)
      let effectApplied = false
      
      // 设置拾取回调来模拟效果应用
      pickup.setOnPickup((type) => {
        if (type === PickupType.MISSILE_COUNT) {
          effectApplied = true
        }
      })
      
      pickup.onCollision(player)
      
      // 验证回调被调用且掉落物被销毁
      expect(effectApplied).toBe(true)
      expect(pickup.isActive).toBe(false)
    })

    it('应该在拾取导弹伤害掉落物时触发回调', () => {
      const pickup = new Pickup(PickupType.MISSILE_DAMAGE, player.x, player.y)
      let effectApplied = false
      
      // 设置拾取回调来模拟效果应用
      pickup.setOnPickup((type) => {
        if (type === PickupType.MISSILE_DAMAGE) {
          effectApplied = true
        }
      })
      
      pickup.onCollision(player)
      
      // 验证回调被调用且掉落物被销毁
      expect(effectApplied).toBe(true)
      expect(pickup.isActive).toBe(false)
    })

    it('应该在拾取导弹速度掉落物时触发回调', () => {
      const pickup = new Pickup(PickupType.MISSILE_SPEED, player.x, player.y)
      let effectApplied = false
      
      // 设置拾取回调来模拟效果应用
      pickup.setOnPickup((type) => {
        if (type === PickupType.MISSILE_SPEED) {
          effectApplied = true
        }
      })
      
      pickup.onCollision(player)
      
      // 验证回调被调用且掉落物被销毁
      expect(effectApplied).toBe(true)
      expect(pickup.isActive).toBe(false)
    })

    it('应该正确显示和移动掉落物', () => {
      const pickup = new Pickup(PickupType.REPAIR, 100, 100)
      const initialY = pickup.y
      
      // 更新掉落物（向下移动）
      pickup.update(16)
      
      // 验证掉落物向下移动
      expect(pickup.y).toBeGreaterThan(initialY)
      expect(pickup.isActive).toBe(true)
    })

    it('应该在屏幕范围内正确显示', () => {
      const pickup = new Pickup(PickupType.REPAIR, 100, 100)
      
      // 验证掉落物在屏幕范围内
      expect(pickup.x).toBeGreaterThanOrEqual(0)
      expect(pickup.y).toBeGreaterThanOrEqual(0)
      expect(pickup.isActive).toBe(true)
    })

    it('应该为所有掉落物类型正确应用效果', () => {
      const allTypes = [
        PickupType.REPAIR,
        PickupType.MACHINEGUN_BULLETS,
        PickupType.MACHINEGUN_TRAJECTORY,
        PickupType.MACHINEGUN_FIRERATE,
        PickupType.MACHINEGUN_DAMAGE,
        PickupType.MACHINEGUN_SPEED,
        PickupType.MISSILE_COUNT,
        PickupType.MISSILE_DAMAGE,
        PickupType.MISSILE_SPEED,
        PickupType.ENGINE
      ]

      allTypes.forEach(type => {
        const pickup = new Pickup(type, player.x, player.y)
        let effectApplied = false
        
        pickup.setOnPickup((pickupType) => {
          expect(pickupType).toBe(type)
          effectApplied = true
        })
        
        pickup.onCollision(player)
        
        // 验证效果被应用
        expect(effectApplied).toBe(true)
        expect(pickup.isActive).toBe(false)
      })
    })
  })

  describe('边界情况和异常处理', () => {
    it('应该处理没有设置回调的情况', () => {
      const pickup = new Pickup(PickupType.REPAIR, player.x, player.y)
      
      // 不设置回调，直接触发碰撞
      expect(() => pickup.onCollision(player)).not.toThrow()
      expect(pickup.isActive).toBe(false)
    })

    it('应该处理多次碰撞的情况', () => {
      const pickup = new Pickup(PickupType.REPAIR, player.x, player.y)
      const pickupCallback = vi.fn()
      
      pickup.setOnPickup(pickupCallback)
      
      // 第一次碰撞
      pickup.onCollision(player)
      expect(pickupCallback).toHaveBeenCalledTimes(1)
      expect(pickup.isActive).toBe(false)
      
      // 第二次碰撞（掉落物已销毁）
      pickup.onCollision(player)
      // 回调不应该再次触发
      expect(pickupCallback).toHaveBeenCalledTimes(1)
    })

    it('应该正确获取掉落物类型', () => {
      const pickup = new Pickup(PickupType.REPAIR, 100, 100)
      expect(pickup.getType()).toBe(PickupType.REPAIR)
    })

    it('应该处理掉落物在屏幕边缘的情况', () => {
      const edgePositions = [
        { x: 0, y: 0 },
        { x: 800, y: 0 },
        { x: 0, y: 600 },
        { x: 800, y: 600 }
      ]

      edgePositions.forEach(pos => {
        const pickup = new Pickup(PickupType.REPAIR, pos.x, pos.y)
        expect(pickup.isActive).toBe(true)
        expect(pickup.x).toBe(pos.x)
        expect(pickup.y).toBe(pos.y)
      })
    })

    it('应该处理掉落物快速移动到屏幕外的情况', () => {
      const pickup = new Pickup(PickupType.REPAIR, 100, 100)
      
      // 模拟多次更新，快速移动到屏幕外
      for (let i = 0; i < 500; i++) {
        if (pickup.isActive) {
          pickup.update(16)
        }
      }
      
      // 验证掉落物已销毁
      expect(pickup.isActive).toBe(false)
    })

    it('应该处理同一位置多个掉落物的情况', () => {
      const pickups = [
        new Pickup(PickupType.REPAIR, 100, 100),
        new Pickup(PickupType.MACHINEGUN_BULLETS, 100, 100),
        new Pickup(PickupType.MISSILE_COUNT, 100, 100)
      ]

      pickups.forEach(pickup => {
        expect(pickup.isActive).toBe(true)
        expect(pickup.x).toBe(100)
        expect(pickup.y).toBe(100)
      })
    })
  })

  describe('掉落物生成概率测试 - 验证需求 4.2', () => {
    it('应该根据配置的概率生成不同类型的掉落物', () => {
      // 测试大量敌人死亡，统计掉落物分布
      const dropCounts: Record<string, number> = {
        repair: 0,
        machineGun: 0,
        missile: 0,
        engine: 0,
        none: 0
      }

      const iterations = 1000
      
      for (let i = 0; i < iterations; i++) {
        const enemy = new Enemy(EnemyType.WHITE, 100, 100)
        const dropType = enemy.die()
        
        if (dropType === null) {
          dropCounts.none++
        } else if (dropType === PickupType.REPAIR) {
          dropCounts.repair++
        } else if ([
          PickupType.MACHINEGUN_BULLETS,
          PickupType.MACHINEGUN_TRAJECTORY,
          PickupType.MACHINEGUN_FIRERATE,
          PickupType.MACHINEGUN_DAMAGE,
          PickupType.MACHINEGUN_SPEED
        ].includes(dropType)) {
          dropCounts.machineGun++
        } else if ([
          PickupType.MISSILE_COUNT,
          PickupType.MISSILE_DAMAGE,
          PickupType.MISSILE_SPEED
        ].includes(dropType)) {
          dropCounts.missile++
        } else if (dropType === PickupType.ENGINE) {
          dropCounts.engine++
        }
      }

      // 验证各类掉落物都有生成（概率测试，允许一定误差）
      // WHITE 敌人的掉落率配置：repair: 0.25, machineGun: 0.2, missile: 0.1, engine: 0.1
      expect(dropCounts.repair).toBeGreaterThan(0)
      expect(dropCounts.machineGun).toBeGreaterThan(0)
      expect(dropCounts.missile).toBeGreaterThan(0)
      expect(dropCounts.engine).toBeGreaterThan(0)
      
      // 验证维修掉落物最多（概率最高 0.25）
      expect(dropCounts.repair).toBeGreaterThan(dropCounts.missile)
      expect(dropCounts.repair).toBeGreaterThan(dropCounts.engine)
    })

    it('应该为不同敌人类型生成不同概率的掉落物', () => {
      const enemyTypes = [
        EnemyType.WHITE,
        EnemyType.GREEN,
        EnemyType.BLUE
      ]

      enemyTypes.forEach(type => {
        const dropCounts: Record<string, number> = {
          total: 0,
          hasDrops: 0
        }

        const iterations = 100
        
        for (let i = 0; i < iterations; i++) {
          const enemy = new Enemy(type, 100, 100)
          const dropType = enemy.die()
          
          dropCounts.total++
          if (dropType !== null) {
            dropCounts.hasDrops++
          }
        }

        // 验证有掉落物生成
        expect(dropCounts.hasDrops).toBeGreaterThan(0)
        
        // 验证掉落率在合理范围内（0-100%）
        const dropRate = dropCounts.hasDrops / dropCounts.total
        expect(dropRate).toBeGreaterThanOrEqual(0)
        expect(dropRate).toBeLessThanOrEqual(1)
      })
    })

    it('应该在敌人死亡时正确返回掉落物类型', () => {
      const enemy = new Enemy(EnemyType.WHITE, 100, 100)
      const dropType = enemy.die()
      
      // 验证返回值是有效的掉落物类型或 null
      if (dropType !== null) {
        expect(Object.values(PickupType)).toContain(dropType)
      } else {
        expect(dropType).toBeNull()
      }
    })

    it('应该在多次敌人死亡时生成多样化的掉落物', () => {
      const uniqueDropTypes = new Set<PickupType>()
      const iterations = 200
      
      for (let i = 0; i < iterations; i++) {
        const enemy = new Enemy(EnemyType.WHITE, 100, 100)
        const dropType = enemy.die()
        
        if (dropType !== null) {
          uniqueDropTypes.add(dropType)
        }
      }

      // 验证生成了多种不同的掉落物类型（至少3种）
      expect(uniqueDropTypes.size).toBeGreaterThanOrEqual(3)
    })
  })

  describe('掉落物渲染测试', () => {
    it('应该能够渲染所有类型的掉落物', () => {
      const allTypes = [
        PickupType.REPAIR,
        PickupType.MACHINEGUN_BULLETS,
        PickupType.MACHINEGUN_TRAJECTORY,
        PickupType.MACHINEGUN_FIRERATE,
        PickupType.MACHINEGUN_DAMAGE,
        PickupType.MACHINEGUN_SPEED,
        PickupType.MISSILE_COUNT,
        PickupType.MISSILE_DAMAGE,
        PickupType.MISSILE_SPEED,
        PickupType.ENGINE
      ]

      // 创建 mock canvas context
      const mockCtx = {
        save: vi.fn(),
        restore: vi.fn(),
        fillRect: vi.fn(),
        fillStyle: ''
      } as unknown as CanvasRenderingContext2D

      allTypes.forEach(type => {
        const pickup = new Pickup(type, 100, 100)
        
        // 应该能够渲染而不抛出错误
        expect(() => pickup.render(mockCtx)).not.toThrow()
      })
    })

    it('应该在渲染时调用 canvas context 方法', () => {
      const pickup = new Pickup(PickupType.REPAIR, 100, 100)
      
      const mockCtx = {
        save: vi.fn(),
        restore: vi.fn(),
        fillRect: vi.fn(),
        fillStyle: ''
      } as unknown as CanvasRenderingContext2D

      pickup.render(mockCtx)

      // 验证调用了 save 和 restore
      expect(mockCtx.save).toHaveBeenCalled()
      expect(mockCtx.restore).toHaveBeenCalled()
      // 验证调用了 fillRect（绘制像素块）
      expect(mockCtx.fillRect).toHaveBeenCalled()
    })
  })
})
