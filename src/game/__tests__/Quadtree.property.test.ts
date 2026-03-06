/**
 * 四叉树碰撞检测属性测试
 * Feature: project-audit-upgrade, Property 2: 四叉树与暴力算法碰撞结果一致
 *
 * **Validates: Requirements 2.1, 2.3, 2.4**
 *
 * 属性描述：
 * For any 一组随机位置和大小的实体（数量 1-200），四叉树碰撞检测返回的碰撞对集合
 * 应该与 O(n²) 暴力算法返回的碰撞对集合完全一致（集合相等）。
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { Quadtree, type Bounds } from '../Quadtree'
import { checkAABBCollision } from '../utils/EntityUtils'
import type { Entity } from '../types'

// ========== 辅助函数 ==========

/** 世界边界：固定为 800x600 */
const WORLD_BOUNDS: Bounds = { x: 0, y: 0, width: 800, height: 600 }

/**
 * 创建模拟 Entity（实体）对象
 * 只需要碰撞检测所需的属性：id, x, y, width, height, isActive
 */
function createMockEntity(
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

/**
 * 暴力算法：O(n²) 遍历所有实体对，检测 AABB 碰撞
 * 返回碰撞对的唯一键集合
 */
function bruteForceCollisions(entities: Entity[]): Set<string> {
  const pairs = new Set<string>()
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      if (checkAABBCollision(entities[i], entities[j])) {
        const key = [entities[i].id, entities[j].id].sort().join('|')
        pairs.add(key)
      }
    }
  }
  return pairs
}

/**
 * 四叉树算法：使用四叉树获取潜在碰撞对，再用 AABB 精确检测
 * 返回碰撞对的唯一键集合
 */
function quadtreeCollisions(entities: Entity[], bounds: Bounds): Set<string> {
  const qt = new Quadtree(bounds)
  for (const entity of entities) {
    qt.insert(entity)
  }
  const potentialPairs = qt.getPotentialCollisions()
  const pairs = new Set<string>()
  for (const [a, b] of potentialPairs) {
    if (checkAABBCollision(a, b)) {
      const key = [a.id, b.id].sort().join('|')
      pairs.add(key)
    }
  }
  return pairs
}

// ========== 生成器 ==========

/**
 * 生成一组随机实体（1-200 个）
 * 使用 fc.array + map 方式高效生成，避免 chain + tuple 的性能问题
 */
const entitiesArb: fc.Arbitrary<Entity[]> = fc
  .array(
    fc.record({
      x: fc.double({ min: -50, max: WORLD_BOUNDS.width + 50, noNaN: true, noDefaultInfinity: true }),
      y: fc.double({ min: -50, max: WORLD_BOUNDS.height + 50, noNaN: true, noDefaultInfinity: true }),
      width: fc.double({ min: 5, max: 100, noNaN: true, noDefaultInfinity: true }),
      height: fc.double({ min: 5, max: 100, noNaN: true, noDefaultInfinity: true }),
    }),
    { minLength: 1, maxLength: 200 }
  )
  .map((records) =>
    records.map((r, i) => createMockEntity(`entity-${i}`, r.x, r.y, r.width, r.height))
  )

/**
 * 生成单个随机实体
 */
const singleEntityArb: fc.Arbitrary<Entity> = fc
  .record({
    x: fc.double({ min: -50, max: WORLD_BOUNDS.width + 50, noNaN: true, noDefaultInfinity: true }),
    y: fc.double({ min: -50, max: WORLD_BOUNDS.height + 50, noNaN: true, noDefaultInfinity: true }),
    width: fc.double({ min: 5, max: 100, noNaN: true, noDefaultInfinity: true }),
    height: fc.double({ min: 5, max: 100, noNaN: true, noDefaultInfinity: true }),
  })
  .map((r) => createMockEntity('entity-0', r.x, r.y, r.width, r.height))

// ========== 测试套件 ==========

describe('Property 2: 四叉树与暴力算法碰撞结果一致', () => {
  /**
   * 属性 2a：四叉树碰撞检测结果与暴力算法完全一致
   * 对于任意一组随机实体，两种算法返回的碰撞对集合应相等
   * **Validates: Requirements 2.1, 2.3, 2.4**
   */
  it('四叉树碰撞检测结果与暴力算法完全一致', () => {
    fc.assert(
      fc.property(
        entitiesArb,
        (entities) => {
          const bruteForcePairs = bruteForceCollisions(entities)
          const quadtreePairs = quadtreeCollisions(entities, WORLD_BOUNDS)

          // 两个集合应完全相等
          expect(quadtreePairs.size).toBe(bruteForcePairs.size)
          for (const pair of bruteForcePairs) {
            expect(quadtreePairs.has(pair)).toBe(true)
          }
          for (const pair of quadtreePairs) {
            expect(bruteForcePairs.has(pair)).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 2b：密集重叠实体场景下结果一致
   * 所有实体集中在小区域内，确保大量碰撞时结果仍然一致
   * **Validates: Requirements 2.1, 2.3, 2.4**
   */
  it('密集重叠实体场景下结果一致', () => {
    // 生成集中在小区域内的实体
    const denseEntitiesArb: fc.Arbitrary<Entity[]> = fc
      .array(
        fc.record({
          x: fc.double({ min: 100, max: 200, noNaN: true, noDefaultInfinity: true }),
          y: fc.double({ min: 100, max: 200, noNaN: true, noDefaultInfinity: true }),
          width: fc.double({ min: 20, max: 80, noNaN: true, noDefaultInfinity: true }),
          height: fc.double({ min: 20, max: 80, noNaN: true, noDefaultInfinity: true }),
        }),
        { minLength: 2, maxLength: 50 }
      )
      .map((records) =>
        records.map((r, i) => createMockEntity(`dense-${i}`, r.x, r.y, r.width, r.height))
      )

    fc.assert(
      fc.property(
        denseEntitiesArb,
        (entities) => {
          const bruteForcePairs = bruteForceCollisions(entities)
          const quadtreePairs = quadtreeCollisions(entities, WORLD_BOUNDS)

          expect(quadtreePairs.size).toBe(bruteForcePairs.size)
          for (const pair of bruteForcePairs) {
            expect(quadtreePairs.has(pair)).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 2c：完全分散无碰撞场景下结果一致
   * 实体间距足够大，不应有任何碰撞
   * **Validates: Requirements 2.1, 2.3, 2.4**
   */
  it('完全分散无碰撞场景下结果一致', () => {
    // 生成间距足够大的实体（网格排列，确保不重叠）
    const spreadEntitiesArb: fc.Arbitrary<Entity[]> = fc
      .integer({ min: 1, max: 20 })
      .map((count) => {
        const entities: Entity[] = []
        const spacing = 150 // 间距远大于实体最大尺寸
        const cols = Math.ceil(Math.sqrt(count))
        for (let i = 0; i < count; i++) {
          const col = i % cols
          const row = Math.floor(i / cols)
          entities.push(
            createMockEntity(
              `spread-${i}`,
              col * spacing,
              row * spacing,
              10, // 小尺寸
              10
            )
          )
        }
        return entities
      })

    fc.assert(
      fc.property(
        spreadEntitiesArb,
        (entities) => {
          const bruteForcePairs = bruteForceCollisions(entities)
          const quadtreePairs = quadtreeCollisions(entities, WORLD_BOUNDS)

          // 两者都应为空集
          expect(bruteForcePairs.size).toBe(0)
          expect(quadtreePairs.size).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 2d：单个实体时无碰撞对
   * **Validates: Requirements 2.1, 2.4**
   */
  it('单个实体时无碰撞对', () => {
    fc.assert(
      fc.property(
        singleEntityArb,
        (entity) => {
          const entities = [entity]
          const bruteForcePairs = bruteForceCollisions(entities)
          const quadtreePairs = quadtreeCollisions(entities, WORLD_BOUNDS)

          expect(bruteForcePairs.size).toBe(0)
          expect(quadtreePairs.size).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})
