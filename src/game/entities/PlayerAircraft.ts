/**
 * 玩家飞机实体
 */

import type { Entity } from '../types'
import { GAME_CONFIG, SCENE_CONFIG, PIXEL_STYLE, MOVEMENT_CONFIG } from '../constants'
import { clampEntityToBounds, getEntityCenter } from '../utils'

export class PlayerAircraft implements Entity {
  id: string
  x: number
  y: number
  width: number = 40
  height: number = 40
  isActive: boolean = true

  health: number
  maxHealth: number
  speed: number

  // 死亡回调
  private onDeathCallback: (() => void) | null = null

  // 缓存缩放后的 Canvas 尺寸
  private canvasWidth: number
  private canvasHeight: number

  constructor(x: number, y: number) {
    this.id = 'player'
    this.x = x
    this.y = y
    this.health = GAME_CONFIG.PLAYER_INITIAL_HEALTH
    this.maxHealth = GAME_CONFIG.PLAYER_INITIAL_HEALTH
    this.speed = GAME_CONFIG.PLAYER_INITIAL_SPEED

    // 使用缩放后的 Canvas 尺寸
    this.canvasWidth = SCENE_CONFIG.CANVAS_WIDTH_V2
    this.canvasHeight = SCENE_CONFIG.CANVAS_HEIGHT_V2
  }

  /**
   * 移动玩家（V2 版本）
   * 单次按键移动 1 像素块，长按每 200ms 移动 1 像素块
   * 释放按键立即停止
   * @param dx 水平方向 (-1, 0, 1)
   * @param dy 垂直方向 (-1, 0, 1)
   */
  move(dx: number, dy: number): void {
    // V2: 使用像素块移动，不再使用 speed 倍数
    // 每次移动恰好 1 个像素块的距离
    this.x += dx * MOVEMENT_CONFIG.PLAYER_MOVE_DISTANCE
    this.y += dy * MOVEMENT_CONFIG.PLAYER_MOVE_DISTANCE

    // 边界限制（使用 V2 扩展后的场景尺寸：1200x900）
    // 确保玩家不会移出屏幕
    clampEntityToBounds(this, 0, 0, this.canvasWidth, this.canvasHeight)
  }

  /**
   * 受到伤害
   */
  takeDamage(amount: number): void {
    // 已死亡则忽略后续伤害
    if (!this.isActive) return

    this.health -= amount
    console.log(`[玩家] 受到 ${amount} 点伤害，剩余血量: ${this.health}/${this.maxHealth}`)

    if (this.health <= 0) {
      this.health = 0
      this.die()
    }
  }

  /**
   * 治疗
   */
  heal(amount: number): void {
    this.health = Math.min(this.health + amount, this.maxHealth)
    console.log(`[玩家] 恢复 ${amount} 点血量，当前血量: ${this.health}/${this.maxHealth}`)
  }

  /**
   * 增加速度
   */
  increaseSpeed(amount: number): void {
    this.speed += amount
    console.log(`[玩家] 速度提升至: ${this.speed}`)
  }

  /**
   * 设置死亡回调
   */
  setOnDeath(callback: () => void): void {
    this.onDeathCallback = callback
  }

  /**
   * 玩家死亡
   */
  private die(): void {
    console.log('[玩家] 死亡')
    this.isActive = false
    if (this.onDeathCallback) {
      this.onDeathCallback()
    }
  }

  /**
   * 更新
   */
  update(_deltaTime: number): void {
    // 玩家的移动由输入系统控制，这里不需要额外逻辑
  }

  /**
   * 渲染
   */
  render(ctx: CanvasRenderingContext2D): void {
    // 绘制玩家飞机（简单的三角形）
    ctx.save()
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2)

    // 飞机主体（绿色三角形）
    ctx.fillStyle = PIXEL_STYLE.colors.player
    ctx.beginPath()
    ctx.moveTo(0, -this.height / 2) // 顶点
    ctx.lineTo(-this.width / 2, this.height / 2) // 左下
    ctx.lineTo(this.width / 2, this.height / 2) // 右下
    ctx.closePath()
    ctx.fill()

    // 边框
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    ctx.stroke()

    // 如果受伤，显示红色闪烁效果
    if (this.health < this.maxHealth / 2) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'
      ctx.fill()
    }

    ctx.restore()

    // 绘制血条
    this.renderHealthBar(ctx)
  }

  /**
   * 渲染血条
   */
  private renderHealthBar(ctx: CanvasRenderingContext2D): void {
    const barWidth = this.width
    const barHeight = 4
    const barX = this.x
    const barY = this.y - 10

    // 背景（红色）
    ctx.fillStyle = '#FF0000'
    ctx.fillRect(barX, barY, barWidth, barHeight)

    // 当前血量（绿色）
    const healthPercent = this.health / this.maxHealth
    ctx.fillStyle = '#00FF00'
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight)

    // 边框
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 1
    ctx.strokeRect(barX, barY, barWidth, barHeight)
  }

  /**
   * 碰撞处理
   */
  onCollision(other: Entity): void {
    // 碰撞处理将在后续实现
    console.log(`[玩家] 与 ${other.id} 发生碰撞`)
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.isActive = false
  }

  /**
   * 获取中心点坐标
   * 使用工具函数提高代码复用性
   */
  getCenterX(): number {
    return getEntityCenter(this).x
  }

  getCenterY(): number {
    return getEntityCenter(this).y
  }
}
