/**
 * 请求限流中间件
 * 使用 express-rate-limit 实现 API 请求频率限制
 */

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit'

/**
 * 通用 API 限流器
 * 限制：15 分钟内每个 IP 最多 100 次请求
 */
export const generalLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 最大请求次数
  standardHeaders: true, // 返回 X-RateLimit-* 响应头
  legacyHeaders: false, // 禁用 X-RateLimit-Limit 和 X-RateLimit-Remaining 旧版响应头
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  },
  // 自定义响应处理，添加剩余等待时间
  handler: (_req, res) => {
    const resetTime = res.getHeader('X-RateLimit-Reset')
    const retryAfter = resetTime ? Math.ceil(Number(resetTime) - Date.now() / 1000) : 900
    res.status(429).json({
      success: false,
      message: '请求过于频繁，请稍后再试',
      retryAfter
    })
  }
})

/**
 * 登录接口限流器
 * 限制：15 分钟内每个 IP 最多 5 次请求
 */
export const loginLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 5, // 最大请求次数
  standardHeaders: true, // 返回 X-RateLimit-* 响应头
  legacyHeaders: false,
  message: {
    success: false,
    message: '登录尝试过于频繁，请 15 分钟后再试'
  },
  // 自定义响应处理，添加剩余等待时间
  handler: (_req, res) => {
    const resetTime = res.getHeader('X-RateLimit-Reset')
    const retryAfter = resetTime ? Math.ceil(Number(resetTime) - Date.now() / 1000) : 900
    res.status(429).json({
      success: false,
      message: '登录尝试过于频繁，请 15 分钟后再试',
      retryAfter
    })
  }
})
