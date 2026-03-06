/**
 * 核弹系统
 * 
 * 功能：
 * - 进度条管理（0-100）
 * - 击杀敌人增加进度
 * - 满进度后可发射
 * - 发射时清除所有敌人和敌方子弹
 * - 蘑菇云动画效果
 * - 发射后重置进度
 */

import { GAME_CONFIG, PIXEL_STYLE } from '../constants'

export class NuclearBomb {
  private progress: number = 0
  private maxProgress: number = GAME_CONFIG.NUKE_MAX_PROGRESS
  private isLaunching: boolean = false
  private launchAnimationProgress: number = 0
  private readonly LAUNCH_ANIMATION_DURATION = 2000 // 2秒动画

  /**
   * 获取当前进度
   */
  getProgress(): number {
    return this.progress
  }

  /**
   * 获取最大进度
   */
  getMaxProgress(): number {
    return this.maxProgress
  }

  /**
   * 获取进度百分比
   */
  getProgressPercentage(): number {
    return (this.progress / this.maxProgress) * 100
  }

  /**
   * 是否可以发射
   */
  canLaunch(): boolean {
    return this.progress >= this.maxProgress && !this.isLaunching
  }

  /**
   * 是否正在发射动画中
   */
  isLaunchingAnimation(): boolean {
    return this.isLaunching
  }

  /**
   * 增加进度（击杀敌人时调用）
   * @param amount 增加的进度值
   */
  addProgress(amount: number): void {
    if (this.progress >= this.maxProgress) {
      // 满进度后不再增加
      return
    }

    this.progress = Math.min(this.progress + amount, this.maxProgress)
    console.log(`[核弹] 进度增加: +${amount}, 当前: ${this.progress}/${this.maxProgress}`)
  }

  /**
   * 发射核弹
   * @returns 是否成功发射
   */
  launch(): boolean {
    if (!this.canLaunch()) {
      console.warn('[核弹] 无法发射：进度不足或正在发射中')
      return false
    }

    console.log('[核弹] 发射核弹！')
    this.isLaunching = true
    this.launchAnimationProgress = 0
    return true
  }

  /**
   * 更新核弹状态（每帧调用）
   * @param deltaTime 时间增量（毫秒）
   */
  update(deltaTime: number): void {
    if (!this.isLaunching) return

    this.launchAnimationProgress += deltaTime

    // 动画结束
    if (this.launchAnimationProgress >= this.LAUNCH_ANIMATION_DURATION) {
      this.isLaunching = false
      this.launchAnimationProgress = 0
      this.progress = 0 // 重置进度
      console.log('[核弹] 发射完成，进度已重置')
    }
  }

  /**
   * 渲染蘑菇云动画
   * @param ctx Canvas 渲染上下文
   */
  renderLaunchAnimation(ctx: CanvasRenderingContext2D): void {
    if (!this.isLaunching) return

    const progress = this.launchAnimationProgress / this.LAUNCH_ANIMATION_DURATION
    const centerX = GAME_CONFIG.CANVAS_WIDTH / 2
    const centerY = GAME_CONFIG.CANVAS_HEIGHT / 2

    // 保存上下文状态
    ctx.save()

    // 1. 闪光效果（前0.2秒）
    if (progress < 0.2) {
      const flashAlpha = 1 - progress / 0.2
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`
      ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT)
    }

    // 2. 爆炸冲击波（0.2-0.6秒）
    if (progress >= 0.2 && progress < 0.6) {
      const waveProgress = (progress - 0.2) / 0.4
      const radius = waveProgress * Math.max(GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT)
      const alpha = 1 - waveProgress

      ctx.strokeStyle = `rgba(255, 255, 0, ${alpha})`
      ctx.lineWidth = 10
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.stroke()

      ctx.strokeStyle = `rgba(255, 100, 0, ${alpha * 0.7})`
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius * 0.8, 0, Math.PI * 2)
      ctx.stroke()
    }

    // 3. 蘑菇云效果（0.4-2.0秒）
    if (progress >= 0.4) {
      const cloudProgress = (progress - 0.4) / 0.6
      const cloudAlpha = Math.min(1, cloudProgress * 2) * (1 - Math.max(0, (progress - 1.5) / 0.5))

      // 蘑菇云柱
      const stemHeight = cloudProgress * 200
      const stemWidth = 40
      ctx.fillStyle = `rgba(255, 100, 0, ${cloudAlpha * 0.8})`
      ctx.fillRect(
        centerX - stemWidth / 2,
        centerY,
        stemWidth,
        stemHeight
      )

      // 蘑菇云顶部
      const capRadius = cloudProgress * 100
      const capY = centerY - stemHeight

      // 外层云
      ctx.fillStyle = `rgba(255, 150, 0, ${cloudAlpha * 0.6})`
      ctx.beginPath()
      ctx.arc(capY, capY, capRadius * 1.2, 0, Math.PI * 2)
      ctx.fill()

      // 中层云
      ctx.fillStyle = `rgba(255, 200, 0, ${cloudAlpha * 0.8})`
      ctx.beginPath()
      ctx.arc(centerX, capY, capRadius, 0, Math.PI * 2)
      ctx.fill()

      // 内层云
      ctx.fillStyle = `rgba(255, 255, 0, ${cloudAlpha})`
      ctx.beginPath()
      ctx.arc(centerX, capY, capRadius * 0.6, 0, Math.PI * 2)
      ctx.fill()

      // 像素化效果：添加方块
      const blockSize = 8
      const blockCount = Math.floor(capRadius / blockSize)
      ctx.fillStyle = PIXEL_STYLE.colors.nuke
      for (let i = 0; i < blockCount; i++) {
        const angle = (i / blockCount) * Math.PI * 2
        const distance = capRadius + Math.random() * 20
        const x = centerX + Math.cos(angle) * distance
        const y = capY + Math.sin(angle) * distance
        ctx.fillRect(
          Math.floor(x / blockSize) * blockSize,
          Math.floor(y / blockSize) * blockSize,
          blockSize,
          blockSize
        )
      }
    }

    // 恢复上下文状态
    ctx.restore()
  }

  /**
   * 重置核弹系统
   */
  reset(): void {
    this.progress = 0
    this.isLaunching = false
    this.launchAnimationProgress = 0
    console.log('[核弹] 系统已重置')
  }
}
