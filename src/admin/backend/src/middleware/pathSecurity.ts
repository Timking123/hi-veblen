/**
 * 路径安全中间件
 * 防止路径遍历攻击和非法文件访问
 * 
 * 需求: 7.4 - 防止路径遍历攻击
 * 需求: 7.5 - 记录文件访问日志
 */

import { Request, Response, NextFunction } from 'express'
import path from 'path'
import { createLogger } from '../utils/logger'

const logger = createLogger('path-security')

/**
 * 禁止访问的目录/文件名
 */
const FORBIDDEN_NAMES = new Set([
  '..',
  '.git',
  '.env',
  'node_modules',
  '.gitignore',
  '.npmrc'
])

/**
 * 禁止的路径模式（正则表达式）
 */
const FORBIDDEN_PATTERNS = [
  /\.\./,           // 包含 ..
  /^\/\./,          // 以 /. 开头
  /\/\./,           // 包含 /.
  /\\/,             // 包含反斜杠（Windows 路径分隔符）
  /\0/,             // 包含空字符
  /%2e%2e/i,        // URL 编码的 ..
  /%2f/i,           // URL 编码的 /
  /%5c/i            // URL 编码的 \
]

/**
 * 验证路径安全性
 * 
 * @param relativePath 相对路径
 * @returns 是否安全
 */
export function isPathSafe(relativePath: string): boolean {
  // 空路径视为根目录，是安全的
  if (!relativePath || relativePath === '' || relativePath === '/') {
    return true
  }

  // 检查禁止的模式
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(relativePath)) {
      return false
    }
  }

  // 检查是否包含禁止的名称
  const parts = relativePath.split(/[/\\]/)
  for (const part of parts) {
    if (FORBIDDEN_NAMES.has(part)) {
      return false
    }
  }

  // 规范化路径并检查是否尝试访问上级目录
  const normalizedPath = path.normalize(relativePath)
  if (normalizedPath.startsWith('..') || normalizedPath.includes('..')) {
    return false
  }

  return true
}

/**
 * 路径遍历防护中间件
 * 
 * 检查请求路径参数，防止路径遍历攻击
 * 需求: 7.4 - 防止路径遍历攻击
 */
export function pathTraversalProtection(req: Request, res: Response, next: NextFunction): void {
  // 获取路径参数（可能在 params.path 或 params['0'] 中）
  const pathParam = req.params.path || (req.params as Record<string, string>)['0'] || ''

  // 验证路径安全性
  if (!isPathSafe(pathParam)) {
    logger.warn('检测到路径遍历尝试', {
      path: pathParam,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      url: req.originalUrl
    })

    res.status(403).json({
      error: '禁止访问'
    })
    return
  }

  // 记录文件访问日志（仅记录实际的文件访问，不记录目录浏览）
  if (pathParam && pathParam !== '' && pathParam !== '/') {
    logger.info('文件访问', {
      path: pathParam,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      authenticated: !!(req as any).session?.userId
    })
  }

  next()
}

/**
 * 公共文件访问中间件
 * 
 * 仅允许访问特定的公共目录
 * 需求: 7.1 - 公共文件允许未认证用户访问
 */
export function publicFileAccess(allowedDirs: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const pathParam = req.params.path || (req.params as Record<string, string>)['0'] || ''

    // 检查路径是否以允许的目录开头
    const isAllowed = allowedDirs.some(dir => {
      const normalizedPath = pathParam.replace(/^\/+/, '')
      return normalizedPath.startsWith(dir + '/') || normalizedPath === dir
    })

    if (!isAllowed) {
      logger.warn('尝试访问非公共文件', {
        path: pathParam,
        allowedDirs,
        ip: req.ip
      })

      res.status(403).json({
        error: '禁止访问'
      })
      return
    }

    next()
  }
}

/**
 * 文件类型验证中间件
 * 
 * 验证文件扩展名是否在允许列表中
 */
export function fileTypeValidation(allowedExtensions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const pathParam = req.params.path || (req.params as Record<string, string>)['0'] || ''

    if (!pathParam) {
      next()
      return
    }

    const ext = path.extname(pathParam).toLowerCase()

    if (ext && !allowedExtensions.includes(ext)) {
      logger.warn('不允许的文件类型', {
        path: pathParam,
        extension: ext,
        allowedExtensions,
        ip: req.ip
      })

      res.status(403).json({
        error: '不支持的文件类型'
      })
      return
    }

    next()
  }
}

