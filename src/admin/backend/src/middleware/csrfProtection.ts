/**
 * CSRF 防护中间件
 * 实现 CSRF Token 验证，防止跨站请求伪造攻击
 * 
 * 需求: 安全要求 - 添加 CSRF 防护
 * 
 * 实现方式:
 * 1. 使用双重提交 Cookie 模式
 * 2. 生成随机 Token 存储在 Cookie 中
 * 3. 前端在请求头中携带相同的 Token
 * 4. 后端验证两者是否匹配
 */

import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

/**
 * CSRF Token 的 Cookie 名称
 */
const CSRF_COOKIE_NAME = 'csrf_token'

/**
 * CSRF Token 的请求头名称
 */
const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Token 有效期（毫秒）- 24小时
 */
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000

/**
 * 需要跳过 CSRF 验证的路径
 * 这些路径通常是公开接口或来自外部网站的请求
 * 
 * 注意：由于 CSRF 中间件在 API 路由之前全局注册，
 * req.path 包含完整路径（如 /api/messages/submit）
 * 因此需要同时配置带和不带 /api 前缀的路径
 */
const SKIP_PATHS = [
  // 不带 /api 前缀的路径（用于路由级别中间件）
  '/auth/login',              // 登录接口
  '/health',                  // 健康检查
  '/statistics/track',        // 访问统计上报（来自前端网站）
  '/dashboard/visits',        // 访问统计上报（来自前端网站）
  '/messages/submit',         // 留言提交（来自前端网站联系表单）
  '/files/public/audio/',     // 音频文件公开下载（用于 <audio> 元素）
  '/files/public/image/',     // 图片文件公开下载（用于 <img> 元素）
  '/files/resume/download/',  // 简历公开下载
  // 带 /api 前缀的路径（用于全局中间件）
  '/api/auth/login',
  '/api/health',
  '/api/statistics/track',
  '/api/dashboard/visits',    // 访问统计上报（来自前端网站）
  '/api/messages/submit',
  '/api/files/public/audio/',
  '/api/files/public/image/',
  '/api/files/resume/download/'
]

/**
 * 需要跳过 CSRF 验证的 HTTP 方法
 * GET、HEAD、OPTIONS 是安全方法，不需要 CSRF 保护
 */
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']

/**
 * 生成 CSRF Token
 * @returns 随机生成的 Token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * 验证 CSRF Token
 * @param cookieToken Cookie 中的 Token
 * @param headerToken 请求头中的 Token
 * @returns 是否验证通过
 */
export function validateCsrfToken(cookieToken: string | undefined, headerToken: string | undefined): boolean {
  if (!cookieToken || !headerToken) {
    return false
  }
  
  // 使用时间安全的比较函数防止时序攻击
  try {
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken)
    )
  } catch {
    return false
  }
}

/**
 * 检查是否应该跳过 CSRF 验证
 * @param req 请求对象
 * @returns 是否跳过
 */
function shouldSkip(req: Request): boolean {
  // 安全方法不需要 CSRF 保护
  if (SAFE_METHODS.includes(req.method)) {
    return true
  }
  
  // 检查跳过路径
  return SKIP_PATHS.some(path => req.path.startsWith(path))
}

/**
 * 解析 Cookie
 * @param cookieHeader Cookie 头字符串
 * @returns Cookie 键值对
 */
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {}
  
  if (!cookieHeader) {
    return cookies
  }
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.split('=')
    if (name && rest.length > 0) {
      cookies[name.trim()] = rest.join('=').trim()
    }
  })
  
  return cookies
}

/**
 * CSRF 防护中间件
 * 验证请求中的 CSRF Token
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  try {
    // 检查是否应该跳过
    if (shouldSkip(req)) {
      return next()
    }
    
    // 解析 Cookie
    const cookies = parseCookies(req.headers.cookie)
    const cookieToken = cookies[CSRF_COOKIE_NAME]
    
    // 获取请求头中的 Token
    const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined
    
    // 验证 Token
    if (!validateCsrfToken(cookieToken, headerToken)) {
      res.status(403).json({
        success: false,
        message: 'CSRF Token 验证失败',
        code: 'CSRF_VALIDATION_FAILED'
      })
      return
    }
    
    next()
  } catch (error) {
    console.error('CSRF 防护中间件错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

/**
 * CSRF Token 生成中间件
 * 为每个请求生成或刷新 CSRF Token
 */
export function csrfTokenGenerator(req: Request, res: Response, next: NextFunction): void {
  try {
    // 解析现有 Cookie
    const cookies = parseCookies(req.headers.cookie)
    let token = cookies[CSRF_COOKIE_NAME]
    
    // 如果没有 Token 或 Token 即将过期，生成新的
    if (!token) {
      token = generateCsrfToken()
      
      // 设置 Cookie
      res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false,  // 前端需要读取
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: TOKEN_EXPIRY,
        path: '/'
      })
    }
    
    // 将 Token 添加到响应头，方便前端获取
    res.setHeader('X-CSRF-Token', token)
    
    next()
  } catch (error) {
    console.error('CSRF Token 生成错误:', error)
    next()
  }
}

export default csrfProtection
