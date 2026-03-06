/**
 * 认证服务单元测试
 * 测试登录、登出、密码修改等功能
 * 
 * 验证需求: 1.1, 1.2, 1.3
 */

import { initDatabase, closeDatabase, resetDatabase, getDatabase } from '../../database/init'
import {
  login,
  logout,
  changePassword,
  checkAccountLock,
  getUserProfile,
  findUserByUsername,
  lockConfig
} from '../auth'
import { hashPasswordSync } from '../../utils/crypto'

describe('认证服务 (Auth Service)', () => {
  beforeAll(async () => {
    // 初始化内存数据库
    await initDatabase(':memory:')
  })

  afterAll(() => {
    closeDatabase()
  })

  beforeEach(() => {
    // 每个测试前重置数据库
    resetDatabase()
  })

  describe('login（登录）', () => {
    it('应该使用正确的用户名和密码成功登录', async () => {
      // 默认管理员账户: admin / admin123
      const result = await login('admin', 'admin123')

      expect(result.success).toBe(true)
      expect(result.token).toBeDefined()
      expect(result.user).toBeDefined()
      expect(result.user?.username).toBe('admin')
    })

    it('应该在用户名错误时返回失败', async () => {
      const result = await login('wronguser', 'admin123')

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('USER_NOT_FOUND')
    })

    it('应该在密码错误时返回失败', async () => {
      const result = await login('admin', 'wrongpassword')

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('INVALID_CREDENTIALS')
    })

    it('应该在密码错误时显示剩余尝试次数', async () => {
      const result = await login('admin', 'wrongpassword')

      expect(result.success).toBe(false)
      expect(result.error).toContain('还剩')
      expect(result.error).toContain('次尝试机会')
    })

    it('应该在登录成功后更新最后登录时间', async () => {
      await login('admin', 'admin123')
      
      const user = findUserByUsername('admin')
      expect(user?.lastLogin).not.toBeNull()
    })
  })

  describe('账户锁定 (Account Locking) - 需求 1.2', () => {
    it('应该在连续 5 次登录失败后锁定账户', async () => {
      // 连续 5 次错误登录
      for (let i = 0; i < lockConfig.maxAttempts; i++) {
        await login('admin', 'wrongpassword')
      }

      // 检查账户锁定状态
      const lockStatus = checkAccountLock('admin')
      expect(lockStatus.isLocked).toBe(true)
      expect(lockStatus.remainingMinutes).toBeGreaterThan(0)
      expect(lockStatus.remainingMinutes).toBeLessThanOrEqual(lockConfig.lockDurationMinutes)
    })

    it('应该在账户锁定时拒绝登录', async () => {
      // 先锁定账户
      for (let i = 0; i < lockConfig.maxAttempts; i++) {
        await login('admin', 'wrongpassword')
      }

      // 尝试使用正确密码登录
      const result = await login('admin', 'admin123')

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('ACCOUNT_LOCKED')
      expect(result.lockInfo).toBeDefined()
    })

    it('应该在第 5 次失败时返回锁定信息', async () => {
      // 前 4 次失败
      for (let i = 0; i < lockConfig.maxAttempts - 1; i++) {
        await login('admin', 'wrongpassword')
      }

      // 第 5 次失败应该触发锁定
      const result = await login('admin', 'wrongpassword')

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('ACCOUNT_LOCKED')
      expect(result.error).toContain('锁定')
    })

    it('应该在登录成功后重置失败次数', async () => {
      // 先失败几次
      await login('admin', 'wrongpassword')
      await login('admin', 'wrongpassword')

      // 然后成功登录
      await login('admin', 'admin123')

      // 检查失败次数已重置
      const lockStatus = checkAccountLock('admin')
      expect(lockStatus.loginAttempts).toBe(0)
    })

    it('checkAccountLock 应该返回正确的锁定状态', () => {
      // 未锁定的账户
      const status = checkAccountLock('admin')
      
      expect(status.isLocked).toBe(false)
      expect(status.lockedUntil).toBeNull()
      expect(status.remainingMinutes).toBe(0)
    })

    it('checkAccountLock 对不存在的用户应该返回未锁定状态', () => {
      const status = checkAccountLock('nonexistent')
      
      expect(status.isLocked).toBe(false)
      expect(status.loginAttempts).toBe(0)
    })
  })

  describe('logout（登出）', () => {
    it('应该成功登出', async () => {
      // 先登录
      const loginResult = await login('admin', 'admin123')
      expect(loginResult.success).toBe(true)

      // 登出
      await expect(logout(loginResult.user!.id)).resolves.not.toThrow()
    })
  })

  describe('changePassword（修改密码）', () => {
    it('应该使用正确的旧密码成功修改密码', async () => {
      const result = await changePassword(1, 'admin123', 'newpassword123')

      expect(result.success).toBe(true)
    })

    it('应该在修改密码后能使用新密码登录', async () => {
      await changePassword(1, 'admin123', 'newpassword123')

      const loginResult = await login('admin', 'newpassword123')
      expect(loginResult.success).toBe(true)
    })

    it('应该在旧密码错误时返回失败', async () => {
      const result = await changePassword(1, 'wrongoldpassword', 'newpassword123')

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('INVALID_OLD_PASSWORD')
    })

    it('应该在新密码与旧密码相同时返回失败', async () => {
      const result = await changePassword(1, 'admin123', 'admin123')

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('SAME_PASSWORD')
    })

    it('应该在用户不存在时返回失败', async () => {
      const result = await changePassword(999, 'admin123', 'newpassword123')

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('USER_NOT_FOUND')
    })
  })

  describe('getUserProfile（获取用户信息）', () => {
    it('应该返回用户的公开信息', () => {
      const profile = getUserProfile(1)

      expect(profile).not.toBeNull()
      expect(profile?.id).toBe(1)
      expect(profile?.username).toBe('admin')
    })

    it('应该在用户不存在时返回 null', () => {
      const profile = getUserProfile(999)

      expect(profile).toBeNull()
    })

    it('不应该返回密码哈希等敏感信息', () => {
      const profile = getUserProfile(1)

      expect(profile).not.toHaveProperty('passwordHash')
      expect(profile).not.toHaveProperty('password_hash')
    })
  })

  describe('findUserByUsername（根据用户名查找用户）', () => {
    it('应该找到存在的用户', () => {
      const user = findUserByUsername('admin')

      expect(user).not.toBeNull()
      expect(user?.username).toBe('admin')
    })

    it('应该在用户不存在时返回 null', () => {
      const user = findUserByUsername('nonexistent')

      expect(user).toBeNull()
    })
  })
})
