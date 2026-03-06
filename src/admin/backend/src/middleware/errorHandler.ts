/**
 * 错误处理中间件
 * 统一处理应用中的各类错误
 * 
 * 需求: 1.5 - 在 2GB 内存限制下稳定运行
 * 
 * 错误类型:
 * - 400: 参数错误
 * - 401: 未认证
 * - 403: 权限不足
 * - 404: 资源不存在
 * - 409: 资源冲突
 * - 413: 文件过大
 * - 415: 文件类型不支持
 * - 423: 账户锁定
 * - 500: 服务器内部错误
 * - 503: 服务不可用
 */

import { Request, Response, NextFunction } from 'express'

/**
 * 自定义应用错误类
 * 用于抛出带有状态码和详细信息的错误
 */
export class AppError extends Error {
  /** HTTP 状态码 */
  statusCode: number
  /** 错误详情 */
  details?: {
    field?: string
    reason?: string
  }
  /** 是否为操作性错误（可预期的错误） */
  isOperational: boolean

  constructor(
    message: string,
    statusCode: number = 500,
    details?: { field?: string; reason?: string }
  ) {
    super(message)
    this.statusCode = statusCode
    this.details = details
    this.isOperational = true

    // 捕获堆栈跟踪
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * 错误响应接口
 */
interface ErrorResponse {
  code: number
  message: string
  details?: {
    field?: string
    reason?: string
  }
}

/**
 * 创建错误响应对象
 */
function createErrorResponse(
  code: number,
  message: string,
  details?: { field?: string; reason?: string }
): ErrorResponse {
  const response: ErrorResponse = {
    code,
    message
  }
  
  if (details) {
    response.details = details
  }
  
  return response
}

/**
 * 处理已知的操作性错误
 */
function handleOperationalError(err: AppError, res: Response): void {
  const response = createErrorResponse(
    err.statusCode,
    err.message,
    err.details
  )
  
  res.status(err.statusCode).json(response)
}

/**
 * 处理 JWT 相关错误
 */
function handleJWTError(err: Error, res: Response): void {
  let message = '认证失败'
  let statusCode = 401
  
  if (err.name === 'JsonWebTokenError') {
    message = '无效的 Token'
  } else if (err.name === 'TokenExpiredError') {
    message = 'Token 已过期，请重新登录'
  } else if (err.name === 'NotBeforeError') {
    message = 'Token 尚未生效'
  }
  
  const response = createErrorResponse(statusCode, message)
  res.status(statusCode).json(response)
}

/**
 * 处理 Multer 文件上传错误
 */
function handleMulterError(err: Error & { code?: string }, res: Response): void {
  let message = '文件上传失败'
  let statusCode = 400
  
  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      message = '文件大小超出限制'
      statusCode = 413
      break
    case 'LIMIT_FILE_COUNT':
      message = '文件数量超出限制'
      break
    case 'LIMIT_UNEXPECTED_FILE':
      message = '不支持的文件字段'
      break
    case 'LIMIT_PART_COUNT':
      message = '表单字段数量超出限制'
      break
    case 'LIMIT_FIELD_KEY':
      message = '字段名过长'
      break
    case 'LIMIT_FIELD_VALUE':
      message = '字段值过长'
      break
    case 'LIMIT_FIELD_COUNT':
      message = '字段数量超出限制'
      break
  }
  
  const response = createErrorResponse(statusCode, message)
  res.status(statusCode).json(response)
}

/**
 * 处理语法错误（如 JSON 解析错误）
 */
function handleSyntaxError(_err: SyntaxError, res: Response): void {
  const response = createErrorResponse(400, '请求格式错误，请检查 JSON 格式')
  res.status(400).json(response)
}

/**
 * 处理未知错误
 */
function handleUnknownError(err: Error, res: Response): void {
  // 在开发环境下输出详细错误信息
  if (process.env.NODE_ENV === 'development') {
    console.error('未知错误:', err)
  }
  
  const response = createErrorResponse(
    500,
    process.env.NODE_ENV === 'production' 
      ? '服务器内部错误，请稍后重试' 
      : err.message || '服务器内部错误'
  )
  
  res.status(500).json(response)
}

/**
 * 全局错误处理中间件
 * 捕获并处理应用中的所有错误
 * 
 * @param err - 错误对象
 * @param req - Express 请求对象
 * @param res - Express 响应对象
 * @param next - Express next 函数
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 记录错误日志
  console.error(`[${new Date().toISOString()}] 错误:`, {
    method: req.method,
    url: req.url,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  })

  // 如果响应已经发送，则不再处理
  if (res.headersSent) {
    return _next(err)
  }

  // 处理自定义应用错误
  if (err instanceof AppError) {
    return handleOperationalError(err, res)
  }

  // 处理 JWT 错误
  if (
    err.name === 'JsonWebTokenError' ||
    err.name === 'TokenExpiredError' ||
    err.name === 'NotBeforeError'
  ) {
    return handleJWTError(err, res)
  }

  // 处理 Multer 文件上传错误
  if (err.name === 'MulterError') {
    return handleMulterError(err as Error & { code?: string }, res)
  }

  // 处理 JSON 语法错误
  if (err instanceof SyntaxError && 'body' in err) {
    return handleSyntaxError(err, res)
  }

  // 处理未知错误
  handleUnknownError(err, res)
}

/**
 * 404 错误处理中间件
 * 处理未匹配到任何路由的请求
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const response = createErrorResponse(
    404,
    `接口不存在: ${req.method} ${req.url}`
  )
  res.status(404).json(response)
}

/**
 * 异步处理器包装函数
 * 自动捕获异步函数中的错误并传递给错误处理中间件
 * 
 * @param fn - 异步处理函数
 * @returns 包装后的处理函数
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export default errorHandler
