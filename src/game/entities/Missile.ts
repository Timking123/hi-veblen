/**
 * 导弹实体
 */

import type { Entity } from '../types'
import { SCENE_CONFIG, PIXEL_STYLE } from '../constants'
import { CollisionDetector } from '../CollisionDetector'
import { AudioSystem, SoundEffect } from '../AudioSystem'

export class Missile implements Entity {
  id: string
  x: number
  y: number
  width: number = 8
  height: number = 16
  isActive: boolean = true

  damage: number
  speed: number
  explosionRadius: number
  owner: 'player' | 'enemy'
  vx: number = 0
  vy: number = 0
  hasExploded: boolean = false
  private audioSystem: AudioSystem | null = null

  // V2: 导弹移动控制
  // 需求 10.2: 每 150ms 移动 1 像素块
  private lastMoveTime: number = 0
  private moveInterval: number = 150 // ms

  // 爆炸动画
  private explosionProgress: number = 0
  private explosionDuration: number = 500 // 毫秒

  // 缓存缩放后的 Canvas 尺寸
  private static canvasWidth: number = SCENE_CONFIG.CANVAS_WIDTH_V2
  private static canvasHeight: number = SCENE_CONFIG.CANVAS_HEIGHT_V2

  constructor(
    x: number = 0,
    y: number = 0,
    damage: number = 0,
    speed: number = 0,
    explosionRadius: number = 0,
    owner: 'player' | 'enemy' = 'player',
    angle: number = 0
  ) {
    this.id = `missile-${Math.random().toString(36).substr(2, 9)}`
    this.x = x
    this.y = y
    this.damage = damage
    this.speed = speed
    this.explosionRadius = explosionRadius
    this.owner = owner
    this.lastMoveTime = Date.now()

    // 根据角度计算速度分量（方向，不是实际速度）
    if (owner === 'player') {
      // 玩家导弹向上发射
      this.vx = Math.sin(angle)
      this.vy = -Math.cos(angle)
    } else {
      // 敌人导弹向下发射
      this.vx = Math.sin(angle)
      this.vy = Math.cos(angle)
    }
  }

  /**
   * 初始化导弹（用于对象池）
   */
  init(
    x: number,
    y: number,
    damage: number,
    speed: number,
    explosionRadius: number,
    owner: 'player' | 'enemy',
    angle: number = 0
  ): void {
    this.id = `missile-${owner}-${Math.random().toString(36).substr(2, 9)}`
    this.x = x
    this.y = y
    this.damage = damage
    this.speed = speed
    this.explosionRadius = explosionRadius
    this.owner = owner
    this.isActive = true
    this.hasExploded = false
    this.explosionProgress = 0
    this.lastMoveTime = Date.now()

    // 根据角度计算速度分量（方向，不是实际速度）
    if (owner === 'player') {
      // 玩家导弹向上发射
      this.vx = Math.sin(angle)
      this.vy = -Math.cos(angle)
    } else {
      // 敌人导弹向下发射
      this.vx = Math.sin(angle)
      this.vy = Math.cos(angle)
    }
  }
  
  /**
   * 设置音频系统
   */
  setAudioSystem(audioSystem: AudioSystem): void {
    this.audioSystem = audioSystem
  }

  /**
   * 更新
   * V2: 需求 10.2 - 每 150ms 移动 1 像素块
   */
  update(deltaTime: number): void {
    if (this.hasExploded) {
      // 更新爆炸动画
      this.explosionProgress += deltaTime
      if (this.explosionProgress >= this.explosionDuration) {
        this.destroy()
      }
      return
    }

    const now = Date.now()
    
    // 检查是否到了移动时间
    if (now - this.lastMoveTime >= this.moveInterval) {
      // 移动导弹（每次移动 speed 个像素块）
      // speed 通常是 12，表示每次移动 12 像素
      // 但在 V2 中，我们使用方向向量 * speed 来移动
      this.x += this.vx * this.speed
      this.y += this.vy * this.speed
      
      this.lastMoveTime = now
    }

    // 超出屏幕则销毁（使用缩放后的尺寸）
    if (
      this.y < -this.height ||
      this.y > Missile.canvasHeight + this.height ||
      this.x < -this.width ||
      this.x > Missile.canvasWidth + this.width
    ) {
      this.destroy()
    }
  }

  /**
   * 渲染
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (this.hasExploded) {
      this.renderExplosion(ctx)
      return
    }

    ctx.save()

    // 根据所有者选择颜色
    if (this.owner === 'player') {
      ctx.fillStyle = PIXEL_STYLE.colors.playerMissile
    } else {
      ctx.fillStyle = PIXEL_STYLE.colors.enemyRed
    }

    // 绘制导弹（带尾焰的矩形）
    // const centerX = this.x + this.width / 2 // 暂未使用
    // const centerY = this.y + this.height / 2 // 暂未使用

    // 导弹主体
    ctx.fillRect(this.x, this.y, this.width, this.height)

    // 边框
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 1
    ctx.strokeRect(this.x, this.y, this.width, this.height)

    // 尾焰效果
    ctx.fillStyle = PIXEL_STYLE.colors.explosion
    ctx.globalAlpha = 0.6
    if (this.owner === 'player') {
      // 向下的尾焰
      ctx.fillRect(this.x + 1, this.y + this.height, this.width - 2, 6)
    } else {
      // 向上的尾焰
      ctx.fillRect(this.x + 1, this.y - 6, this.width - 2, 6)
    }

    ctx.restore()
  }

  /**
   * 渲染爆炸效果
   */
  private renderExplosion(ctx: CanvasRenderingContext2D): void {
    const progress = this.explosionProgress / this.explosionDuration
    const centerX = this.x + this.width / 2
    const centerY = this.y + this.height / 2
    const maxRadius = this.explosionRadius * 10 // 像素半径

    ctx.save()

    // 外圈（橙色）
    const outerRadius = maxRadius * progress
    ctx.fillStyle = PIXEL_STYLE.colors.explosion
    ctx.globalAlpha = 1 - progress
    ctx.beginPath()
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2)
    ctx.fill()

    // 内圈（黄色）
    const innerRadius = maxRadius * progress * 0.6
    ctx.fillStyle = PIXEL_STYLE.colors.nuke
    ctx.globalAlpha = (1 - progress) * 0.8
    ctx.beginPath()
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  /**
   * 爆炸
   */
  explode(entities: Entity[]): void {
    if (this.hasExploded) return

    console.log(`[导弹] ${this.id} 爆炸，范围: ${this.explosionRadius}, 伤害: ${this.damage}`)
    this.hasExploded = true
    this.explosionProgress = 0
    
    // 需求 17.6: 导弹击中时播放爆炸音效（仅玩家导弹）
    if (this.owner === 'player' && this.audioSystem) {
      this.audioSystem.playSoundEffect(SoundEffect.MISSILE_EXPLODE)
    }

    // 获取爆炸范围内的所有实体
    const centerX = this.x + this.width / 2
    const centerY = this.y + this.height / 2
    const pixelRadius = this.explosionRadius * 10 // 转换为像素

    console.log(`[导弹] 爆炸中心: (${centerX}, ${centerY}), 像素半径: ${pixelRadius}`)

    const entitiesInRange = CollisionDetector.getEntitiesInRadius(
      { x: centerX, y: centerY },
      pixelRadius,
      entities
    )

    console.log(`[导弹] 范围内实体数量: ${entitiesInRange.length}`)

    // 对范围内的实体造成伤害
    entitiesInRange.forEach((entity) => {
      // 玩家导弹伤害敌人，敌人导弹伤害玩家
      if (
        (this.owner === 'player' && entity.id.startsWith('enemy')) ||
        (this.owner === 'enemy' && entity.id === 'player')
      ) {
        console.log(`[导弹] 对 ${entity.id} 造成 ${this.damage} 点伤害`)
        // 调用实体的受伤方法（如果有）
        if ('takeDamage' in entity && typeof entity.takeDamage === 'function') {
          ;(entity as any).takeDamage(this.damage)
        }
      }
    })
  }

  /**
   * 碰撞处理
   */
  onCollision(other: Entity): void {
    // 导弹击中目标后爆炸
    if (
      (this.owner === 'player' && other.id.startsWith('enemy')) ||
      (this.owner === 'enemy' && other.id === 'player')
    ) {
      console.log(`[导弹] ${this.id} 击中 ${other.id}，准备爆炸`)
      // 爆炸逻辑需要访问所有实体，将在游戏引擎中处理
    }
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.isActive = false
  }

  /**
   * 获取中心点坐标
   */
  getCenterX(): number {
    return this.x + this.width / 2
  }

  getCenterY(): number {
    return this.y + this.height / 2
  }
}
