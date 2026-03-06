/**
 * 碰撞检测系统
 * 提供各种碰撞检测算法
 */

import type { Entity, Bounds, Circle } from './types'

export class CollisionDetector {
  /**
   * AABB (Axis-Aligned Bounding Box) 碰撞检测
   */
  static checkAABB(a: Bounds, b: Bounds): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    )
  }

  /**
   * 圆形碰撞检测
   */
  static checkCircle(a: Circle, b: Circle): boolean {
    const dx = a.x - b.x
    const dy = a.y - b.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance < a.radius + b.radius
  }

  /**
   * 获取范围内的所有实体（用于导弹爆炸范围检测）
   */
  static getEntitiesInRadius(
    center: { x: number; y: number },
    radius: number,
    entities: Entity[]
  ): Entity[] {
    const result: Entity[] = []

    for (const entity of entities) {
      if (!entity.isActive) continue

      // 计算实体中心点
      const entityCenterX = entity.x + entity.width / 2
      const entityCenterY = entity.y + entity.height / 2

      // 计算距离
      const dx = entityCenterX - center.x
      const dy = entityCenterY - center.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance <= radius) {
        result.push(entity)
      }
    }

    return result
  }

  /**
   * 点与矩形碰撞检测
   */
  static checkPointInRect(point: { x: number; y: number }, rect: Bounds): boolean {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    )
  }

  /**
   * 点与圆形碰撞检测
   */
  static checkPointInCircle(point: { x: number; y: number }, circle: Circle): boolean {
    const dx = point.x - circle.x
    const dy = point.y - circle.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance <= circle.radius
  }
}
