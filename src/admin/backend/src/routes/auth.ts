/**
 * 认证路由模块
 * 注册所有认证相关路由
 * 
 * 路由列表:
 * - POST /login - 用户登录
 * - POST /logout - 用户登出（需要认证）
 * - GET /profile - 获取当前用户信息（需要认证）
 * - PUT /password - 修改密码（需要认证）
 * - GET /lock-status/:username - 检查账户锁定状态
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { loginLimiter } from '../middleware/rateLimit'
import {
  loginHandler,
  logoutHandler,
  getProfileHandler,
  changePasswordHandler,
  checkLockStatusHandler
} from '../controllers/auth'

const router = Router()

/**
 * POST /login
 * 用户登录
 * 
 * 请求体: { username: string, password: string }
 * 响应: { token: string, user: { id, username, lastLogin } }
 * 
 * 限流: 15 分钟内每个 IP 最多 5 次请求
 * 需求: 4.2 - 对登录接口在 15 分钟窗口内限制每个 IP 最多 5 次请求
 */
router.post('/login', loginLimiter, loginHandler)

/**
 * POST /logout
 * 用户登出
 * 
 * 需要认证: 是
 * 响应: { success: true }
 */
router.post('/logout', authMiddleware, logoutHandler)

/**
 * GET /profile
 * 获取当前用户信息
 * 
 * 需要认证: 是
 * 响应: { user: { id, username, lastLogin } }
 */
router.get('/profile', authMiddleware, getProfileHandler)

/**
 * PUT /password
 * 修改密码
 * 
 * 需要认证: 是
 * 请求体: { oldPassword: string, newPassword: string }
 * 响应: { success: true }
 */
router.put('/password', authMiddleware, changePasswordHandler)

/**
 * GET /lock-status/:username
 * 检查账户锁定状态
 * 
 * 响应: { isLocked, lockedUntil, remainingMinutes, loginAttempts }
 */
router.get('/lock-status/:username', checkLockStatusHandler)

export default router
