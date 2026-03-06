/**
 * XSS 防护中间件
 * 对用户输入进行过滤和转义，防止跨站脚本攻击
 * 
 * 需求: 安全要求 - 添加 XSS 防护
 */

import { Request, Response, NextFunction } from 'express'

/**
 * HTML 实体转义映射表
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
}

/**
 * 转义 HTML 特殊字符
 * @param str 输入字符串
 * @returns 转义后的字符串
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') {
    return str
  }
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char)
}

/**
 * 移除危险的 HTML 标签和属性
 * @param str 输入字符串
 * @returns 清理后的字符串
 */
export function sanitizeHtml(str: string): string {
  if (typeof str !== 'string') {
    return str
  }
  
  // 移除 script 标签及其内容
  let result = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  
  // 移除 on* 事件处理器
  result = result.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
  result = result.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')
  
  // 移除 javascript: 协议
  result = result.replace(/javascript\s*:/gi, '')
  
  // 移除 data: 协议（可能包含恶意内容）
  result = result.replace(/data\s*:\s*text\/html/gi, '')
  
  // 移除 vbscript: 协议
  result = result.replace(/vbscript\s*:/gi, '')
  
  // 移除 expression() CSS 表达式
  result = result.replace(/expression\s*\(/gi, '')
  
  return result
}

/**
 * 递归清理对象中的所有字符串值
 * @param obj 输入对象
 * @param sanitize 是否进行深度清理（移除危险标签）
 * @returns 清理后的对象
 */
export function sanitizeObject(obj: unknown, sanitize = true): unknown {
  if (obj === null || obj === undefined) {
    return obj
  }
  
  if (typeof obj === 'string') {
    return sanitize ? sanitizeHtml(obj) : obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, sanitize))
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeObject(value, sanitize)
    }
    return result
  }
  
  return obj
}

/**
 * 需要跳过 XSS 清理的路径
 * 某些路径可能需要保留原始 HTML（如富文本编辑器内容）
 */
const SKIP_PATHS = [
  '/api/seo/schema',  // 结构化数据可能包含特殊字符
]

/**
 * 检查是否应该跳过 XSS 清理
 * @param path 请求路径
 * @returns 是否跳过
 */
function shouldSkip(path: string): boolean {
  return SKIP_PATHS.some(skipPath => path.startsWith(skipPath))
}

/**
 * XSS 防护中间件
 * 清理请求体、查询参数和路径参数中的潜在 XSS 攻击代码
 */
export function xssProtection(req: Request, _res: Response, next: NextFunction): void {
  try {
    // 检查是否应该跳过
    if (shouldSkip(req.path)) {
      return next()
    }
    
    // 清理请求体
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body)
    }
    
    // 清理查询参数
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query) as typeof req.query
    }
    
    // 清理路径参数
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params) as typeof req.params
    }
    
    next()
  } catch (error) {
    console.error('XSS 防护中间件错误:', error)
    next()
  }
}

export default xssProtection
