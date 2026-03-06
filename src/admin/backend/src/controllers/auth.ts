/**
 * 认证控制器模块
 * 处理 /api/auth/* 路由的请求
 * 
 * 需求: 1.1 - 提供用户登录认证功能
 * 需求: 1.2 - 登录失败 5 次后锁定账户 15 分钟
 * 需求: 1.3 - 使用 JWT Token 进行会话管理
 */

import { Request, Response } from 'express'
import {
  login,
  logout,
  changePassword,
  getUserProfile,
  checkAccountLock
} from '../services/auth'
import { createLogger } from '../utils/logger'

// 创建认证控制器日志记录器
const logger = createLogger('auth')

/**
 * 错误响应接口
 */
interface ErrorResponse {
  code: number
  message: string
  details?: {
    field?: string
    reason?: string
    lockInfo?: {
      lockedUntil: string
      remainingMinutes: number
    }
  }
}

/**
 * 发送错误响应
 * 
 * @param res - Express Response 对象
 * @param code - HTTP 状态码
 * @param message - 错误消息
 * @param details - 错误详情（可选）
 */
function sendError(
  res: Response,
  code: number,
  message: string,
  details?: ErrorResponse['details']
): void {
  const errorResponse: ErrorResponse = {
    code,
    message
  }
  
  if (details) {
    errorResponse.details = details
  }
  
  res.status(code).json(errorResponse)
}

/**
 * 用户登录
 * POST /api/auth/login
 * 
 * 请求体: { username: string, password: string }
 * 响应: { token: string, user: { id, username, lastLogin } }
 * 
 * 错误码:
 * - 400: 参数错误（缺少用户名或密码）
 * - 401: 认证失败（用户名或密码错误）
 * - 423: 账户锁定
 */
export async function loginHandler(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body
    
    // 参数验证
    if (!username || typeof username !== 'string') {
      sendError(res, 400, '请输入用户名', { field: 'username', reason: 'required' })
      return
    }
    
    if (!password || typeof password !== 'string') {
      sendError(res, 400, '请输入密码', { field: 'password', reason: 'required' })
      return
    }
    
    // 去除首尾空格
    const trimmedUsername = username.trim()
    
    if (trimmedUsername.length === 0) {
      sendError(res, 400, '用户名不能为空', { field: 'username', reason: 'empty' })
      return
    }
    
    // 调用登录服务
    const result = await login(trimmedUsername, password)
    
    if (!result.success) {
      // 根据错误类型返回不同的状态码
      if (result.errorCode === 'ACCOUNT_LOCKED') {
        // 423 Locked - 账户被锁定
        sendError(res, 423, result.error || '账户已被锁定', {
          reason: 'account_locked',
          lockInfo: result.lockInfo
        })
        return
      }
      
      // 401 Unauthorized - 认证失败
      sendError(res, 401, result.error || '用户名或密码错误', {
        reason: result.errorCode?.toLowerCase() || 'invalid_credentials'
      })
      return
    }
    
    // 登录成功
    res.json({
      token: result.token,
      user: result.user
    })
  } catch (error) {
    logger.error('登录处理错误', { error: error instanceof Error ? error.message : String(error) })
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 用户登出
 * POST /api/auth/logout
 * 
 * 需要认证: 是
 * 响应: { success: true }
 */
export async function logoutHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId
    
    if (!userId) {
      sendError(res, 401, '未认证')
      return
    }
    
    await logout(userId)
    
    res.json({ success: true })
  } catch (error) {
    logger.error('登出处理错误', { error: error instanceof Error ? error.message : String(error) })
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 获取当前用户信息
 * GET /api/auth/profile
 * 
 * 需要认证: 是
 * 响应: { user: { id, username, lastLogin } }
 */
export async function getProfileHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId
    
    if (!userId) {
      sendError(res, 401, '未认证')
      return
    }
    
    const profile = getUserProfile(userId)
    
    if (!profile) {
      sendError(res, 404, '用户不存在')
      return
    }
    
    res.json({ user: profile })
  } catch (error) {
    logger.error('获取用户信息错误', { error: error instanceof Error ? error.message : String(error) })
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 修改密码
 * PUT /api/auth/password
 * 
 * 需要认证: 是
 * 请求体: { oldPassword: string, newPassword: string }
 * 响应: { success: true }
 * 
 * 错误码:
 * - 400: 参数错误
 * - 401: 原密码错误
 */
export async function changePasswordHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId
    
    if (!userId) {
      sendError(res, 401, '未认证')
      return
    }
    
    const { oldPassword, newPassword } = req.body
    
    // 参数验证
    if (!oldPassword || typeof oldPassword !== 'string') {
      sendError(res, 400, '请输入原密码', { field: 'oldPassword', reason: 'required' })
      return
    }
    
    if (!newPassword || typeof newPassword !== 'string') {
      sendError(res, 400, '请输入新密码', { field: 'newPassword', reason: 'required' })
      return
    }
    
    // 新密码长度验证
    if (newPassword.length < 6) {
      sendError(res, 400, '新密码长度不能少于 6 位', { field: 'newPassword', reason: 'too_short' })
      return
    }
    
    if (newPassword.length > 50) {
      sendError(res, 400, '新密码长度不能超过 50 位', { field: 'newPassword', reason: 'too_long' })
      return
    }
    
    // 调用修改密码服务
    const result = await changePassword(userId, oldPassword, newPassword)
    
    if (!result.success) {
      // 根据错误类型返回不同的状态码
      if (result.errorCode === 'INVALID_OLD_PASSWORD') {
        sendError(res, 401, result.error || '原密码错误', { reason: 'invalid_old_password' })
        return
      }
      
      if (result.errorCode === 'SAME_PASSWORD') {
        sendError(res, 400, result.error || '新密码不能与原密码相同', { reason: 'same_password' })
        return
      }
      
      sendError(res, 400, result.error || '修改密码失败')
      return
    }
    
    res.json({ success: true })
  } catch (error) {
    logger.error('修改密码处理错误', { error: error instanceof Error ? error.message : String(error) })
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 检查账户锁定状态
 * GET /api/auth/lock-status/:username
 * 
 * 此接口用于前端在登录前检查账户状态
 * 响应: { isLocked, lockedUntil, remainingMinutes, loginAttempts }
 */
export async function checkLockStatusHandler(req: Request, res: Response): Promise<void> {
  try {
    const { username } = req.params
    
    if (!username || typeof username !== 'string') {
      sendError(res, 400, '请提供用户名')
      return
    }
    
    const lockStatus = checkAccountLock(username.trim())
    
    res.json(lockStatus)
  } catch (error) {
    logger.error('检查锁定状态错误', { error: error instanceof Error ? error.message : String(error) })
    sendError(res, 500, '服务器内部错误')
  }
}
