/**
 * 文件名编码处理器
 * 处理文件名的 UTF-8 编码和 RFC 5987 标准编码
 */

/**
 * 验证字符串是否为有效的 UTF-8
 * @param str 要验证的字符串
 * @returns 是否为有效 UTF-8
 */
export function isValidUtf8(str: string): boolean {
  try {
    // 尝试编码和解码，如果成功则为有效 UTF-8
    const encoded = Buffer.from(str, 'utf8')
    const decoded = encoded.toString('utf8')
    return decoded === str
  } catch {
    return false
  }
}

/**
 * 编码文件名用于 Content-Disposition 头
 * 遵循 RFC 5987 标准，同时提供 ASCII fallback
 * @param filename 原始文件名
 * @returns 编码后的 Content-Disposition 值
 */
export function encodeContentDisposition(filename: string): string {
  // 生成 ASCII fallback（移除非 ASCII 字符，替换为下划线）
  const asciiFallback = filename.replace(/[^\x00-\x7F]/g, '_')
  
  // RFC 5987 编码
  const encodedFilename = encodeURIComponent(filename)
    .replace(/['()]/g, escape)
    .replace(/\*/g, '%2A')
  
  // 组合两种格式
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFilename}`
}

interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * 验证文件名是否包含非法字符
 * @param filename 文件名
 * @returns 验证结果
 */
export function validateFilename(filename: string): ValidationResult {
  const errors: string[] = []
  
  // 检查是否为空
  if (!filename || filename.trim() === '') {
    errors.push('文件名不能为空')
    return { valid: false, errors }
  }
  
  // 检查是否为有效 UTF-8
  if (!isValidUtf8(filename)) {
    errors.push('文件名包含无效的 UTF-8 字符')
  }
  
  // 检查路径遍历字符
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    errors.push('文件名不能包含路径遍历字符（..、/、\\）')
  }
  
  // 检查禁止的特殊字符（Windows 和 Unix 系统）
  const forbiddenChars = /[<>:"|?*\x00-\x1F]/
  if (forbiddenChars.test(filename)) {
    errors.push('文件名包含非法字符（<>:"|?*或控制字符）')
  }
  
  // 检查文件名长度（大多数文件系统限制为 255 字节）
  if (Buffer.from(filename, 'utf8').length > 255) {
    errors.push('文件名过长（超过 255 字节）')
  }
  
  // 检查 Windows 保留名称
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i
  const parts = filename.split('.')
  const nameWithoutExt = parts[0] || ''
  if (reservedNames.test(nameWithoutExt)) {
    errors.push('文件名使用了系统保留名称')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 规范化文件名（清理特殊字符）
 * @param filename 原始文件名
 * @returns 规范化后的文件名
 */
export function normalizeFilename(filename: string): string {
  // 移除路径遍历字符
  let normalized = filename.replace(/\.\.[/\\]/g, '')
  
  // 移除或替换危险字符
  normalized = normalized.replace(/[<>:"|?*\x00-\x1F]/g, '_')
  
  // 移除前导和尾随空格
  normalized = normalized.trim()
  
  // 移除前导点（隐藏文件）
  while (normalized.startsWith('.')) {
    normalized = normalized.substring(1)
  }
  
  // 如果清理后为空，使用默认名称
  if (!normalized) {
    normalized = 'unnamed_file'
  }
  
  // 限制长度（保留扩展名）
  const maxLength = 200 // 留一些余地给扩展名
  if (normalized.length > maxLength) {
    const lastDotIndex = normalized.lastIndexOf('.')
    if (lastDotIndex > 0) {
      const ext = normalized.substring(lastDotIndex)
      const nameWithoutExt = normalized.substring(0, lastDotIndex)
      normalized = nameWithoutExt.substring(0, maxLength - ext.length) + ext
    } else {
      // 没有扩展名，直接截断
      normalized = normalized.substring(0, maxLength)
    }
  }
  
  return normalized
}
