/**
 * 敌人文字渲染器
 * 负责渲染不同尺寸的敌人文字，使用老式电脑字体
 */

import { PIXEL_BLOCK_CONFIG } from './constants'

export enum EnemyTextSize {
  NORMAL = 'normal', // 2x2 像素块
  ELITE = 'elite', // 3x3 像素块
  STAGE_BOSS = 'stage_boss', // 4x4 像素块
  FINAL_BOSS = 'final_boss' // 5x5 像素块
}

export class EnemyTextRenderer {
  private fontFamily: string = 'Courier New, Consolas, monospace'
  private pixelBlockSize: number = PIXEL_BLOCK_CONFIG.SIZE

  /**
   * 设置字体
   */
  setFont(fontFamily: string): void {
    this.fontFamily = fontFamily
  }

  /**
   * 获取字体
   */
  getFont(): string {
    return this.fontFamily
  }

  /**
   * 获取敌人文字尺寸（像素块数）
   */
  getEnemyTextSize(enemyType: EnemyTextSize): { width: number; height: number } {
    switch (enemyType) {
      case EnemyTextSize.NORMAL:
        return { width: PIXEL_BLOCK_CONFIG.ENEMY_TEXT.NORMAL, height: PIXEL_BLOCK_CONFIG.ENEMY_TEXT.NORMAL }
      case EnemyTextSize.ELITE:
        return { width: PIXEL_BLOCK_CONFIG.ENEMY_TEXT.ELITE, height: PIXEL_BLOCK_CONFIG.ENEMY_TEXT.ELITE }
      case EnemyTextSize.STAGE_BOSS:
        return { width: PIXEL_BLOCK_CONFIG.ENEMY_TEXT.STAGE_BOSS, height: PIXEL_BLOCK_CONFIG.ENEMY_TEXT.STAGE_BOSS }
      case EnemyTextSize.FINAL_BOSS:
        return { width: PIXEL_BLOCK_CONFIG.ENEMY_TEXT.FINAL_BOSS, height: PIXEL_BLOCK_CONFIG.ENEMY_TEXT.FINAL_BOSS }
      default:
        return { width: PIXEL_BLOCK_CONFIG.ENEMY_TEXT.NORMAL, height: PIXEL_BLOCK_CONFIG.ENEMY_TEXT.NORMAL }
    }
  }

  /**
   * 获取字体大小（像素）
   */
  private getFontSize(enemyType: EnemyTextSize): number {
    const blockSize = this.getEnemyTextSize(enemyType)
    // 字体大小 = 像素块数 * 像素块大小
    return blockSize.width * this.pixelBlockSize
  }

  /**
   * 渲染敌人文字
   * @param ctx Canvas 渲染上下文
   * @param text 要渲染的文字
   * @param x X 坐标
   * @param y Y 坐标
   * @param enemyType 敌人类型（决定文字尺寸）
   * @param color 文字颜色（可选，默认白色）
   */
  renderEnemyText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    enemyType: EnemyTextSize,
    color: string = '#FFFFFF'
  ): void {
    ctx.save()

    // 设置字体（加粗 + 老式电脑字体）
    const fontSize = this.getFontSize(enemyType)
    ctx.font = `bold ${fontSize}px ${this.fontFamily}`
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // 渲染纯文字，不添加边框、背景或换行
    ctx.fillText(text, x, y)

    ctx.restore()
  }

  /**
   * 测量文字宽度
   * @param ctx Canvas 渲染上下文
   * @param text 要测量的文字
   * @param enemyType 敌人类型
   * @returns 文字宽度（像素）
   */
  measureTextWidth(ctx: CanvasRenderingContext2D, text: string, enemyType: EnemyTextSize): number {
    ctx.save()
    const fontSize = this.getFontSize(enemyType)
    ctx.font = `bold ${fontSize}px ${this.fontFamily}`
    const width = ctx.measureText(text).width
    ctx.restore()
    return width
  }

  /**
   * 截断文字以适应最大宽度
   * @param ctx Canvas 渲染上下文
   * @param text 原始文字
   * @param maxWidth 最大宽度（像素）
   * @param enemyType 敌人类型
   * @returns 截断后的文字
   */
  truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, enemyType: EnemyTextSize): string {
    const textWidth = this.measureTextWidth(ctx, text, enemyType)
    
    if (textWidth <= maxWidth) {
      return text
    }

    // 截断文字
    let truncated = text
    while (this.measureTextWidth(ctx, truncated + '...', enemyType) > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1)
    }
    
    return truncated + '...'
  }
}

// 创建单例
export const enemyTextRenderer = new EnemyTextRenderer()
