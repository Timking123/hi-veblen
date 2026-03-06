/**
 * 实体工具函数
 * 提取实体相关的通用逻辑
 */

import type { Entity } from '../types'

/**
 * 检查实体是否在可见区域内（视锥剔除）
 * @param entity 实体
 * @param canvasWidth Canvas 宽度
 * @param canvasHeight Canvas 高度
 * @param margin 边界容差
 * @returns 是否可见
 */
export function isEntityVisible(
  entity: Entity,
  canvasWidth: number,
  canvasHeight: number,
  margin: number = 50
): boolean {
  return (
    entity.x + entity.width >= -margin &&
    entity.x <= canvasWidth + margin &&
    entity.y + entity.height >= -margin &&
    entity.y <= canvasHeight + margin
  )
}

/**
 * AABB 碰撞检测
 * @param a 实体 A
 * @param b 实体 B
 * @returns 是否碰撞
 */
export function checkAABBCollision(a: Entity, b: Entity): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

/**
 * 获取实体中心点坐标
 * @param entity 实体
 * @returns 中心点坐标 {x, y}
 */
export function getEntityCenter(entity: Entity): { x: number; y: number } {
  return {
    x: entity.x + entity.width / 2,
    y: entity.y + entity.height / 2
  }
}

/**
 * 计算两个实体之间的距离
 * @param a 实体 A
 * @param b 实体 B
 * @returns 距离
 */
export function getEntityDistance(a: Entity, b: Entity): number {
  const centerA = getEntityCenter(a)
  const centerB = getEntityCenter(b)
  const dx = centerB.x - centerA.x
  const dy = centerB.y - centerA.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 检查实体是否在边界内
 * @param entity 实体
 * @param minX 最小 X 坐标
 * @param minY 最小 Y 坐标
 * @param maxX 最大 X 坐标
 * @param maxY 最大 Y 坐标
 * @returns 是否在边界内
 */
export function isEntityInBounds(
  entity: Entity,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): boolean {
  return (
    entity.x >= minX &&
    entity.y >= minY &&
    entity.x + entity.width <= maxX &&
    entity.y + entity.height <= maxY
  )
}

/**
 * 限制实体在边界内
 * @param entity 实体
 * @param minX 最小 X 坐标
 * @param minY 最小 Y 坐标
 * @param maxX 最大 X 坐标
 * @param maxY 最大 Y 坐标
 */
export function clampEntityToBounds(
  entity: Entity,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): void {
  entity.x = Math.max(minX, Math.min(entity.x, maxX - entity.width))
  entity.y = Math.max(minY, Math.min(entity.y, maxY - entity.height))
}

/**
 * 过滤活跃实体
 * @param entities 实体数组
 * @returns 活跃实体数组
 */
export function filterActiveEntities(entities: Entity[]): Entity[] {
  return entities.filter(entity => entity.isActive)
}

/**
 * 按类型过滤实体
 * @param entities 实体数组
 * @param idPrefix ID 前缀
 * @returns 匹配的实体数组
 */
export function filterEntitiesByType(entities: Entity[], idPrefix: string): Entity[] {
  return entities.filter(entity => entity.id.startsWith(idPrefix))
}
