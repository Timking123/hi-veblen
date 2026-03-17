/**
 * 掉落物实体
 * 
 * 功能：
 * - 多种掉落物类型（机炮升级、导弹升级、维修、引擎）
 * - 向下飘落动画
 * - 超出屏幕自动销毁
 * - 玩家拾取后应用效果
 */

import type { Entity } from '../types'
import { PickupType } from '../types'
import { SCENE_CONFIG, PIXEL_BLOCK_CONFIG } from '../constants'

export class Pickup implements Entity {
  id: string
  x: number
  y: number
  width: number
  height: number
  isActive: boolean = true

  type: PickupType
  fallSpeed: number = 2
  
  // 拾取回调函数
  private onPickupCallback: ((type: PickupType) => void) | null = null

  private static idCounter = 0
  private static canvasHeight: number = SCENE_CONFIG.CANVAS_HEIGHT_V2
  private static pixelBlockSize: number = PIXEL_BLOCK_CONFIG.SIZE
  private static pickupSize: number = PIXEL_BLOCK_CONFIG.PICKUP * PIXEL_BLOCK_CONFIG.SIZE

  constructor(type: PickupType, x: number, y: number) {
    this.id = `pickup-${Pickup.idCounter++}`
    this.type = type
    this.x = x
    this.y = y
    // 设置为 4x4 像素块的尺寸
    this.width = Pickup.pickupSize
    this.height = Pickup.pickupSize
  }
  
  /**
   * 设置拾取回调函数
   */
  setOnPickup(callback: (type: PickupType) => void): void {
    this.onPickupCallback = callback
  }

  /**
   * 更新掉落物状态
   */
  update(_deltaTime: number): void {
    // 向下飘落
    this.y += this.fallSpeed

    // 超出屏幕底部则销毁（使用缩放后的尺寸）
    if (this.y > Pickup.canvasHeight) {
      this.destroy()
    }
  }

  /**
   * 渲染掉落物（使用像素艺术）
   */
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save()

    const blockSize = Pickup.pixelBlockSize
    const { mainColor, accentColor, iconType } = this.getPixelArtStyle()

    // 绘制 4x4 像素块的掉落物图标
    this.renderPixelArtIcon(ctx, this.x, this.y, blockSize, mainColor, accentColor, iconType)

    ctx.restore()
  }

  /**
   * 获取像素艺术样式
   */
  private getPixelArtStyle(): {
    mainColor: string
    accentColor: string
    iconType: 'bullet' | 'missile' | 'heart' | 'gear'
  } {
    switch (this.type) {
      case PickupType.MACHINEGUN_BULLETS:
      case PickupType.MACHINEGUN_TRAJECTORY:
      case PickupType.MACHINEGUN_FIRERATE:
      case PickupType.MACHINEGUN_DAMAGE:
      case PickupType.MACHINEGUN_SPEED:
        return {
          mainColor: '#FFFF00', // 黄色（机炮）
          accentColor: '#FFAA00', // 橙黄色
          iconType: 'bullet'
        }
      case PickupType.MISSILE_COUNT:
      case PickupType.MISSILE_DAMAGE:
      case PickupType.MISSILE_SPEED:
        return {
          mainColor: '#FF6600', // 橙色（导弹）
          accentColor: '#FF3300', // 红橙色
          iconType: 'missile'
        }
      case PickupType.REPAIR:
        return {
          mainColor: '#FF0000', // 红色（生命）
          accentColor: '#FF6666', // 浅红色
          iconType: 'heart'
        }
      case PickupType.ENGINE:
        return {
          mainColor: '#00AAFF', // 蓝色（引擎）
          accentColor: '#0066CC', // 深蓝色
          iconType: 'gear'
        }
      default:
        return {
          mainColor: '#FFFFFF',
          accentColor: '#CCCCCC',
          iconType: 'bullet'
        }
    }
  }

  /**
   * 渲染像素艺术图标
   */
  private renderPixelArtIcon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    blockSize: number,
    mainColor: string,
    accentColor: string,
    iconType: 'bullet' | 'missile' | 'heart' | 'gear'
  ): void {
    switch (iconType) {
      case 'bullet':
        this.renderBulletIcon(ctx, x, y, blockSize, mainColor, accentColor)
        break
      case 'missile':
        this.renderMissileIcon(ctx, x, y, blockSize, mainColor, accentColor)
        break
      case 'heart':
        this.renderHeartIcon(ctx, x, y, blockSize, mainColor, accentColor)
        break
      case 'gear':
        this.renderGearIcon(ctx, x, y, blockSize, mainColor, accentColor)
        break
    }
  }

  /**
   * 渲染子弹图标（4x4 像素块）
   * 增强版：添加更多细节和质感
   */
  private renderBulletIcon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    blockSize: number,
    mainColor: string,
    accentColor: string
  ): void {
    // 绘制垂直子弹形状，带高光和阴影
    // 行 1: 尖端（高光）
    this.drawPixelBlock(ctx, x + blockSize * 1.5, y, this.lightenColor(accentColor), blockSize)

    // 行 2: 主体上部（带高光）
    this.drawPixelBlock(ctx, x + blockSize, y + blockSize, this.lightenColor(mainColor), blockSize)
    this.drawPixelBlock(ctx, x + blockSize * 2, y + blockSize, mainColor, blockSize)

    // 行 3: 主体中部（带阴影）
    this.drawPixelBlock(ctx, x + blockSize, y + blockSize * 2, mainColor, blockSize)
    this.drawPixelBlock(ctx, x + blockSize * 2, y + blockSize * 2, this.darkenColor(mainColor), blockSize)

    // 行 4: 底部（阴影）
    this.drawPixelBlock(ctx, x + blockSize * 1.5, y + blockSize * 3, this.darkenColor(accentColor), blockSize)
  }

  /**
   * 渲染导弹图标（4x4 像素块）
   * 增强版：添加更多细节和质感
   */
  private renderMissileIcon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    blockSize: number,
    mainColor: string,
    accentColor: string
  ): void {
    // 绘制导弹形状，带高光和火焰效果
    // 行 1: 尖端（高光）
    this.drawPixelBlock(ctx, x + blockSize * 1.5, y, this.lightenColor(accentColor), blockSize)

    // 行 2: 主体上部（带高光）
    this.drawPixelBlock(ctx, x + blockSize, y + blockSize, this.lightenColor(mainColor), blockSize)
    this.drawPixelBlock(ctx, x + blockSize * 2, y + blockSize, mainColor, blockSize)

    // 行 3: 主体中部（带翼和阴影）
    this.drawPixelBlock(ctx, x, y + blockSize * 2, this.darkenColor(accentColor), blockSize)
    this.drawPixelBlock(ctx, x + blockSize, y + blockSize * 2, mainColor, blockSize)
    this.drawPixelBlock(ctx, x + blockSize * 2, y + blockSize * 2, this.darkenColor(mainColor), blockSize)
    this.drawPixelBlock(ctx, x + blockSize * 3, y + blockSize * 2, this.darkenColor(accentColor), blockSize)

    // 行 4: 尾部（火焰效果 - 黄色和橙色）
    this.drawPixelBlock(ctx, x + blockSize, y + blockSize * 3, '#FFFF00', blockSize)
    this.drawPixelBlock(ctx, x + blockSize * 2, y + blockSize * 3, '#FF8800', blockSize)
  }

  /**
   * 渲染心形图标（4x4 像素块）
   * 增强版：添加更多细节和质感
   */
  private renderHeartIcon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    blockSize: number,
    mainColor: string,
    accentColor: string
  ): void {
    // 绘制心形，带高光效果
    // 行 1: 顶部两个圆（高光）
    this.drawPixelBlock(ctx, x + blockSize, y, this.lightenColor(mainColor), blockSize)
    this.drawPixelBlock(ctx, x + blockSize * 2, y, this.lightenColor(mainColor), blockSize)

    // 行 2: 中上部（带高光和主色）
    this.drawPixelBlock(ctx, x, y + blockSize, mainColor, blockSize)
    this.drawPixelBlock(ctx, x + blockSize, y + blockSize, this.lightenColor(accentColor), blockSize)
    this.drawPixelBlock(ctx, x + blockSize * 2, y + blockSize, this.lightenColor(accentColor), blockSize)
    this.drawPixelBlock(ctx, x + blockSize * 3, y + blockSize, mainColor, blockSize)

    // 行 3: 中下部（带阴影）
    this.drawPixelBlock(ctx, x + blockSize, y + blockSize * 2, mainColor, blockSize)
    this.drawPixelBlock(ctx, x + blockSize * 2, y + blockSize * 2, this.darkenColor(mainColor), blockSize)

    // 行 4: 底部尖端（阴影）
    this.drawPixelBlock(ctx, x + blockSize * 1.5, y + blockSize * 3, this.darkenColor(mainColor), blockSize)
  }

  /**
   * 渲染齿轮图标（4x4 像素块）
   * 增强版：添加更多细节和质感
   */
  private renderGearIcon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    blockSize: number,
    mainColor: string,
    accentColor: string
  ): void {
    // 绘制齿轮，带金属质感
    // 行 1: 顶部齿（高光）
    this.drawPixelBlock(ctx, x + blockSize * 1.5, y, this.lightenColor(mainColor), blockSize)

    // 行 2: 上部（带高光和主色）
    this.drawPixelBlock(ctx, x + blockSize, y + blockSize, mainColor, blockSize)
    this.drawPixelBlock(ctx, x + blockSize * 1.5, y + blockSize, this.lightenColor(accentColor), blockSize)
    this.drawPixelBlock(ctx, x + blockSize * 2, y + blockSize, mainColor, blockSize)

    // 行 3: 中部（带左右齿和阴影）
    this.drawPixelBlock(ctx, x, y + blockSize * 2, this.lightenColor(mainColor), blockSize)
    this.drawPixelBlock(ctx, x + blockSize, y + blockSize * 2, accentColor, blockSize)
    this.drawPixelBlock(ctx, x + blockSize * 2, y + blockSize * 2, this.darkenColor(accentColor), blockSize)
    this.drawPixelBlock(ctx, x + blockSize * 3, y + blockSize * 2, this.darkenColor(mainColor), blockSize)

    // 行 4: 底部齿（阴影）
    this.drawPixelBlock(ctx, x + blockSize * 1.5, y + blockSize * 3, this.darkenColor(mainColor), blockSize)
  }

  /**
   * 绘制单个像素块
   */
  private drawPixelBlock(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    size: number
  ): void {
    ctx.fillStyle = color
    ctx.fillRect(x, y, size, size)
  }

  /**
   * 使颜色变亮（用于高光效果）
   */
  private lightenColor(color: string): string {
    // 简单的颜色变亮算法
    const hex = color.replace('#', '')
    const r = Math.min(255, parseInt(hex.substring(0, 2), 16) + 60)
    const g = Math.min(255, parseInt(hex.substring(2, 4), 16) + 60)
    const b = Math.min(255, parseInt(hex.substring(4, 6), 16) + 60)
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  /**
   * 使颜色变暗（用于阴影效果）
   */
  private darkenColor(color: string): string {
    // 简单的颜色变暗算法
    const hex = color.replace('#', '')
    const r = Math.max(0, parseInt(hex.substring(0, 2), 16) - 60)
    const g = Math.max(0, parseInt(hex.substring(2, 4), 16) - 60)
    const b = Math.max(0, parseInt(hex.substring(4, 6), 16) - 60)
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  /**
   * 碰撞处理
   */
  onCollision(other: Entity): void {
    // 已销毁则忽略碰撞
    if (!this.isActive) return
    
    // 只与玩家碰撞
    if (other.id === 'player') {
      console.log(`[掉落物] 玩家拾取: ${this.type}`)
      
      // 触发拾取回调
      if (this.onPickupCallback) {
        this.onPickupCallback(this.type)
      }
      
      this.destroy()
    }
  }

  /**
   * 销毁掉落物
   */
  destroy(): void {
    this.isActive = false
  }

  /**
   * 获取掉落物类型
   */
  getType(): PickupType {
    return this.type
  }
}
