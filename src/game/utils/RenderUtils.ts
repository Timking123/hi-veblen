/**
 * 渲染工具函数
 * 提取常用的渲染辅助逻辑
 */

/**
 * 创建离屏 Canvas
 * @param width 宽度
 * @param height 高度
 * @returns Canvas 元素和上下文
 */
export function createOffscreenCanvas(
  width: number,
  height: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', {
    alpha: true,
    willReadFrequently: false
  })!
  return { canvas, ctx }
}

/**
 * 创建渐变
 * @param ctx 渲染上下文
 * @param x 起始 X 坐标
 * @param y 起始 Y 坐标
 * @param width 宽度
 * @param height 高度
 * @param colorStops 颜色停止点数组 [{offset, color}]
 * @returns 渐变对象
 */
export function createLinearGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  colorStops: Array<{ offset: number; color: string }>
): CanvasGradient {
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height)
  for (const stop of colorStops) {
    gradient.addColorStop(stop.offset, stop.color)
  }
  return gradient
}

/**
 * 创建径向渐变
 * @param ctx 渲染上下文
 * @param x 中心 X 坐标
 * @param y 中心 Y 坐标
 * @param innerRadius 内半径
 * @param outerRadius 外半径
 * @param colorStops 颜色停止点数组
 * @returns 渐变对象
 */
export function createRadialGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  innerRadius: number,
  outerRadius: number,
  colorStops: Array<{ offset: number; color: string }>
): CanvasGradient {
  const gradient = ctx.createRadialGradient(x, y, innerRadius, x, y, outerRadius)
  for (const stop of colorStops) {
    gradient.addColorStop(stop.offset, stop.color)
  }
  return gradient
}

/**
 * 绘制圆角矩形
 * @param ctx 渲染上下文
 * @param x X 坐标
 * @param y Y 坐标
 * @param width 宽度
 * @param height 高度
 * @param radius 圆角半径
 */
export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

/**
 * 保存和恢复渲染状态的辅助函数
 * @param ctx 渲染上下文
 * @param callback 在保存状态下执行的回调
 */
export function withSavedContext(
  ctx: CanvasRenderingContext2D,
  callback: (ctx: CanvasRenderingContext2D) => void
): void {
  ctx.save()
  try {
    callback(ctx)
  } finally {
    ctx.restore()
  }
}

/**
 * 设置渲染质量
 * @param ctx 渲染上下文
 * @param highQuality 是否高质量
 */
export function setRenderQuality(
  ctx: CanvasRenderingContext2D,
  highQuality: boolean
): void {
  ctx.imageSmoothingEnabled = highQuality
  if (highQuality) {
    ctx.imageSmoothingQuality = 'high'
  }
}

/**
 * 清空 Canvas
 * @param ctx 渲染上下文
 * @param color 背景颜色（可选）
 */
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  color?: string
): void {
  if (color) {
    ctx.fillStyle = color
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  } else {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  }
}
