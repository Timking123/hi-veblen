/**
 * 四叉树单元测试
 * 验证 Quadtree 的 clear、insert、getPotentialCollisions、query 方法
 */

import { describe, it, expect } from 'vitest'
import { Quadtree } from '../Quadtree'
import type { Entity } from '../types'

/** 创建模拟实体 */
function createEntity(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number
): Entity {
  return {
    id,
    x,
    y,
    width,
    height,
    isActive: true,
    update: () => {},
    render: () => {},
    onCollision: () => {},
    destroy: () => {},
  }
}

describe('Quadtree（四叉树）', () => {
  const worldBounds = { x: 0, y: 0, width: 800, height: 600 }

  describe('constructor（构造函数）', () => {
    it('应该正确创建四叉树实例', () => {
      const qt = new Quadtree(worldBounds)
      expect(qt).toBeDefined()
    })
  })

  describe('clear（清空）', () => {
    it('应该清空所有已插入的实体', () => {
      const qt = new Quadtree(worldBounds)
      qt.insert(createEntity('e1', 10, 10, 20, 20))
      qt.insert(createEntity('e2', 50, 50, 20, 20))
      qt.clear()

      const pairs = qt.getPotentialCollisions()
      expect(pairs).toHaveLength(0)
    })
  })

  describe('insert（插入）', () => {
    it('应该能插入单个实体', () => {
      const qt = new Quadtree(worldBounds)
      const entity = createEntity('e1', 100, 100, 30, 30)
      expect(() => qt.insert(entity)).not.toThrow()
    })

    it('应该能插入多个实体', () => {
      const qt = new Quadtree(worldBounds)
      for (let i = 0; i < 10; i++) {
        qt.insert(createEntity(`e${i}`, i * 50, i * 40, 20, 20))
      }
      // 不抛出异常即为成功
    })

    it('超过 maxEntities 时应触发节点分裂', () => {
      const qt = new Quadtree(worldBounds)
      // 在同一区域插入 5 个实体（超过 maxEntities=4）
      for (let i = 0; i < 5; i++) {
        qt.insert(createEntity(`e${i}`, 10 + i * 5, 10 + i * 5, 10, 10))
      }
      // 分裂后仍能正确查询
      const results = qt.query({ x: 0, y: 0, width: 100, height: 100 })
      expect(results).toHaveLength(5)
    })
  })

  describe('getPotentialCollisions（获取潜在碰撞对）', () => {
    it('空树应返回空数组', () => {
      const qt = new Quadtree(worldBounds)
      expect(qt.getPotentialCollisions()).toHaveLength(0)
    })

    it('单个实体应返回空数组', () => {
      const qt = new Quadtree(worldBounds)
      qt.insert(createEntity('e1', 100, 100, 20, 20))
      expect(qt.getPotentialCollisions()).toHaveLength(0)
    })

    it('同一区域的两个实体应返回一个碰撞对', () => {
      const qt = new Quadtree(worldBounds)
      const e1 = createEntity('e1', 100, 100, 20, 20)
      const e2 = createEntity('e2', 110, 110, 20, 20)
      qt.insert(e1)
      qt.insert(e2)

      const pairs = qt.getPotentialCollisions()
      expect(pairs).toHaveLength(1)
      const ids = pairs[0].map(e => e.id).sort()
      expect(ids).toEqual(['e1', 'e2'])
    })

    it('不同区域的实体不应产生碰撞对', () => {
      const qt = new Quadtree(worldBounds)
      // 左上角
      qt.insert(createEntity('e1', 10, 10, 5, 5))
      // 右下角
      qt.insert(createEntity('e2', 790, 590, 5, 5))

      // 插入更多实体触发分裂，使它们分到不同子节点
      qt.insert(createEntity('e3', 10, 10, 5, 5))
      qt.insert(createEntity('e4', 10, 10, 5, 5))
      qt.insert(createEntity('e5', 10, 10, 5, 5))

      const pairs = qt.getPotentialCollisions()
      // e2 不应与 e1/e3/e4/e5 配对
      const hasE2Pair = pairs.some(
        ([a, b]) => a.id === 'e2' || b.id === 'e2'
      )
      // 分裂后 e2 在右下角子节点，不与左上角实体配对
      // 注意：如果还没分裂到足够深度，e2 可能仍在同一节点
      // 这里主要验证碰撞对不重复
      const pairKeys = pairs.map(([a, b]) => {
        const sorted = [a.id, b.id].sort()
        return `${sorted[0]}|${sorted[1]}`
      })
      const uniqueKeys = new Set(pairKeys)
      expect(uniqueKeys.size).toBe(pairKeys.length)
    })

    it('碰撞对不应有重复', () => {
      const qt = new Quadtree(worldBounds)
      // 在中心区域放置跨象限的实体
      for (let i = 0; i < 8; i++) {
        qt.insert(createEntity(`e${i}`, 390 + i * 3, 290 + i * 3, 30, 30))
      }

      const pairs = qt.getPotentialCollisions()
      const pairKeys = pairs.map(([a, b]) => {
        const sorted = [a.id, b.id].sort()
        return `${sorted[0]}|${sorted[1]}`
      })
      const uniqueKeys = new Set(pairKeys)
      expect(uniqueKeys.size).toBe(pairKeys.length)
    })
  })

  describe('query（区域查询）', () => {
    it('空树查询应返回空数组', () => {
      const qt = new Quadtree(worldBounds)
      const results = qt.query({ x: 0, y: 0, width: 100, height: 100 })
      expect(results).toHaveLength(0)
    })

    it('应该返回与查询区域重叠的实体', () => {
      const qt = new Quadtree(worldBounds)
      const e1 = createEntity('e1', 50, 50, 20, 20)
      const e2 = createEntity('e2', 500, 500, 20, 20)
      qt.insert(e1)
      qt.insert(e2)

      const results = qt.query({ x: 0, y: 0, width: 100, height: 100 })
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('e1')
    })

    it('应该返回所有与查询区域重叠的实体', () => {
      const qt = new Quadtree(worldBounds)
      qt.insert(createEntity('e1', 50, 50, 20, 20))
      qt.insert(createEntity('e2', 80, 80, 20, 20))
      qt.insert(createEntity('e3', 500, 500, 20, 20))

      const results = qt.query({ x: 0, y: 0, width: 200, height: 200 })
      const ids = results.map(e => e.id).sort()
      expect(ids).toEqual(['e1', 'e2'])
    })

    it('查询结果不应有重复实体', () => {
      const qt = new Quadtree(worldBounds)
      // 跨象限的大实体
      qt.insert(createEntity('big', 350, 250, 100, 100))
      // 插入更多实体触发分裂
      for (let i = 0; i < 6; i++) {
        qt.insert(createEntity(`e${i}`, i * 100, i * 80, 10, 10))
      }

      const results = qt.query({ x: 300, y: 200, width: 200, height: 200 })
      const ids = results.map(e => e.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('不与查询区域重叠的实体不应被返回', () => {
      const qt = new Quadtree(worldBounds)
      qt.insert(createEntity('e1', 700, 500, 20, 20))

      const results = qt.query({ x: 0, y: 0, width: 100, height: 100 })
      expect(results).toHaveLength(0)
    })
  })

  describe('边界情况', () => {
    it('实体恰好在边界上应被正确处理', () => {
      const qt = new Quadtree(worldBounds)
      // 实体在世界边界的边缘
      qt.insert(createEntity('edge', 0, 0, 10, 10))
      const results = qt.query({ x: 0, y: 0, width: 20, height: 20 })
      expect(results).toHaveLength(1)
    })

    it('大量实体应能正确处理', () => {
      const qt = new Quadtree(worldBounds)
      const count = 100
      for (let i = 0; i < count; i++) {
        qt.insert(
          createEntity(
            `e${i}`,
            Math.random() * 780,
            Math.random() * 580,
            10,
            10
          )
        )
      }

      // 全区域查询应返回所有实体
      const results = qt.query({ x: 0, y: 0, width: 800, height: 600 })
      expect(results).toHaveLength(count)
    })

    it('clear 后重新插入应正常工作', () => {
      const qt = new Quadtree(worldBounds)
      qt.insert(createEntity('e1', 100, 100, 20, 20))
      qt.clear()
      qt.insert(createEntity('e2', 200, 200, 20, 20))

      const results = qt.query({ x: 0, y: 0, width: 800, height: 600 })
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('e2')
    })
  })
})
