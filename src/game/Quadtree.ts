/**
 * 四叉树空间分区数据结构
 * 用于优化碰撞检测，将 O(n²) 复杂度降低到接近 O(n log n)
 */

import type { Entity } from './types'

/** 四叉树节点的矩形边界 */
export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

/** 四叉树节点 */
interface QuadtreeNode {
  bounds: Bounds
  entities: Entity[]
  children: QuadtreeNode[] | null
  level: number
}

export class Quadtree {
  private root: QuadtreeNode
  private maxEntities: number = 4  // 每个节点最大实体数
  private maxLevel: number = 5     // 最大深度

  constructor(bounds: Bounds) {
    this.root = { bounds, entities: [], children: null, level: 0 }
  }

  /** 清空四叉树，重置为初始状态 */
  clear(): void {
    this.clearNode(this.root)
  }

  /** 递归清空节点 */
  private clearNode(node: QuadtreeNode): void {
    node.entities = []
    if (node.children) {
      for (const child of node.children) {
        this.clearNode(child)
      }
      node.children = null
    }
  }

  /** 插入实体到四叉树 */
  insert(entity: Entity): void {
    this.insertIntoNode(this.root, entity)
  }

  /** 将实体插入到指定节点 */
  private insertIntoNode(node: QuadtreeNode, entity: Entity): void {
    // 如果节点已分裂，尝试将实体放入子节点
    if (node.children) {
      const indices = this.getChildIndices(node, entity)
      for (const index of indices) {
        this.insertIntoNode(node.children[index], entity)
      }
      return
    }

    // 将实体添加到当前节点
    node.entities.push(entity)

    // 如果超过容量且未达到最大深度，进行分裂
    if (node.entities.length > this.maxEntities && node.level < this.maxLevel) {
      this.split(node)
    }
  }

  /**
   * 获取实体所属的子节点索引
   * 实体可能跨越多个象限，因此返回索引数组
   * 子节点顺序：0=左上(NW), 1=右上(NE), 2=左下(SW), 3=右下(SE)
   */
  private getChildIndices(node: QuadtreeNode, entity: Entity): number[] {
    const indices: number[] = []
    const midX = node.bounds.x + node.bounds.width / 2
    const midY = node.bounds.y + node.bounds.height / 2

    const entityRight = entity.x + entity.width
    const entityBottom = entity.y + entity.height

    const inLeft = entity.x < midX
    const inRight = entityRight > midX
    const inTop = entity.y < midY
    const inBottom = entityBottom > midY

    // 左上 (NW)
    if (inLeft && inTop) indices.push(0)
    // 右上 (NE)
    if (inRight && inTop) indices.push(1)
    // 左下 (SW)
    if (inLeft && inBottom) indices.push(2)
    // 右下 (SE)
    if (inRight && inBottom) indices.push(3)

    return indices
  }

  /** 分裂节点为四个子节点 */
  private split(node: QuadtreeNode): void {
    const { x, y, width, height } = node.bounds
    const halfW = width / 2
    const halfH = height / 2
    const nextLevel = node.level + 1

    node.children = [
      // 0: 左上 (NW)
      { bounds: { x, y, width: halfW, height: halfH }, entities: [], children: null, level: nextLevel },
      // 1: 右上 (NE)
      { bounds: { x: x + halfW, y, width: halfW, height: halfH }, entities: [], children: null, level: nextLevel },
      // 2: 左下 (SW)
      { bounds: { x, y: y + halfH, width: halfW, height: halfH }, entities: [], children: null, level: nextLevel },
      // 3: 右下 (SE)
      { bounds: { x: x + halfW, y: y + halfH, width: halfW, height: halfH }, entities: [], children: null, level: nextLevel },
    ]

    // 将当前节点的实体重新分配到子节点
    const entities = node.entities
    node.entities = []
    for (const entity of entities) {
      const indices = this.getChildIndices(node, entity)
      for (const index of indices) {
        this.insertIntoNode(node.children[index], entity)
      }
    }
  }

  /**
   * 获取所有可能碰撞的实体对
   * 返回不重复的碰撞对（[A,B] 和 [B,A] 只出现一次）
   */
  getPotentialCollisions(): [Entity, Entity][] {
    const pairs: [Entity, Entity][] = []
    const pairSet = new Set<string>()
    this.findPairsInNode(this.root, pairs, pairSet)
    return pairs
  }

  /** 递归查找节点中的碰撞对 */
  private findPairsInNode(
    node: QuadtreeNode,
    pairs: [Entity, Entity][],
    pairSet: Set<string>
  ): void {
    // 叶子节点：对节点内的实体两两配对
    if (!node.children) {
      const entities = node.entities
      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          const a = entities[i]
          const b = entities[j]
          // 使用 id 排序生成唯一键，避免重复
          const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`
          if (!pairSet.has(key)) {
            pairSet.add(key)
            pairs.push([a, b])
          }
        }
      }
      return
    }

    // 非叶子节点：递归处理子节点
    for (const child of node.children) {
      this.findPairsInNode(child, pairs, pairSet)
    }
  }

  /**
   * 查询与给定区域重叠的所有实体
   * @param bounds 查询区域
   * @returns 与该区域重叠的实体数组（去重）
   */
  query(bounds: Bounds): Entity[] {
    const result: Entity[] = []
    const seen = new Set<string>()
    this.queryNode(this.root, bounds, result, seen)
    return result
  }

  /** 递归查询节点 */
  private queryNode(
    node: QuadtreeNode,
    bounds: Bounds,
    result: Entity[],
    seen: Set<string>
  ): void {
    // 如果查询区域与节点边界不重叠，直接返回
    if (!this.boundsOverlap(node.bounds, bounds)) {
      return
    }

    // 收集当前节点的实体
    for (const entity of node.entities) {
      if (!seen.has(entity.id) && this.entityOverlapsBounds(entity, bounds)) {
        seen.add(entity.id)
        result.push(entity)
      }
    }

    // 递归查询子节点
    if (node.children) {
      for (const child of node.children) {
        this.queryNode(child, bounds, result, seen)
      }
    }
  }

  /** 检查两个矩形区域是否重叠 */
  private boundsOverlap(a: Bounds, b: Bounds): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    )
  }

  /** 检查实体是否与给定区域重叠 */
  private entityOverlapsBounds(entity: Entity, bounds: Bounds): boolean {
    return (
      entity.x < bounds.x + bounds.width &&
      entity.x + entity.width > bounds.x &&
      entity.y < bounds.y + bounds.height &&
      entity.y + entity.height > bounds.y
    )
  }
}
