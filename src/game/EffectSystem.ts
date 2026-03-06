/**
 * 效果系统
 * 管理爆炸效果和屏幕震动
 */

import { EFFECT_CONFIG, PIXEL_BLOCK_CONFIG } from './constants'

// 爆炸尺寸枚举
export enum ExplosionSize {
  SMALL = 'small',    // 普通敌人
  MEDIUM = 'medium',  // 精英怪
  LARGE = 'large',    // 关底 BOSS
  HUGE = 'huge'       // 最终 BOSS / 玩家
}

// 爆炸效果接口
export interface Explosion {
  x: number
  y: number
  size: ExplosionSize
  frame: number
  maxFrames: number
  startTime: number
  radius: number
}

// 屏幕震动状态
interface ScreenShake {
  isActive: boolean
  startTime: number
  duration: number
  intensity: number
  offsetX: number
  offsetY: number
}

export class EffectSystem {
  private explosions: Explosion[] = []
  private screenShake: ScreenShake = {
    isActive: false,
    startTime: 0,
    duration: 0,
    intensity: 0,
    offsetX: 0,
    offsetY: 0
  }
  private reducedMotion: boolean = false

  /**
   * 设置减少动画模式
   * 当启用时，禁用屏幕震动效果
   */
  setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled
    // 如果启用减少动画模式，立即停止当前的屏幕震动
    if (enabled && this.screenShake.isActive) {
      this.screenShake.isActive = false
      this.screenShake.offsetX = 0
      this.screenShake.offsetY = 0
    }
  }

  /**
   * 创建爆炸效果
   */
  createExplosion(x: number, y: number, size: ExplosionSize): void {
    const radius = this.getExplosionRadius(size)
    
    const explosion: Explosion = {
      x,
      y,
      size,
      frame: 0,
      maxFrames: EFFECT_CONFIG.EXPLOSION_FRAMES,
      startTime: performance.now(),
      radius
    }

    this.explosions.push(explosion)
  }

  /**
   * 获取爆炸半径
   */
  private getExplosionRadius(size: ExplosionSize): number {
    switch (size) {
      case ExplosionSize.SMALL:
        return PIXEL_BLOCK_CONFIG.SIZE * 2 // 2 像素块
      case ExplosionSize.MEDIUM:
        return PIXEL_BLOCK_CONFIG.SIZE * 3 // 3 像素块
      case ExplosionSize.LARGE:
        return PIXEL_BLOCK_CONFIG.SIZE * 4 // 4 像素块
      case ExplosionSize.HUGE:
        return PIXEL_BLOCK_CONFIG.SIZE * 6 // 6 像素块
      default:
        return PIXEL_BLOCK_CONFIG.SIZE * 2
    }
  }

  /**
   * 触发屏幕震动
   * 如果启用了减少动画模式，则直接返回不执行震动
   */
  triggerScreenShake(intensity?: number): void {
    // 减少动画模式下，跳过屏幕震动
    if (this.reducedMotion) {
      return
    }

    const shakeIntensity = intensity ?? 
      (EFFECT_CONFIG.SCREEN_SHAKE_INTENSITY_MIN + EFFECT_CONFIG.SCREEN_SHAKE_INTENSITY_MAX) / 2

    this.screenShake = {
      isActive: true,
      startTime: performance.now(),
      duration: EFFECT_CONFIG.SCREEN_SHAKE_DURATION,
      intensity: shakeIntensity,
      offsetX: 0,
      offsetY: 0
    }
  }

  /**
   * 更新效果
   */
  update(_deltaTime: number): void {
    const currentTime = performance.now()

    // 更新爆炸效果
    this.updateExplosions(currentTime)

    // 更新屏幕震动
    this.updateScreenShake(currentTime)
  }

  /**
   * 更新爆炸效果
   * 优化：使用反向循环，在迭代中直接删除过期元素
   */
  private updateExplosions(currentTime: number): void {
    // 使用反向循环，便于在循环中删除元素
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const explosion = this.explosions[i]
      const elapsed = currentTime - explosion.startTime
      
      // 检查是否超过持续时间
      if (elapsed >= EFFECT_CONFIG.EXPLOSION_DURATION) {
        this.explosions.splice(i, 1)
        continue
      }

      // 更新帧数
      const progress = elapsed / EFFECT_CONFIG.EXPLOSION_DURATION
      explosion.frame = Math.floor(progress * explosion.maxFrames)
    }
  }

  /**
   * 更新屏幕震动
   * 优化：提前退出减少不必要的计算
   */
  private updateScreenShake(currentTime: number): void {
    // 提前退出：如果震动未激活，直接返回
    if (!this.screenShake.isActive) {
      return
    }

    const elapsed = currentTime - this.screenShake.startTime

    // 检查是否结束
    if (elapsed >= this.screenShake.duration) {
      this.screenShake.isActive = false
      this.screenShake.offsetX = 0
      this.screenShake.offsetY = 0
      return
    }

    // 计算衰减（线性衰减）
    const progress = elapsed / this.screenShake.duration
    const decay = 1 - progress

    // 随机偏移（带衰减）
    const maxOffset = this.screenShake.intensity * decay
    this.screenShake.offsetX = (Math.random() - 0.5) * 2 * maxOffset
    this.screenShake.offsetY = (Math.random() - 0.5) * 2 * maxOffset
  }

  /**
   * 渲染效果
   */
  render(ctx: CanvasRenderingContext2D): void {
    // 渲染所有爆炸效果
    for (const explosion of this.explosions) {
      this.renderExplosion(ctx, explosion)
    }
  }

  /**
   * 渲染单个爆炸效果
   */
  private renderExplosion(ctx: CanvasRenderingContext2D, explosion: Explosion): void {
    const progress = explosion.frame / explosion.maxFrames
    
    // 爆炸扩散效果
    const currentRadius = explosion.radius * (0.5 + progress * 0.5)
    
    // 透明度衰减
    const alpha = 1 - progress

    // 绘制爆炸圆形
    ctx.save()
    ctx.globalAlpha = alpha

    // 外圈（橙色）
    const gradient = ctx.createRadialGradient(
      explosion.x, explosion.y, 0,
      explosion.x, explosion.y, currentRadius
    )
    gradient.addColorStop(0, '#FFFF00') // 黄色中心
    gradient.addColorStop(0.5, '#FF6600') // 橙色
    gradient.addColorStop(1, '#FF0000') // 红色边缘

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(explosion.x, explosion.y, currentRadius, 0, Math.PI * 2)
    ctx.fill()

    // 绘制像素风格的爆炸碎片
    if (progress < 0.7) {
      this.renderExplosionParticles(ctx, explosion, progress)
    }

    ctx.restore()
  }

  /**
   * 渲染爆炸碎片（像素风格）
   */
  private renderExplosionParticles(
    ctx: CanvasRenderingContext2D,
    explosion: Explosion,
    progress: number
  ): void {
    const particleCount = 8
    const particleSize = PIXEL_BLOCK_CONFIG.SIZE / 2

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount
      const distance = explosion.radius * progress * 1.5
      
      const px = explosion.x + Math.cos(angle) * distance
      const py = explosion.y + Math.sin(angle) * distance

      ctx.fillStyle = i % 2 === 0 ? '#FFFF00' : '#FF6600'
      ctx.fillRect(
        px - particleSize / 2,
        py - particleSize / 2,
        particleSize,
        particleSize
      )
    }
  }

  /**
   * 获取屏幕偏移（用于震动）
   */
  getScreenOffset(): { x: number; y: number } {
    if (!this.screenShake.isActive) {
      return { x: 0, y: 0 }
    }

    return {
      x: this.screenShake.offsetX,
      y: this.screenShake.offsetY
    }
  }

  /**
   * 检查是否正在震动
   */
  isShaking(): boolean {
    return this.screenShake.isActive
  }

  /**
   * 获取所有爆炸效果（用于测试）
   */
  getExplosions(): Explosion[] {
    return this.explosions
  }

  /**
   * 清空所有效果
   */
  clear(): void {
    this.explosions = []
    this.screenShake.isActive = false
    this.screenShake.offsetX = 0
    this.screenShake.offsetY = 0
  }
}
