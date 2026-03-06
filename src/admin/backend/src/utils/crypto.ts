/**
 * 加密工具模块
 * 提供密码加密和验证功能
 * 
 * 使用 bcryptjs（纯 JavaScript 实现）而不是 bcrypt（需要原生编译）
 * 这样可以避免在不同平台上的编译问题
 * 
 * 需求: 1.1 - 提供用户登录认证功能，支持用户名密码登录
 * 非功能性需求 - 密码使用 bcrypt 加密存储
 */

import bcrypt from 'bcryptjs'

/**
 * 默认的 salt rounds（盐轮数）
 * 值越大，加密越安全但也越慢
 * 10 是一个平衡安全性和性能的推荐值
 */
const SALT_ROUNDS = 10

/**
 * 对密码进行哈希加密
 * 
 * @param password - 明文密码
 * @returns Promise<string> - 加密后的密码哈希值
 * 
 * @example
 * ```typescript
 * const hash = await hashPassword('admin123')
 * // hash: '$2a$10$...' (bcrypt 格式的哈希值)
 * ```
 */
export async function hashPassword(password: string): Promise<string> {
  // 生成盐值并进行哈希
  const salt = await bcrypt.genSalt(SALT_ROUNDS)
  const hash = await bcrypt.hash(password, salt)
  return hash
}

/**
 * 验证密码是否与哈希值匹配
 * 
 * @param password - 明文密码（用户输入）
 * @param hash - 存储的密码哈希值
 * @returns Promise<boolean> - 密码是否匹配
 * 
 * @example
 * ```typescript
 * const isValid = await verifyPassword('admin123', storedHash)
 * if (isValid) {
 *   // 密码正确，允许登录
 * }
 * ```
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const isMatch = await bcrypt.compare(password, hash)
  return isMatch
}

/**
 * 同步版本：对密码进行哈希加密
 * 用于初始化等不需要异步的场景
 * 
 * @param password - 明文密码
 * @returns string - 加密后的密码哈希值
 */
export function hashPasswordSync(password: string): string {
  const salt = bcrypt.genSaltSync(SALT_ROUNDS)
  const hash = bcrypt.hashSync(password, salt)
  return hash
}

/**
 * 同步版本：验证密码是否与哈希值匹配
 * 
 * @param password - 明文密码（用户输入）
 * @param hash - 存储的密码哈希值
 * @returns boolean - 密码是否匹配
 */
export function verifyPasswordSync(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash)
}
