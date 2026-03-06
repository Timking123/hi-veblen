/**
 * 场景背景渲染器
 * 
 * 功能：
 * - 为三个关卡渲染不同的背景
 * - 家里场景：温馨家居风格
 * - 学校场景：教室或校园风格
 * - 公司场景：办公室风格
 */

import { PIXEL_STYLE } from './constants'

export class SceneRenderer {
  /**
   * 渲染场景背景
   * @param ctx Canvas 渲染上下文
   * @param sceneId 场景标识符
   */
  static renderBackground(ctx: CanvasRenderingContext2D, sceneId: string): void {
    // 使用实际 canvas 尺寸而不是固定的 GAME_CONFIG 尺寸
    const width = ctx.canvas.width
    const height = ctx.canvas.height
    
    switch (sceneId) {
      case 'home-scene':
        this.renderHomeScene(ctx, width, height)
        break
      case 'school-scene':
        this.renderSchoolScene(ctx, width, height)
        break
      case 'company-scene':
        this.renderCompanyScene(ctx, width, height)
        break
      default:
        this.renderDefaultScene(ctx, width, height)
    }
  }

  /**
   * 渲染家里场景
   */
  private static renderHomeScene(ctx: CanvasRenderingContext2D, width: number, height: number): void {

    // 背景：深蓝色（夜晚）
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, width, height)

    // 星星（像素风格）
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < 50; i++) {
      const x = (i * 137) % width
      const y = (i * 211) % height
      const size = (i % 3) + 1
      ctx.fillRect(x, y, size, size)
    }

    // 地板（底部）
    ctx.fillStyle = '#8b4513'
    ctx.fillRect(0, height - 40, width, 40)

    // 地板纹理（像素风格）
    ctx.fillStyle = '#654321'
    for (let x = 0; x < width; x += 20) {
      ctx.fillRect(x, height - 40, 18, 2)
      ctx.fillRect(x, height - 20, 18, 2)
    }

    // 墙壁装饰（左右两侧）
    ctx.fillStyle = '#4a4a4a'
    ctx.fillRect(0, 0, 20, height - 40)
    ctx.fillRect(width - 20, 0, 20, height - 40)

    // 窗户（左侧）
    ctx.fillStyle = '#87ceeb'
    ctx.fillRect(30, 100, 60, 80)
    ctx.strokeStyle = '#654321'
    ctx.lineWidth = 4
    ctx.strokeRect(30, 100, 60, 80)
    ctx.beginPath()
    ctx.moveTo(60, 100)
    ctx.lineTo(60, 180)
    ctx.moveTo(30, 140)
    ctx.lineTo(90, 140)
    ctx.stroke()

    // 家具轮廓（右侧）
    ctx.fillStyle = '#8b4513'
    ctx.fillRect(width - 100, height - 100, 60, 60)
    ctx.fillStyle = '#654321'
    ctx.fillRect(width - 95, height - 95, 50, 50)
  }

  /**
   * 渲染学校场景
   */
  private static renderSchoolScene(ctx: CanvasRenderingContext2D, width: number, height: number): void {

    // 背景：浅蓝色（白天）
    ctx.fillStyle = '#87ceeb'
    ctx.fillRect(0, 0, width, height)

    // 云朵（像素风格）
    ctx.fillStyle = '#ffffff'
    this.drawPixelCloud(ctx, 100, 50, 40)
    this.drawPixelCloud(ctx, 300, 80, 50)
    this.drawPixelCloud(ctx, 600, 60, 45)

    // 地面（底部）
    ctx.fillStyle = '#90ee90'
    ctx.fillRect(0, height - 60, width, 60)

    // 草地纹理
    ctx.fillStyle = '#7ccd7c'
    for (let x = 0; x < width; x += 10) {
      for (let y = height - 60; y < height; y += 10) {
        if ((x + y) % 20 === 0) {
          ctx.fillRect(x, y, 2, 4)
        }
      }
    }

    // 黑板（背景）
    ctx.fillStyle = '#2f4f2f'
    ctx.fillRect(width / 2 - 150, 50, 300, 150)
    ctx.strokeStyle = '#8b4513'
    ctx.lineWidth = 6
    ctx.strokeRect(width / 2 - 150, 50, 300, 150)

    // 黑板上的文字
    ctx.fillStyle = '#ffffff'
    ctx.font = '12px "Press Start 2P", monospace'
    ctx.textAlign = 'center'
    ctx.fillText('GAME START!', width / 2, 120)

    // 课桌（底部）
    ctx.fillStyle = '#8b4513'
    ctx.fillRect(50, height - 120, 80, 60)
    ctx.fillRect(width - 130, height - 120, 80, 60)
  }

  /**
   * 渲染公司场景
   */
  private static renderCompanyScene(ctx: CanvasRenderingContext2D, width: number, height: number): void {

    // 背景：深灰色（办公室）
    ctx.fillStyle = '#2c3e50'
    ctx.fillRect(0, 0, width, height)

    // 网格线（办公室地板）
    ctx.strokeStyle = '#34495e'
    ctx.lineWidth = 1
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // 窗户（右侧，城市夜景）
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(width - 150, 50, 120, 200)
    ctx.strokeStyle = '#7f8c8d'
    ctx.lineWidth = 4
    ctx.strokeRect(width - 150, 50, 120, 200)

    // 窗户分隔
    ctx.beginPath()
    ctx.moveTo(width - 90, 50)
    ctx.lineTo(width - 90, 250)
    ctx.moveTo(width - 150, 150)
    ctx.lineTo(width - 30, 150)
    ctx.stroke()

    // 城市灯光（窗外）
    ctx.fillStyle = '#ffff00'
    for (let i = 0; i < 20; i++) {
      const x = width - 140 + (i % 5) * 20
      const y = 60 + Math.floor(i / 5) * 40
      const size = 3
      ctx.fillRect(x, y, size, size)
    }

    // 办公桌（左侧）
    ctx.fillStyle = '#7f8c8d'
    ctx.fillRect(30, height - 100, 120, 80)
    ctx.fillStyle = '#95a5a6'
    ctx.fillRect(35, height - 95, 110, 70)

    // 电脑显示器
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(50, height - 140, 80, 60)
    ctx.strokeStyle = '#7f8c8d'
    ctx.lineWidth = 3
    ctx.strokeRect(50, height - 140, 80, 60)

    // 显示器屏幕内容
    ctx.fillStyle = '#00ff00'
    ctx.font = '8px "Press Start 2P", monospace'
    ctx.textAlign = 'left'
    ctx.fillText('CODE', 55, height - 120)
    ctx.fillText('GAME', 55, height - 105)

    // 办公椅
    ctx.fillStyle = '#34495e'
    ctx.fillRect(70, height - 80, 40, 60)
  }

  /**
   * 渲染默认场景（纯黑色）
   */
  private static renderDefaultScene(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = PIXEL_STYLE.colors.background
    ctx.fillRect(0, 0, width, height)
  }

  /**
   * 绘制像素风格云朵
   */
  private static drawPixelCloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.fillRect(x, y, size, size / 2)
    ctx.fillRect(x - size / 4, y + size / 4, size * 1.5, size / 2)
    ctx.fillRect(x + size / 4, y - size / 4, size / 2, size / 2)
  }
}
