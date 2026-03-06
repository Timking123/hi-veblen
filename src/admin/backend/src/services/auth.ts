/**
 * 认证服务模块
 * 提供用户登录、登出、密码修改等认证相关功能
 * 
 * 需求: 1.1 - 提供用户登录认证功能，支持用户名密码登录
 * 需求: 1.2 - 在登录失败 5 次后锁定账户 15 分钟
 * 需求: 1.3 - 使用 JWT Token 进行会话管理，Token 有效期 24 小时
 */

import { getDatabase, saveDatabase } from '../database/init'
import { verifyPassword, hashPassword } from '../utils/crypto'
import { generateToken, TokenPayload } from '../utils/jwt'

/**
 * 账户锁定配置
 * 需求 1.2: 登录失败 5 次后锁定账户 15 分钟
 */
const LOCK_CONFIG = {
  /** 最大登录失败次数 */
  maxAttempts: 5,
  /** 锁定时长（分钟） */
  lockDurationMinutes: 15
}

/**
 * 用户信息接口
 */
export interface User {
  id: number
  username: string
  passwordHash: string
  createdAt: string
  updatedAt: string
  lastLogin: string | null
  loginAttempts: number
  lockedUntil: string | null
}

/**
 * 登录结果接口
 */
export interface LoginResult {
  success: boolean
  token?: string
  user?: {
    id: number
    username: string
    lastLogin: string | null
  }
  error?: string
  errorCode?: 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'USER_NOT_FOUND' | 'SYSTEM_ERROR'
  lockInfo?: {
    lockedUntil: string
    remainingMinutes: number
  }
}

/**
 * 账户锁定状态接口
 */
export interface LockStatus {
  isLocked: boolean
  lockedUntil: string | null
  remainingMinutes: number
  loginAttempts: number
}

/**
 * 密码修改结果接口
 */
export interface ChangePasswordResult {
  success: boolean
  error?: string
  errorCode?: 'INVALID_OLD_PASSWORD' | 'USER_NOT_FOUND' | 'SAME_PASSWORD' | 'SYSTEM_ERROR'
}

/**
 * 根据用户名查找用户
 * 
 * @param username - 用户名
 * @returns 用户信息或 null
 */
export function findUserByUsername(username: string): User | null {
  const db = getDatabase()
  
  const result = db.exec(`
    SELECT id, username, password_hash, created_at, updated_at, 
           last_login, login_attempts, locked_until
    FROM users 
    WHERE username = ?
  `, [username])
  
  if (result.length === 0 || !result[0] || !result[0].values || result[0].values.length === 0) {
    return null
  }
  
  const row = result[0].values[0]
  if (!row) {
    return null
  }
  
  return {
    id: row[0] as number,
    username: row[1] as string,
    passwordHash: row[2] as string,
    createdAt: row[3] as string,
    updatedAt: row[4] as string,
    lastLogin: row[5] as string | null,
    loginAttempts: row[6] as number,
    lockedUntil: row[7] as string | null
  }
}

/**
 * 根据用户 ID 查找用户
 * 
 * @param userId - 用户 ID
 * @returns 用户信息或 null
 */
export function findUserById(userId: number): User | null {
  const db = getDatabase()
  
  const result = db.exec(`
    SELECT id, username, password_hash, created_at, updated_at, 
           last_login, login_attempts, locked_until
    FROM users 
    WHERE id = ?
  `, [userId])
  
  if (result.length === 0 || !result[0] || !result[0].values || result[0].values.length === 0) {
    return null
  }
  
  const row = result[0].values[0]
  if (!row) {
    return null
  }
  
  return {
    id: row[0] as number,
    username: row[1] as string,
    passwordHash: row[2] as string,
    createdAt: row[3] as string,
    updatedAt: row[4] as string,
    lastLogin: row[5] as string | null,
    loginAttempts: row[6] as number,
    lockedUntil: row[7] as string | null
  }
}

/**
 * 检查账户锁定状态
 * 需求 1.2: 检查账户是否被锁定
 * 
 * @param username - 用户名
 * @returns 锁定状态信息
 */
export function checkAccountLock(username: string): LockStatus {
  const user = findUserByUsername(username)
  
  if (!user) {
    return {
      isLocked: false,
      lockedUntil: null,
      remainingMinutes: 0,
      loginAttempts: 0
    }
  }
  
  // 检查是否有锁定时间
  if (!user.lockedUntil) {
    return {
      isLocked: false,
      lockedUntil: null,
      remainingMinutes: 0,
      loginAttempts: user.loginAttempts
    }
  }
  
  const lockedUntilDate = new Date(user.lockedUntil)
  const now = new Date()
  
  // 检查锁定是否已过期
  if (now >= lockedUntilDate) {
    // 锁定已过期，重置登录尝试次数
    resetLoginAttempts(user.id)
    return {
      isLocked: false,
      lockedUntil: null,
      remainingMinutes: 0,
      loginAttempts: 0
    }
  }
  
  // 账户仍处于锁定状态
  const remainingMs = lockedUntilDate.getTime() - now.getTime()
  const remainingMinutes = Math.ceil(remainingMs / (1000 * 60))
  
  return {
    isLocked: true,
    lockedUntil: user.lockedUntil,
    remainingMinutes,
    loginAttempts: user.loginAttempts
  }
}

/**
 * 增加登录失败次数
 * 如果达到最大次数，锁定账户
 * 
 * @param userId - 用户 ID
 * @returns 更新后的登录尝试次数
 */
function incrementLoginAttempts(userId: number): number {
  const db = getDatabase()
  
  // 获取当前尝试次数
  const result = db.exec('SELECT login_attempts FROM users WHERE id = ?', [userId])
  let currentAttempts = 0
  
  if (result.length > 0 && result[0] && result[0].values && result[0].values.length > 0) {
    const row = result[0].values[0]
    if (row) {
      currentAttempts = row[0] as number
    }
  }
  
  const newAttempts = currentAttempts + 1
  
  // 检查是否需要锁定账户
  if (newAttempts >= LOCK_CONFIG.maxAttempts) {
    // 计算锁定结束时间
    const lockedUntil = new Date()
    lockedUntil.setMinutes(lockedUntil.getMinutes() + LOCK_CONFIG.lockDurationMinutes)
    
    db.run(`
      UPDATE users 
      SET login_attempts = ?, locked_until = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newAttempts, lockedUntil.toISOString(), userId])
  } else {
    db.run(`
      UPDATE users 
      SET login_attempts = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newAttempts, userId])
  }
  
  saveDatabase()
  return newAttempts
}

/**
 * 重置登录尝试次数
 * 
 * @param userId - 用户 ID
 */
function resetLoginAttempts(userId: number): void {
  const db = getDatabase()
  
  db.run(`
    UPDATE users 
    SET login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [userId])
  
  saveDatabase()
}

/**
 * 更新最后登录时间
 * 
 * @param userId - 用户 ID
 */
function updateLastLogin(userId: number): void {
  const db = getDatabase()
  
  db.run(`
    UPDATE users 
    SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [userId])
  
  saveDatabase()
}

/**
 * 用户登录
 * 需求 1.1: 验证用户名和密码
 * 需求 1.2: 检查账户锁定状态，登录失败时增加失败次数
 * 需求 1.3: 登录成功时生成 JWT Token
 * 
 * @param username - 用户名
 * @param password - 密码
 * @returns 登录结果
 */
export async function login(username: string, password: string): Promise<LoginResult> {
  try {
    // 查找用户
    const user = findUserByUsername(username)
    
    if (!user) {
      return {
        success: false,
        error: '用户名或密码错误',
        errorCode: 'USER_NOT_FOUND'
      }
    }
    
    // 检查账户是否被锁定
    const lockStatus = checkAccountLock(username)
    
    if (lockStatus.isLocked) {
      return {
        success: false,
        error: `账户已被锁定，请在 ${lockStatus.remainingMinutes} 分钟后重试`,
        errorCode: 'ACCOUNT_LOCKED',
        lockInfo: {
          lockedUntil: lockStatus.lockedUntil!,
          remainingMinutes: lockStatus.remainingMinutes
        }
      }
    }
    
    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.passwordHash)
    
    if (!isPasswordValid) {
      // 增加登录失败次数
      const attempts = incrementLoginAttempts(user.id)
      const remainingAttempts = LOCK_CONFIG.maxAttempts - attempts
      
      if (remainingAttempts <= 0) {
        return {
          success: false,
          error: `密码错误，账户已被锁定 ${LOCK_CONFIG.lockDurationMinutes} 分钟`,
          errorCode: 'ACCOUNT_LOCKED',
          lockInfo: {
            lockedUntil: new Date(Date.now() + LOCK_CONFIG.lockDurationMinutes * 60 * 1000).toISOString(),
            remainingMinutes: LOCK_CONFIG.lockDurationMinutes
          }
        }
      }
      
      return {
        success: false,
        error: `用户名或密码错误，还剩 ${remainingAttempts} 次尝试机会`,
        errorCode: 'INVALID_CREDENTIALS'
      }
    }
    
    // 登录成功，重置失败次数并更新最后登录时间
    resetLoginAttempts(user.id)
    updateLastLogin(user.id)
    
    // 生成 JWT Token
    const tokenPayload: Pick<TokenPayload, 'userId' | 'username'> = {
      userId: user.id,
      username: user.username
    }
    const token = generateToken(tokenPayload)
    
    // 重新获取用户信息（包含更新后的 last_login）
    const updatedUser = findUserById(user.id)
    
    return {
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        lastLogin: updatedUser?.lastLogin || null
      }
    }
  } catch (error) {
    console.error('登录失败:', error)
    return {
      success: false,
      error: '系统错误，请稍后重试',
      errorCode: 'SYSTEM_ERROR'
    }
  }
}

/**
 * 用户登出
 * 目前 JWT 是无状态的，登出主要由前端处理（删除 Token）
 * 此函数可用于记录登出日志或实现 Token 黑名单
 * 
 * @param userId - 用户 ID
 */
export async function logout(userId: number): Promise<void> {
  // 目前 JWT 是无状态的，登出由前端处理
  // 这里可以添加日志记录或 Token 黑名单逻辑
  console.log(`用户 ${userId} 已登出`)
}

/**
 * 修改密码
 * 
 * @param userId - 用户 ID
 * @param oldPassword - 旧密码
 * @param newPassword - 新密码
 * @returns 修改结果
 */
export async function changePassword(
  userId: number,
  oldPassword: string,
  newPassword: string
): Promise<ChangePasswordResult> {
  try {
    // 查找用户
    const user = findUserById(userId)
    
    if (!user) {
      return {
        success: false,
        error: '用户不存在',
        errorCode: 'USER_NOT_FOUND'
      }
    }
    
    // 验证旧密码
    const isOldPasswordValid = await verifyPassword(oldPassword, user.passwordHash)
    
    if (!isOldPasswordValid) {
      return {
        success: false,
        error: '原密码错误',
        errorCode: 'INVALID_OLD_PASSWORD'
      }
    }
    
    // 检查新密码是否与旧密码相同
    const isSamePassword = await verifyPassword(newPassword, user.passwordHash)
    
    if (isSamePassword) {
      return {
        success: false,
        error: '新密码不能与原密码相同',
        errorCode: 'SAME_PASSWORD'
      }
    }
    
    // 加密新密码
    const newPasswordHash = await hashPassword(newPassword)
    
    // 更新密码
    const db = getDatabase()
    db.run(`
      UPDATE users 
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newPasswordHash, userId])
    
    saveDatabase()
    
    return {
      success: true
    }
  } catch (error) {
    console.error('修改密码失败:', error)
    return {
      success: false,
      error: '系统错误，请稍后重试',
      errorCode: 'SYSTEM_ERROR'
    }
  }
}

/**
 * 获取用户信息（不包含敏感信息）
 * 
 * @param userId - 用户 ID
 * @returns 用户公开信息或 null
 */
export function getUserProfile(userId: number): { id: number; username: string; lastLogin: string | null } | null {
  const user = findUserById(userId)
  
  if (!user) {
    return null
  }
  
  return {
    id: user.id,
    username: user.username,
    lastLogin: user.lastLogin
  }
}

/**
 * 导出锁定配置（用于测试）
 */
export const lockConfig = LOCK_CONFIG
