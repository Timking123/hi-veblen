/**
 * 认证中间件模块
 * 提供 JWT Token 验证和用户认证功能
 * 
 * 需求: 1.3 - 使用 JWT Token 进行会话管理
 */

import { Request, Response, NextFunction } from 'express'
import { verifyToken, TokenPayload } from '../utils/jwt'

/**
 * 扩展 Express Request 类型，添加 user 属性
 */
declare global {
  namespace Express {
    interface Request {
      /** 当前认证用户信息 */
      user?: TokenPayload
    }
  }
}

/**
 * 认证错误响应接口
 */
interface AuthErrorResponse {
  code: number
  message: string
  details?: {
    reason?: string
  }
}

/**
 * 从请求头中提取 Bearer Token
 * 
 * @param authHeader - Authorization 请求头值
 * @returns Token 字符串，如果格式无效返回 null
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null
  }

  // 检查是否以 "Bearer " 开头（不区分大小写）
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || !parts[0] || parts[0].toLowerCase() !== 'bearer') {
    return null
  }

  const token = parts[1]
  // 检查 Token 是否为空
  if (!token || token.trim() === '') {
    return null
  }

  return token
}

/**
 * 发送认证错误响应
 * 
 * @param res - Express Response 对象
 * @param message - 错误消息
 * @param reason - 错误原因（可选）
 */
function sendAuthError(res: Response, message: string, reason?: string): void {
  const errorResponse: AuthErrorResponse = {
    code: 401,
    message
  }

  if (reason) {
    errorResponse.details = { reason }
  }

  res.status(401).json(errorResponse)
}

/**
 * 认证中间件
 * 验证请求中的 JWT Token，如果有效则将用户信息附加到 req.user
 * 
 * 处理以下错误情况：
 * - 未提供 Token：返回 401，消息 "未提供认证令牌"
 * - Token 格式错误：返回 401，消息 "认证令牌格式无效"
 * - Token 已过期：返回 401，消息 "认证令牌已过期"
 * - Token 签名无效：返回 401，消息 "认证令牌无效"
 * 
 * @example
 * ```typescript
 * // 在路由中使用
 * router.get('/protected', authMiddleware, (req, res) => {
 *   console.log('当前用户:', req.user)
 *   res.json({ user: req.user })
 * })
 * ```
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 从请求头获取 Authorization
  const authHeader = req.headers.authorization

  // 检查是否提供了 Authorization 头
  if (!authHeader) {
    sendAuthError(res, '未提供认证令牌', 'missing_token')
    return
  }

  // 提取 Bearer Token
  const token = extractBearerToken(authHeader)
  if (!token) {
    sendAuthError(res, '认证令牌格式无效', 'invalid_format')
    return
  }

  // 验证 Token
  const result = verifyToken(token)

  if (!result.valid) {
    // 根据错误类型返回不同的错误消息
    switch (result.errorType) {
      case 'expired':
        sendAuthError(res, '认证令牌已过期', 'token_expired')
        return
      case 'malformed':
        sendAuthError(res, '认证令牌格式无效', 'token_malformed')
        return
      case 'invalid':
        sendAuthError(res, '认证令牌无效', 'token_invalid')
        return
      default:
        sendAuthError(res, '认证令牌无效', 'unknown_error')
        return
    }
  }

  // Token 有效，将用户信息附加到请求对象
  req.user = result.payload
  next()
}

/**
 * 可选认证中间件
 * 如果提供了有效 Token，附加用户信息；如果未提供或无效，继续处理请求（不返回错误）
 * 
 * 适用于需要区分已登录和未登录用户的场景，例如：
 * - 公开页面但需要显示用户信息
 * - 某些功能对已登录用户有额外权限
 * 
 * @example
 * ```typescript
 * // 在路由中使用
 * router.get('/public', optionalAuthMiddleware, (req, res) => {
 *   if (req.user) {
 *     console.log('已登录用户:', req.user.username)
 *   } else {
 *     console.log('访客用户')
 *   }
 *   res.json({ user: req.user || null })
 * })
 * ```
 */
export function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  // 从请求头获取 Authorization
  const authHeader = req.headers.authorization

  // 如果没有提供 Authorization 头，直接继续
  if (!authHeader) {
    next()
    return
  }

  // 提取 Bearer Token
  const token = extractBearerToken(authHeader)
  if (!token) {
    // Token 格式无效，但这是可选认证，继续处理
    next()
    return
  }

  // 验证 Token
  const result = verifyToken(token)

  if (result.valid && result.payload) {
    // Token 有效，附加用户信息
    req.user = result.payload
  }
  // 无论 Token 是否有效，都继续处理请求

  next()
}

/**
 * 创建自定义认证中间件
 * 允许自定义错误处理逻辑
 * 
 * @param options - 配置选项
 * @returns 认证中间件函数
 * 
 * @example
 * ```typescript
 * const customAuth = createAuthMiddleware({
 *   onError: (res, error) => {
 *     // 自定义错误处理
 *     res.status(401).json({ error: error.message })
 *   }
 * })
 * ```
 */
export function createAuthMiddleware(options?: {
  onError?: (res: Response, error: { message: string; type: string }) => void
}): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      if (options?.onError) {
        options.onError(res, { message: '未提供认证令牌', type: 'missing_token' })
      } else {
        sendAuthError(res, '未提供认证令牌', 'missing_token')
      }
      return
    }

    const token = extractBearerToken(authHeader)
    if (!token) {
      if (options?.onError) {
        options.onError(res, { message: '认证令牌格式无效', type: 'invalid_format' })
      } else {
        sendAuthError(res, '认证令牌格式无效', 'invalid_format')
      }
      return
    }

    const result = verifyToken(token)

    if (!result.valid) {
      const errorMessages: Record<string, string> = {
        expired: '认证令牌已过期',
        malformed: '认证令牌格式无效',
        invalid: '认证令牌无效',
        unknown: '认证令牌无效'
      }
      const errorType = result.errorType || 'unknown'
      const message = errorMessages[errorType] || '认证令牌无效'
      
      if (options?.onError) {
        options.onError(res, { message, type: errorType })
      } else {
        sendAuthError(res, message, errorType)
      }
      return
    }

    req.user = result.payload
    next()
  }
}

// 导出辅助函数供测试使用
export { extractBearerToken }
