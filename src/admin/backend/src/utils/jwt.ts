/**
 * JWT 工具函数模块
 * 提供 JWT Token 的生成、验证和解析功能
 * 
 * 需求: 1.3 - 使用 JWT Token 进行会话管理，Token 有效期 24 小时
 */

import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken'
import { jwtConfig } from '../config/jwt'

/**
 * Token 载荷接口
 * 定义 Token 中存储的用户信息
 */
export interface TokenPayload {
  /** 用户 ID */
  userId: number
  /** 用户名 */
  username: string
  /** 签发时间（Unix 时间戳） */
  iat?: number
  /** 过期时间（Unix 时间戳） */
  exp?: number
  /** 签发者 */
  iss?: string
  /** 受众 */
  aud?: string
}

/**
 * Token 验证结果接口
 */
export interface TokenVerifyResult {
  /** 是否有效 */
  valid: boolean
  /** 解析后的载荷（如果有效） */
  payload?: TokenPayload
  /** 错误信息（如果无效） */
  error?: string
  /** 错误类型 */
  errorType?: 'expired' | 'invalid' | 'malformed' | 'unknown'
}

/**
 * 生成 JWT Token
 * 
 * @param payload - Token 载荷，包含用户信息
 * @returns 生成的 JWT Token 字符串
 * 
 * @example
 * ```typescript
 * const token = generateToken({ userId: 1, username: 'admin' })
 * // token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 * ```
 */
export function generateToken(payload: Pick<TokenPayload, 'userId' | 'username'>): string {
  const signOptions: SignOptions = {
    expiresIn: jwtConfig.expiresIn,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
    algorithm: jwtConfig.algorithm
  }
  
  const token = jwt.sign(payload, jwtConfig.secret, signOptions)
  return token
}

/**
 * 验证并解析 JWT Token
 * 
 * @param token - 要验证的 JWT Token 字符串
 * @returns TokenVerifyResult - 验证结果，包含有效性和载荷或错误信息
 * 
 * @example
 * ```typescript
 * const result = verifyToken(token)
 * if (result.valid && result.payload) {
 *   console.log('用户ID:', result.payload.userId)
 * } else {
 *   console.log('Token 无效:', result.error)
 * }
 * ```
 */
export function verifyToken(token: string): TokenVerifyResult {
  try {
    const verifyOptions: VerifyOptions = {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      algorithms: [jwtConfig.algorithm]
    }
    
    const decoded = jwt.verify(token, jwtConfig.secret, verifyOptions) as TokenPayload
    
    return {
      valid: true,
      payload: decoded
    }
  } catch (error) {
    // 处理不同类型的 JWT 错误
    if (error instanceof jwt.TokenExpiredError) {
      return {
        valid: false,
        error: 'Token 已过期',
        errorType: 'expired'
      }
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      // 判断是格式错误还是签名无效
      const message = error.message
      if (message.includes('malformed') || message.includes('invalid')) {
        return {
          valid: false,
          error: 'Token 格式无效',
          errorType: 'malformed'
        }
      }
      return {
        valid: false,
        error: 'Token 签名无效',
        errorType: 'invalid'
      }
    }
    
    if (error instanceof jwt.NotBeforeError) {
      return {
        valid: false,
        error: 'Token 尚未生效',
        errorType: 'invalid'
      }
    }
    
    // 未知错误
    return {
      valid: false,
      error: '验证 Token 时发生未知错误',
      errorType: 'unknown'
    }
  }
}

/**
 * 解析 JWT Token（不验证签名）
 * 用于获取 Token 中的信息，即使 Token 已过期
 * 
 * 警告：此函数不验证 Token 的有效性，仅用于读取信息
 * 不要用于认证目的！
 * 
 * @param token - 要解析的 JWT Token 字符串
 * @returns TokenPayload | null - 解析后的载荷，如果解析失败返回 null
 * 
 * @example
 * ```typescript
 * const payload = decodeToken(expiredToken)
 * if (payload) {
 *   console.log('用户名:', payload.username)
 *   console.log('过期时间:', new Date(payload.exp! * 1000))
 * }
 * ```
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    // jwt.decode 不验证签名，仅解析 Token
    const decoded = jwt.decode(token, { complete: false }) as TokenPayload | null
    return decoded
  } catch {
    // 解析失败返回 null
    return null
  }
}

/**
 * 检查 Token 是否即将过期
 * 用于实现 Token 刷新逻辑
 * 
 * @param token - 要检查的 JWT Token 字符串
 * @param thresholdSeconds - 过期阈值（秒），默认 1 小时
 * @returns boolean - 如果 Token 将在阈值时间内过期返回 true
 * 
 * @example
 * ```typescript
 * if (isTokenExpiringSoon(token, 3600)) {
 *   // Token 将在 1 小时内过期，建议刷新
 *   const newToken = generateToken({ userId, username })
 * }
 * ```
 */
export function isTokenExpiringSoon(token: string, thresholdSeconds: number = 3600): boolean {
  const payload = decodeToken(token)
  
  if (!payload || !payload.exp) {
    return true // 无法解析或没有过期时间，视为即将过期
  }
  
  const now = Math.floor(Date.now() / 1000)
  const timeUntilExpiry = payload.exp - now
  
  return timeUntilExpiry <= thresholdSeconds
}

/**
 * 获取 Token 的剩余有效时间（秒）
 * 
 * @param token - JWT Token 字符串
 * @returns number - 剩余有效时间（秒），如果已过期或无效返回 0
 */
export function getTokenRemainingTime(token: string): number {
  const payload = decodeToken(token)
  
  if (!payload || !payload.exp) {
    return 0
  }
  
  const now = Math.floor(Date.now() / 1000)
  const remaining = payload.exp - now
  
  return remaining > 0 ? remaining : 0
}
