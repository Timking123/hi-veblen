/**
 * 错误处理工具模块
 * 提供统一的错误类定义和错误处理中间件
 * 
 * 需求: 11.1 - 文件操作失败时记录详细错误日志
 * 需求: 11.2 - 编码问题时记录原始文件名和编码信息
 * 需求: 11.3 - 检测到安全威胁时记录安全警告日志
 * 需求: 11.4 - 使用不同日志级别
 * 需求: 11.5 - 提供日志查询和分析接口
 */

import { Request, Response, NextFunction } from 'express'
import { createLogger } from './logger'

const logger = createLogger('error-handler')

// ========== 自定义错误类 ==========

/**
 * 基础应用错误类
 */
export class AppError extends Error {
  /** HTTP 状态码 */
  public statusCode: number
  /** 是否为操作错误（可预期的错误） */
  public isOperational: boolean
  /** 错误上下文信息 */
  public context?: Record<string, any>

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.context = context

    // 捕获堆栈跟踪
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * 文件操作错误
 * 需求: 11.1 - 文件操作失败时记录详细错误日志
 */
export class FileOperationError extends AppError {
  constructor(
    message: string,
    context?: {
      operation?: string
      filePath?: string
      fileSize?: number
      [key: string]: any
    }
  ) {
    super(message, 500, true, context)
  }
}

/**
 * 文件编码错误
 * 需求: 11.2 - 编码问题时记录原始文件名和编码信息
 */
export class EncodingError extends AppError {
  constructor(
    message: string,
    context?: {
      filename?: string
      encoding?: string
      originalBytes?: string
      [key: string]: any
    }
  ) {
    super(message, 400, true, context)
  }
}

/**
 * 文件验证错误
 * 需求: 11.3 - 检测到安全威胁时记录安全警告日志
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    context?: {
      filename?: string
      expectedType?: string
      actualType?: string
      securityThreat?: boolean
      [key: string]: any
    }
  ) {
    super(message, 400, true, context)
  }
}

/**
 * 权限错误
 */
export class PermissionError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 403, true, context)
  }
}

/**
 * 资源未找到错误
 */
export class NotFoundError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 404, true, context)
  }
}

/**
 * 数据库操作错误
 */
export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 500, true, context)
  }
}

/**
 * 认证错误
 */
export class AuthenticationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 401, true, context)
  }
}

/**
 * 速率限制错误
 */
export class RateLimitError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 429, true, context)
  }
}

// ========== 错误处理中间件 ==========

/**
 * 统一错误处理中间件
 * 需求: 11.1, 11.2, 11.3, 11.4 - 详细记录各类错误
 * 
 * @param err 错误对象
 * @param req 请求对象
 * @param res 响应对象
 * @param next 下一个中间件
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 如果响应已经发送，交给默认错误处理器
  if (res.headersSent) {
    return next(err)
  }

  // 默认错误信息
  let statusCode = 500
  let message = '服务器内部错误'
  let context: Record<string, any> | undefined

  // 如果是自定义应用错误
  if (err instanceof AppError) {
    statusCode = err.statusCode
    message = err.message
    context = err.context

    // 根据错误类型选择日志级别
    if (err.isOperational) {
      // 操作错误（可预期的错误）- 使用 warn 级别
      logger.warn(err.message, {
        errorType: err.name,
        statusCode: err.statusCode,
        context: err.context,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent')
      })
    } else {
      // 编程错误（不可预期的错误）- 使用 error 级别
      logger.error(err.message, {
        errorType: err.name,
        statusCode: err.statusCode,
        context: err.context,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    // 特殊处理安全相关错误
    if (err instanceof ValidationError && err.context?.securityThreat) {
      logger.warn('检测到安全威胁', {
        errorType: err.name,
        message: err.message,
        context: err.context,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent')
      })
    }
  } else {
    // 未知错误 - 使用 error 级别
    logger.error('未处理的错误', {
      errorType: err.name,
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('user-agent')
    })
  }

  // 发送错误响应
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      details: context,
      stack: err.stack
    })
  })
}

/**
 * 404 错误处理中间件
 * 
 * @param req 请求对象
 * @param res 响应对象
 */
export function notFoundHandler(req: Request, res: Response): void {
  logger.warn('请求的资源不存在', {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent')
  })

  res.status(404).json({
    error: '请求的资源不存在'
  })
}

/**
 * 异步路由处理器包装函数
 * 自动捕获异步错误并传递给错误处理中间件
 * 
 * @param fn 异步处理函数
 * @returns Express 中间件函数
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// ========== 错误日志查询 ==========

/**
 * 错误日志条目接口
 */
export interface ErrorLogEntry {
  timestamp: string
  level: string
  message: string
  errorType?: string
  statusCode?: number
  context?: Record<string, any>
  path?: string
  method?: string
  ip?: string
  userAgent?: string
  stack?: string
}

/**
 * 错误日志查询参数接口
 */
export interface ErrorLogQuery {
  /** 开始时间 */
  startTime?: Date
  /** 结束时间 */
  endTime?: Date
  /** 日志级别 */
  level?: 'error' | 'warn' | 'info'
  /** 错误类型 */
  errorType?: string
  /** 请求路径 */
  path?: string
  /** 限制返回数量 */
  limit?: number
}

/**
 * 查询错误日志
 * 需求: 11.5 - 提供日志查询和分析接口
 * 
 * 注意：这是一个简化的实现，实际应用中应该从日志文件或日志数据库中查询
 * 
 * @param query 查询参数
 * @returns 错误日志列表
 */
export function queryErrorLogs(query: ErrorLogQuery = {}): ErrorLogEntry[] {
  // TODO: 实现从日志文件或数据库查询
  // 这里返回空数组作为占位符
  logger.info('查询错误日志', { query })
  return []
}

/**
 * 获取错误统计信息
 * 需求: 11.5 - 提供日志查询和分析接口
 * 
 * @param startTime 开始时间
 * @param endTime 结束时间
 * @returns 错误统计
 */
export function getErrorStats(startTime?: Date, endTime?: Date): {
  total: number
  byLevel: Record<string, number>
  byType: Record<string, number>
  byPath: Record<string, number>
} {
  // TODO: 实现从日志文件或数据库统计
  logger.info('获取错误统计', { startTime, endTime })
  return {
    total: 0,
    byLevel: {},
    byType: {},
    byPath: {}
  }
}

// ========== 错误处理辅助函数 ==========

/**
 * 判断错误是否为操作错误
 * 
 * @param error 错误对象
 * @returns 是否为操作错误
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational
  }
  return false
}

/**
 * 格式化错误信息用于日志记录
 * 
 * @param error 错误对象
 * @returns 格式化的错误信息
 */
export function formatErrorForLogging(error: Error | AppError): Record<string, any> {
  const formatted: Record<string, any> = {
    name: error.name,
    message: error.message,
    stack: error.stack
  }

  if (error instanceof AppError) {
    formatted.statusCode = error.statusCode
    formatted.isOperational = error.isOperational
    formatted.context = error.context
  }

  return formatted
}

/**
 * 创建错误响应对象
 * 
 * @param error 错误对象
 * @param includeDetails 是否包含详细信息（开发环境）
 * @returns 错误响应对象
 */
export function createErrorResponse(
  error: Error | AppError,
  includeDetails: boolean = false
): Record<string, any> {
  const response: Record<string, any> = {
    error: error.message
  }

  if (includeDetails) {
    response.name = error.name
    response.stack = error.stack

    if (error instanceof AppError) {
      response.statusCode = error.statusCode
      response.context = error.context
    }
  }

  return response
}

