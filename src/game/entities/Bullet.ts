/**
 * 子弹实体
 */

import type { Entity } from '../types'
import { SCENE_CONFIG, PIXEL_STYLE } from '../constants'
import { AudioSystem, SoundEffect } from '../AudioSystem'

export class Bullet implements Entity {
  id: string
  x: number
  y: number
  width: number = 4
  height: number = 12
  isActive: boolean = true

  damage: number
  speed: number
  owner: 'player' | 'enemy'
  vx: number = 0
  vy: number = 0
  private hasHit: boolean = false // 防止重复伤害
  private audioSystem: AudioSystem | null = null
  
  // V2: 子弹移动控制
  // 需求 10.1: 每 100ms 移动 1 像素块
  private lastMoveTime: number = 0
  private moveInterval: number = 100 // ms

  // 缓存缩放后的 Canvas 尺寸
  private static canvasWidth: number = SCENE_CONFIG.CANVAS_WIDTH_V2
  private static canvasHeight: number = SCENE_CONFIG.CANVAS_HEIGHT_V2

  constructor(
    x: number = 0,
    y: number = 0,
    damage: number = 0,
    speed: number = 0,
    owner: 'player' | 'enemy' = 'player',
    angle: number = 0
  ) {
    this.id = `bullet-${Math.random().toString(36).substr(2, 9)}`
    this.x = x
    this.y = y
    this.damage = damage
    this.speed = speed
    this.owner = owner
    this.lastMoveTime = Date.now()

    // 根据角度计算速度分量（方向，不是实际速度）
    if (owner === 'player') {
      // 玩家子弹向上发射
      this.vx = Math.sin(angle)
      this.vy = -Math.cos(angle)
    } else {
      // 敌人子弹向下发射
      this.vx = Math.sin(angle)
      this.vy = Math.cos(angle)
    }
  }

  /**
   * 初始化子弹（用于对象池）
   */
  init(
    x: number,
    y: number,
    damage: number,
    speed: number,
    owner: 'player' | 'enemy',
    angle: number = 0
  ): void {
    this.id = `bullet-${owner}-${Math.random().toString(36).substr(2, 9)}`
    this.x = x
    this.y = y
    this.damage = damage
    this.speed = speed
    this.owner = owner
    this.isActive = true
    this.hasHit = false // 重置击中标志
    this.lastMoveTime = Date.now()

    // 根据角度计算速度分量（方向，不是实际速度）
    if (owner === 'player') {
      // 玩家子弹向上发射
      this.vx = Math.sin(angle)
      this.vy = -Math.cos(angle)
    } else {
      // 敌人子弹向下发射
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
   * V2: 需求 10.1 - 每 100ms 移动 1 像素块
   */
  update(_deltaTime: number): void {
    const now = Date.now()
    
    // 检查是否到了移动时间
    if (now - this.lastMoveTime >= this.moveInterval) {
      // 移动子弹（每次移动 speed 个像素块）
      // speed 通常是 20，表示每次移动 20 像素
      // 但在 V2 中，我们使用方向向量 * speed 来移动
      this.x += this.vx * this.speed
      this.y += this.vy * this.speed
      
      this.lastMoveTime = now
    }

    // 超出屏幕则销毁（使用缩放后的尺寸）
    if (
      this.y < -this.height ||
      this.y > Bullet.canvasHeight + this.height ||
      this.x < -this.width ||
      this.x > Bullet.canvasWidth + this.width
    ) {
      this.destroy()
    }
  }

  /**
   * 渲染
   */
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save()

    // 根据所有者选择颜色
    if (this.owner === 'player') {
      ctx.fillStyle = PIXEL_STYLE.colors.playerBullet
    } else {
      ctx.fillStyle = PIXEL_STYLE.colors.enemyWhite
    }

    // 绘制子弹（矩形）
    ctx.fillRect(this.x, this.y, this.width, this.height)

    // 边框
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 1
    ctx.strokeRect(this.x, this.y, this.width, this.height)

    ctx.restore()
  }

  /**
   * 碰撞处理
   */
  onCollision(other: Entity): void {
    // 防止重复伤害
    if (this.hasHit) {
      return
    }

    // 子弹击中目标后销毁
    if (
      (this.owner === 'player' && other.id.startsWith('enemy')) ||
      (this.owner === 'enemy' && other.id === 'player')
    ) {
      console.log(`[子弹] ${this.id} 击中 ${other.id}，造成 ${this.damage} 点伤害`)
      
      // 标记已击中，防止重复伤害
      this.hasHit = true
      
      // 需求 17.5: 机炮击中时播放音效（仅玩家子弹）
      if (this.owner === 'player' && this.audioSystem) {
        this.audioSystem.playSoundEffect(SoundEffect.BULLET_HIT)
      }
      
      // 对目标造成伤害
      if ('takeDamage' in other && typeof other.takeDamage === 'function') {
        ;(other as any).takeDamage(this.damage)
      }
      
      this.destroy()
    }
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.isActive = false
  }
}
