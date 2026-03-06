/**
 * 数学工具函数
 * 提取常用的数学计算逻辑
 */

/**
 * 限制数值在指定范围内
 * @param value 要限制的值
 * @param min 最小值
 * @param max 最大值
 * @returns 限制后的值
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

/**
 * 线性插值
 * @param start 起始值
 * @param end 结束值
 * @param t 插值因子 (0-1)
 * @returns 插值结果
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * clamp(t, 0, 1)
}

/**
 * 计算两点之间的距离
 * @param x1 第一个点的 X 坐标
 * @param y1 第一个点的 Y 坐标
 * @param x2 第二个点的 X 坐标
 * @param y2 第二个点的 Y 坐标
 * @returns 距离
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1
  const dy = y2 - y1
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 将角度转换为弧度
 * @param degrees 角度
 * @returns 弧度
 */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * 将弧度转换为角度
 * @param radians 弧度
 * @returns 角度
 */
export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}

/**
 * 生成指定范围内的随机整数
 * @param min 最小值（包含）
 * @param max 最大值（包含）
 * @returns 随机整数
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 生成指定范围内的随机浮点数
 * @param min 最小值
 * @param max 最大值
 * @returns 随机浮点数
 */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

/**
 * 检查数值是否在指定范围内
 * @param value 要检查的值
 * @param min 最小值
 * @param max 最大值
 * @returns 是否在范围内
 */
export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max
}

/**
 * 计算百分比
 * @param value 当前值
 * @param max 最大值
 * @returns 百分比 (0-1)
 */
export function percentage(value: number, max: number): number {
  return max === 0 ? 0 : clamp(value / max, 0, 1)
}
