/**
 * 认证服务属性测试（Property-Based Testing）
 * 使用 fast-check 库测试认证相关的正确性属性
 * 
 * **Feature: admin-system**
 * - Property 1: JWT Token 往返一致性
 * - Property 2: 账户锁定逻辑正确性
 * 
 * **Validates: Requirements 1.2, 1.3**
 */

import * as fc from 'fast-check'
import { generateToken, verifyToken } from '../utils/jwt'
import { initDatabase, resetDatabase, closeDatabase } from '../database/init'
import { login, findUserByUsername, checkAccountLock, lockConfig } from '../services/auth'
import { hashPasswordSync } from '../utils/crypto'
import { getDatabase } from '../database/init'

describe('认证服务属性测试 (Auth Service Property Tests)', () => {
  // 在所有测试前初始化数据库
  beforeAll(async () => {
    await initDatabase(':memory:')
  })

  // 在所有测试后关闭数据库
  afterAll(() => {
    closeDatabase()
  })

  // 在每个测试前重置数据库
  beforeEach(() => {
    resetDatabase()
  })

  describe('Property 1: JWT Token 往返一致性', () => {
    /**
     * 测试属性：对于任意有效的用户信息，生成 JWT Token 后再验证解析，
     * 应该得到相同的用户信息（userId 和 username）
     * 
     * **Validates: Requirements 1.3**
     */
    it('应该对任意有效用户信息保持往返一致性', () => {
      // 定义用户信息生成器
      const userInfoArbitrary = fc.record({
        userId: fc.integer({ min: 1, max: 1000000 }), // 用户 ID：正整数
        username: fc.string({ minLength: 1, maxLength: 50 }).filter(s => {
          // 过滤掉只包含空白字符的字符串
          return s.trim().length > 0
        })
      })

      // 属性测试：生成 Token 后验证，应该得到相同的用户信息
      fc.assert(
        fc.property(userInfoArbitrary, (userInfo) => {
          // 1. 生成 JWT Token
          const token = generateToken({
            userId: userInfo.userId,
            username: userInfo.username
          })

          // 2. 验证并解析 Token
          const verifyResult = verifyToken(token)

          // 3. 验证结果应该有效
          expect(verifyResult.valid).toBe(true)
          expect(verifyResult.payload).toBeDefined()

          // 4. 解析后的用户信息应该与原始信息一致
          if (verifyResult.payload) {
            expect(verifyResult.payload.userId).toBe(userInfo.userId)
            expect(verifyResult.payload.username).toBe(userInfo.username)
            
            // 5. Token 应该包含标准的 JWT 字段
            expect(verifyResult.payload.iat).toBeDefined() // 签发时间
            expect(verifyResult.payload.exp).toBeDefined() // 过期时间
            expect(verifyResult.payload.iss).toBeDefined() // 签发者
            expect(verifyResult.payload.aud).toBeDefined() // 受众
            
            // 6. 过期时间应该在签发时间之后
            expect(verifyResult.payload.exp!).toBeGreaterThan(verifyResult.payload.iat!)
          }
        }),
        {
          numRuns: 100, // 最少 100 次迭代
          verbose: true // 显示详细信息
        }
      )
    })

    /**
     * 测试边界情况：极端的用户 ID 值
     */
    it('应该处理极端的用户 ID 值', () => {
      const extremeUserIdArbitrary = fc.record({
        userId: fc.oneof(
          fc.constant(1), // 最小值
          fc.constant(Number.MAX_SAFE_INTEGER), // JavaScript 最大安全整数
          fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER })
        ),
        username: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
      })

      fc.assert(
        fc.property(extremeUserIdArbitrary, (userInfo) => {
          const token = generateToken(userInfo)
          const verifyResult = verifyToken(token)

          expect(verifyResult.valid).toBe(true)
          expect(verifyResult.payload?.userId).toBe(userInfo.userId)
          expect(verifyResult.payload?.username).toBe(userInfo.username)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 测试边界情况：各种长度的用户名
     */
    it('应该处理各种长度的用户名', () => {
      const variableLengthUsernameArbitrary = fc.record({
        userId: fc.integer({ min: 1, max: 1000000 }),
        username: fc.oneof(
          fc.constant('a'), // 单字符
          fc.string({ minLength: 1, maxLength: 10 }), // 短用户名
          fc.string({ minLength: 10, maxLength: 30 }), // 中等长度
          fc.string({ minLength: 30, maxLength: 50 }) // 长用户名
        ).filter(s => s.trim().length > 0)
      })

      fc.assert(
        fc.property(variableLengthUsernameArbitrary, (userInfo) => {
          const token = generateToken(userInfo)
          const verifyResult = verifyToken(token)

          expect(verifyResult.valid).toBe(true)
          expect(verifyResult.payload?.userId).toBe(userInfo.userId)
          expect(verifyResult.payload?.username).toBe(userInfo.username)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 测试特殊字符：用户名包含特殊字符
     */
    it('应该处理包含特殊字符的用户名', () => {
      const specialCharUsernameArbitrary = fc.record({
        userId: fc.integer({ min: 1, max: 1000000 }),
        username: fc.oneof(
          fc.constant('user@example.com'), // 邮箱格式
          fc.constant('user-name_123'), // 连字符和下划线
          fc.constant('用户名'), // 中文
          fc.constant('ユーザー'), // 日文
          fc.constant('사용자'), // 韩文
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
        )
      })

      fc.assert(
        fc.property(specialCharUsernameArbitrary, (userInfo) => {
          const token = generateToken(userInfo)
          const verifyResult = verifyToken(token)

          expect(verifyResult.valid).toBe(true)
          expect(verifyResult.payload?.userId).toBe(userInfo.userId)
          expect(verifyResult.payload?.username).toBe(userInfo.username)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 测试不变性：多次生成和验证应该保持一致
     */
    it('应该在多次往返后保持一致性', () => {
      const userInfoArbitrary = fc.record({
        userId: fc.integer({ min: 1, max: 1000000 }),
        username: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
      })

      fc.assert(
        fc.property(userInfoArbitrary, (userInfo) => {
          // 第一次往返
          const token1 = generateToken(userInfo)
          const result1 = verifyToken(token1)

          // 第二次往返（使用相同的用户信息）
          const token2 = generateToken(userInfo)
          const result2 = verifyToken(token2)

          // 两次验证结果都应该有效
          expect(result1.valid).toBe(true)
          expect(result2.valid).toBe(true)

          // 两次解析的用户信息应该相同
          expect(result1.payload?.userId).toBe(userInfo.userId)
          expect(result1.payload?.username).toBe(userInfo.username)
          expect(result2.payload?.userId).toBe(userInfo.userId)
          expect(result2.payload?.username).toBe(userInfo.username)

          // 注意：token1 和 token2 可能不同（因为 iat 不同），但解析结果应该一致
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 测试 Token 的独立性：不同用户信息生成的 Token 应该不同
     */
    it('不同的用户信息应该生成不同的 Token', () => {
      const twoUsersArbitrary = fc.tuple(
        fc.record({
          userId: fc.integer({ min: 1, max: 1000000 }),
          username: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
        }),
        fc.record({
          userId: fc.integer({ min: 1, max: 1000000 }),
          username: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
        })
      ).filter(([user1, user2]) => {
        // 确保两个用户信息不同
        return user1.userId !== user2.userId || user1.username !== user2.username
      })

      fc.assert(
        fc.property(twoUsersArbitrary, ([user1, user2]) => {
          const token1 = generateToken(user1)
          const token2 = generateToken(user2)

          // 不同的用户信息应该生成不同的 Token
          // 注意：由于 iat 可能相同（在同一毫秒内生成），我们通过验证解析结果来确认
          const result1 = verifyToken(token1)
          const result2 = verifyToken(token2)

          expect(result1.valid).toBe(true)
          expect(result2.valid).toBe(true)

          // 解析结果应该与原始用户信息对应
          expect(result1.payload?.userId).toBe(user1.userId)
          expect(result1.payload?.username).toBe(user1.username)
          expect(result2.payload?.userId).toBe(user2.userId)
          expect(result2.payload?.username).toBe(user2.username)

          // 如果用户信息不同，解析结果也应该不同
          const sameUserId = result1.payload?.userId === result2.payload?.userId
          const sameUsername = result1.payload?.username === result2.payload?.username
          expect(sameUserId && sameUsername).toBe(false)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 2: 账户锁定逻辑正确性', () => {
    /**
     * 辅助函数：创建测试用户
     */
    function createTestUser(username: string, password: string): void {
      const db = getDatabase()
      const passwordHash = hashPasswordSync(password)
      db.run(`
        INSERT INTO users (username, password_hash, login_attempts, locked_until)
        VALUES (?, ?, 0, NULL)
      `, [username, passwordHash])
    }

    /**
     * 测试属性：对于任意账户，连续 5 次登录失败后，该账户应该被锁定，
     * 在锁定期间内的登录尝试应该被拒绝
     * 
     * **Validates: Requirements 1.2**
     */
    it('应该在连续 5 次登录失败后锁定账户', async () => {
      // 定义用户名和密码生成器
      const userCredentialsArbitrary = fc.record({
        username: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length >= 3),
        correctPassword: fc.string({ minLength: 6, maxLength: 20 }),
        wrongPassword: fc.string({ minLength: 6, maxLength: 20 })
      }).filter(creds => creds.correctPassword !== creds.wrongPassword)

      await fc.assert(
        fc.asyncProperty(userCredentialsArbitrary, async (creds) => {
          // 1. 创建测试用户
          createTestUser(creds.username, creds.correctPassword)

          // 2. 连续尝试 5 次错误密码登录
          for (let i = 0; i < lockConfig.maxAttempts; i++) {
            const result = await login(creds.username, creds.wrongPassword)
            
            // 前 4 次应该返回密码错误
            if (i < lockConfig.maxAttempts - 1) {
              expect(result.success).toBe(false)
              expect(result.errorCode).toBe('INVALID_CREDENTIALS')
            } else {
              // 第 5 次应该返回账户锁定
              expect(result.success).toBe(false)
              expect(result.errorCode).toBe('ACCOUNT_LOCKED')
              expect(result.lockInfo).toBeDefined()
              expect(result.lockInfo?.remainingMinutes).toBe(lockConfig.lockDurationMinutes)
            }
          }

          // 3. 验证账户确实被锁定
          const lockStatus = checkAccountLock(creds.username)
          expect(lockStatus.isLocked).toBe(true)
          expect(lockStatus.lockedUntil).not.toBeNull()
          expect(lockStatus.remainingMinutes).toBeGreaterThan(0)
          expect(lockStatus.remainingMinutes).toBeLessThanOrEqual(lockConfig.lockDurationMinutes)

          // 4. 在锁定期间，即使使用正确密码也应该被拒绝
          const lockedLoginResult = await login(creds.username, creds.correctPassword)
          expect(lockedLoginResult.success).toBe(false)
          expect(lockedLoginResult.errorCode).toBe('ACCOUNT_LOCKED')

          // 5. 验证登录失败次数
          const user = findUserByUsername(creds.username)
          expect(user).not.toBeNull()
          expect(user!.loginAttempts).toBe(lockConfig.maxAttempts)
        }),
        {
          numRuns: 100, // 最少 100 次迭代
          verbose: true
        }
      )
    })

    /**
     * 测试属性：锁定时间应该准确为 15 分钟
     */
    it('锁定时间应该准确为配置的时长', async () => {
      const userCredentialsArbitrary = fc.record({
        username: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length >= 3),
        correctPassword: fc.string({ minLength: 6, maxLength: 20 }),
        wrongPassword: fc.string({ minLength: 6, maxLength: 20 })
      }).filter(creds => creds.correctPassword !== creds.wrongPassword)

      await fc.assert(
        fc.asyncProperty(userCredentialsArbitrary, async (creds) => {
          // 创建测试用户
          createTestUser(creds.username, creds.correctPassword)

          // 记录开始时间
          const startTime = new Date()

          // 连续 5 次错误登录触发锁定
          for (let i = 0; i < lockConfig.maxAttempts; i++) {
            await login(creds.username, creds.wrongPassword)
          }

          // 检查锁定状态
          const lockStatus = checkAccountLock(creds.username)
          expect(lockStatus.isLocked).toBe(true)

          // 验证锁定时间
          const lockedUntilDate = new Date(lockStatus.lockedUntil!)
          const lockDurationMs = lockedUntilDate.getTime() - startTime.getTime()
          const lockDurationMinutes = lockDurationMs / (1000 * 60)

          // 锁定时长应该接近配置的时长（允许几秒误差）
          expect(lockDurationMinutes).toBeGreaterThanOrEqual(lockConfig.lockDurationMinutes - 0.1)
          expect(lockDurationMinutes).toBeLessThanOrEqual(lockConfig.lockDurationMinutes + 0.1)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 测试属性：不同账户的锁定状态应该独立
     */
    it('不同账户的锁定状态应该相互独立', async () => {
      const twoUsersArbitrary = fc.tuple(
        fc.record({
          username: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length >= 3),
          password: fc.string({ minLength: 6, maxLength: 20 })
        }),
        fc.record({
          username: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length >= 3),
          password: fc.string({ minLength: 6, maxLength: 20 })
        })
      ).filter(([user1, user2]) => user1.username !== user2.username)

      await fc.assert(
        fc.asyncProperty(twoUsersArbitrary, async ([user1, user2]) => {
          // 创建两个测试用户
          createTestUser(user1.username, user1.password)
          createTestUser(user2.username, user2.password)

          // 只锁定第一个用户
          for (let i = 0; i < lockConfig.maxAttempts; i++) {
            await login(user1.username, 'wrong_password')
          }

          // 验证第一个用户被锁定
          const lockStatus1 = checkAccountLock(user1.username)
          expect(lockStatus1.isLocked).toBe(true)

          // 验证第二个用户未被锁定
          const lockStatus2 = checkAccountLock(user2.username)
          expect(lockStatus2.isLocked).toBe(false)

          // 第二个用户应该能够正常登录
          const loginResult2 = await login(user2.username, user2.password)
          expect(loginResult2.success).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 测试属性：登录成功后应该重置失败次数
     */
    it('登录成功后应该重置失败次数和锁定状态', async () => {
      const userCredentialsArbitrary = fc.record({
        username: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length >= 3),
        correctPassword: fc.string({ minLength: 6, maxLength: 20 }),
        wrongPassword: fc.string({ minLength: 6, maxLength: 20 }),
        failureCount: fc.integer({ min: 1, max: lockConfig.maxAttempts - 1 })
      }).filter(creds => creds.correctPassword !== creds.wrongPassword)

      await fc.assert(
        fc.asyncProperty(userCredentialsArbitrary, async (creds) => {
          // 创建测试用户
          createTestUser(creds.username, creds.correctPassword)

          // 尝试若干次错误登录（但不触发锁定）
          for (let i = 0; i < creds.failureCount; i++) {
            await login(creds.username, creds.wrongPassword)
          }

          // 验证失败次数已增加
          let user = findUserByUsername(creds.username)
          expect(user!.loginAttempts).toBe(creds.failureCount)

          // 使用正确密码登录
          const loginResult = await login(creds.username, creds.correctPassword)
          expect(loginResult.success).toBe(true)

          // 验证失败次数已重置
          user = findUserByUsername(creds.username)
          expect(user!.loginAttempts).toBe(0)
          expect(user!.lockedUntil).toBeNull()

          // 验证锁定状态已清除
          const lockStatus = checkAccountLock(creds.username)
          expect(lockStatus.isLocked).toBe(false)
          expect(lockStatus.loginAttempts).toBe(0)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 测试属性：在锁定期间的任何登录尝试都应该被拒绝
     */
    it('在锁定期间的任何登录尝试都应该被拒绝', async () => {
      const userCredentialsArbitrary = fc.record({
        username: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length >= 3),
        correctPassword: fc.string({ minLength: 6, maxLength: 20 }),
        wrongPassword: fc.string({ minLength: 6, maxLength: 20 }),
        attemptsDuringLock: fc.integer({ min: 1, max: 5 })
      }).filter(creds => creds.correctPassword !== creds.wrongPassword)

      await fc.assert(
        fc.asyncProperty(userCredentialsArbitrary, async (creds) => {
          // 创建测试用户
          createTestUser(creds.username, creds.correctPassword)

          // 触发账户锁定
          for (let i = 0; i < lockConfig.maxAttempts; i++) {
            await login(creds.username, creds.wrongPassword)
          }

          // 在锁定期间尝试多次登录（使用正确和错误密码）
          for (let i = 0; i < creds.attemptsDuringLock; i++) {
            // 交替使用正确和错误密码
            const password = i % 2 === 0 ? creds.correctPassword : creds.wrongPassword
            const result = await login(creds.username, password)

            // 所有尝试都应该被拒绝
            expect(result.success).toBe(false)
            expect(result.errorCode).toBe('ACCOUNT_LOCKED')
            expect(result.lockInfo).toBeDefined()
          }

          // 验证账户仍然被锁定
          const lockStatus = checkAccountLock(creds.username)
          expect(lockStatus.isLocked).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 测试边界情况：恰好 4 次失败不应该锁定账户
     */
    it('恰好 4 次登录失败不应该锁定账户', async () => {
      const userCredentialsArbitrary = fc.record({
        username: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length >= 3),
        correctPassword: fc.string({ minLength: 6, maxLength: 20 }),
        wrongPassword: fc.string({ minLength: 6, maxLength: 20 })
      }).filter(creds => creds.correctPassword !== creds.wrongPassword)

      await fc.assert(
        fc.asyncProperty(userCredentialsArbitrary, async (creds) => {
          // 创建测试用户
          createTestUser(creds.username, creds.correctPassword)

          // 尝试 4 次错误登录
          for (let i = 0; i < lockConfig.maxAttempts - 1; i++) {
            const result = await login(creds.username, creds.wrongPassword)
            expect(result.success).toBe(false)
            expect(result.errorCode).toBe('INVALID_CREDENTIALS')
          }

          // 验证账户未被锁定
          const lockStatus = checkAccountLock(creds.username)
          expect(lockStatus.isLocked).toBe(false)

          // 应该还能使用正确密码登录
          const loginResult = await login(creds.username, creds.correctPassword)
          expect(loginResult.success).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 测试边界情况：第 5 次失败应该立即锁定
     */
    it('第 5 次登录失败应该立即锁定账户', async () => {
      const userCredentialsArbitrary = fc.record({
        username: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length >= 3),
        correctPassword: fc.string({ minLength: 6, maxLength: 20 }),
        wrongPassword: fc.string({ minLength: 6, maxLength: 20 })
      }).filter(creds => creds.correctPassword !== creds.wrongPassword)

      await fc.assert(
        fc.asyncProperty(userCredentialsArbitrary, async (creds) => {
          // 创建测试用户
          createTestUser(creds.username, creds.correctPassword)

          // 前 4 次失败
          for (let i = 0; i < lockConfig.maxAttempts - 1; i++) {
            await login(creds.username, creds.wrongPassword)
          }

          // 第 5 次失败应该触发锁定
          const fifthAttempt = await login(creds.username, creds.wrongPassword)
          expect(fifthAttempt.success).toBe(false)
          expect(fifthAttempt.errorCode).toBe('ACCOUNT_LOCKED')

          // 立即验证账户已被锁定
          const lockStatus = checkAccountLock(creds.username)
          expect(lockStatus.isLocked).toBe(true)
          expect(lockStatus.loginAttempts).toBe(lockConfig.maxAttempts)
        }),
        { numRuns: 100 }
      )
    })
  })
})
