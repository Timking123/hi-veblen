/**
 * 测试实体
 * 用于验证游戏引擎是否正常工作
 */

import type { Entity } from '../types'

export class TestEntity implements Entity {
  id: string
  x: number
  y: number
  width: number
  height: number
  isActive: boolean = true
  
  private vx: number = 2
  private vy: number = 2
  private color: string

  constructor(x: number, y: number, width: number = 50, height: number = 50, color: string = '#00FF00') {
    this.id = `test-${Math.random().toString(36).substr(2, 9)}`
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.color = color
  }

  update(_deltaTime: number): void {
    // 移动
    this.x += this.vx
    this.y += this.vy

    // 边界反弹
    if (this.x <= 0 || this.x + this.width >= 800) {
      this.vx = -this.vx
    }
    if (this.y <= 0 || this.y + this.height >= 600) {
      this.vy = -this.vy
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.color
    ctx.fillRect(this.x, this.y, this.width, this.height)
    
    // 绘制边框
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    ctx.strokeRect(this.x, this.y, this.width, this.height)
  }

  onCollision(_other: Entity): void {
    // 测试实体碰撞时改变颜色
    this.color = '#FF0000'
    setTimeout(() => {
      this.color = '#00FF00'
    }, 100)
  }

  destroy(): void {
    this.isActive = false
  }
}
