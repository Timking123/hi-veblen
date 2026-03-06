/**
 * JWT 配置文件
 * 包含 JWT Token 的密钥、过期时间等配置
 * 
 * 需求: 1.3 - 使用 JWT Token 进行会话管理，Token 有效期 24 小时
 */

/**
 * JWT 配置接口
 */
export interface JWTConfig {
  /** JWT 签名密钥 */
  secret: string
  /** Token 过期时间（秒） */
  expiresIn: number
  /** Token 过期时间字符串（用于 jsonwebtoken） */
  expiresInString: string
  /** Token 签发者 */
  issuer: string
  /** Token 受众 */
  audience: string
  /** 签名算法 */
  algorithm: 'HS256' | 'HS384' | 'HS512'
}

/**
 * 默认 JWT 密钥
 * 警告：生产环境必须通过环境变量设置自定义密钥！
 */
const DEFAULT_JWT_SECRET = 'admin-system-jwt-secret-key-please-change-in-production'

/**
 * Token 过期时间：24 小时（秒）
 * 需求 1.3 规定 Token 有效期为 24 小时
 */
const TOKEN_EXPIRES_IN_SECONDS = 24 * 60 * 60 // 86400 秒

/**
 * 获取 JWT 密钥
 * 优先从环境变量读取，否则使用默认值
 * 
 * @returns JWT 密钥字符串
 */
export function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET
  
  if (!secret) {
    // 开发环境使用默认密钥，但输出警告
    if (process.env.NODE_ENV === 'production') {
      console.warn('[JWT] 警告：生产环境未设置 JWT_SECRET 环境变量，使用默认密钥不安全！')
    }
    return DEFAULT_JWT_SECRET
  }
  
  return secret
}

/**
 * 获取 Token 过期时间（秒）
 * 可通过环境变量 JWT_EXPIRES_IN 自定义
 * 
 * @returns 过期时间（秒）
 */
export function getTokenExpiresIn(): number {
  const expiresIn = process.env.JWT_EXPIRES_IN
  
  if (expiresIn) {
    const parsed = parseInt(expiresIn, 10)
    if (!isNaN(parsed) && parsed > 0) {
      return parsed
    }
  }
  
  return TOKEN_EXPIRES_IN_SECONDS
}

/**
 * JWT 配置对象
 * 集中管理所有 JWT 相关配置
 */
export const jwtConfig: JWTConfig = {
  secret: getJWTSecret(),
  expiresIn: getTokenExpiresIn(),
  expiresInString: `${getTokenExpiresIn()}s`,
  issuer: process.env.JWT_ISSUER || 'admin-system',
  audience: process.env.JWT_AUDIENCE || 'admin-frontend',
  algorithm: 'HS256'
}

export default jwtConfig
