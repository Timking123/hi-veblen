/**
 * 时间格式化工具函数
 * 
 * 提供将 UTC 时间转换为北京时间（UTC+8）的格式化功能
 */

/**
 * 将时间转换为北京时间并格式化
 * 
 * @param dateStr - ISO 格式的时间字符串（如 '2024-01-15T10:30:00.000Z'）
 * @param format - 输出格式，默认 'YYYY-MM-DD HH:mm'
 *                 支持的占位符：YYYY（年）、MM（月）、DD（日）、HH（时）、mm（分）、ss（秒）
 * @returns 北京时间格式化字符串，无效输入返回 '-'
 * 
 * @example
 * // 基本用法
 * formatBeijingTime('2024-01-15T10:30:00.000Z')
 * // 返回: '2024-01-15 18:30'
 * 
 * @example
 * // 自定义格式
 * formatBeijingTime('2024-01-15T10:30:45.000Z', 'YYYY-MM-DD HH:mm:ss')
 * // 返回: '2024-01-15 18:30:45'
 * 
 * @example
 * // 仅日期
 * formatBeijingTime('2024-01-15T10:30:00.000Z', 'YYYY-MM-DD')
 * // 返回: '2024-01-15'
 */
export function formatBeijingTime(dateStr: string, format: string = 'YYYY-MM-DD HH:mm'): string {
  // 处理空值或无效输入
  if (!dateStr) {
    return '-'
  }

  const date = new Date(dateStr)
  
  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    return '-'
  }

  // 北京时间偏移量：UTC+8 = 8小时 = 8 * 60 * 60 * 1000 毫秒
  const beijingOffset = 8 * 60 * 60 * 1000
  const beijingTime = new Date(date.getTime() + beijingOffset)

  // 提取北京时间的各个部分（使用 UTC 方法避免本地时区影响）
  const y = beijingTime.getUTCFullYear()
  const m = String(beijingTime.getUTCMonth() + 1).padStart(2, '0')
  const d = String(beijingTime.getUTCDate()).padStart(2, '0')
  const h = String(beijingTime.getUTCHours()).padStart(2, '0')
  const min = String(beijingTime.getUTCMinutes()).padStart(2, '0')
  const sec = String(beijingTime.getUTCSeconds()).padStart(2, '0')

  // 替换格式字符串中的占位符
  return format
    .replace('YYYY', String(y))
    .replace('MM', m)
    .replace('DD', d)
    .replace('HH', h)
    .replace('mm', min)
    .replace('ss', sec)
}

/**
 * 获取当前北京时间的格式化字符串
 * 
 * @param format - 输出格式，默认 'YYYY-MM-DD HH:mm'
 * @returns 当前北京时间的格式化字符串
 */
export function getCurrentBeijingTime(format: string = 'YYYY-MM-DD HH:mm'): string {
  return formatBeijingTime(new Date().toISOString(), format)
}
