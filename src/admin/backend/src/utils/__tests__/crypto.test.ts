/**
 * 加密工具模块单元测试
 * 测试密码加密和验证功能
 * 
 * 需求: 1.1 - 提供用户登录认证功能，支持用户名密码登录
 */

import { 
  hashPassword, 
  verifyPassword, 
  hashPasswordSync, 
  verifyPasswordSync 
} from '../crypto'

describe('crypto 加密工具模块', () => {
  describe('hashPassword（异步加密）', () => {
    it('应该返回一个 bcrypt 格式的哈希值', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)
      
      // bcrypt 哈希值以 $2a$ 或 $2b$ 开头
      expect(hash).toMatch(/^\$2[ab]\$/)
      // bcrypt 哈希值长度为 60 字符
      expect(hash.length).toBe(60)
    })

    it('相同密码每次加密应该产生不同的哈希值（因为盐值不同）', async () => {
      const password = 'samePassword'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)
      
      expect(hash1).not.toBe(hash2)
    })

    it('应该能处理空字符串', async () => {
      const hash = await hashPassword('')
      expect(hash).toMatch(/^\$2[ab]\$/)
    })

    it('应该能处理特殊字符', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?'
      const hash = await hashPassword(password)
      expect(hash).toMatch(/^\$2[ab]\$/)
    })

    it('应该能处理中文密码', async () => {
      const password = '中文密码测试'
      const hash = await hashPassword(password)
      expect(hash).toMatch(/^\$2[ab]\$/)
    })
  })

  describe('verifyPassword（异步验证）', () => {
    it('正确的密码应该验证通过', async () => {
      const password = 'correctPassword'
      const hash = await hashPassword(password)
      
      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(true)
    })

    it('错误的密码应该验证失败', async () => {
      const password = 'correctPassword'
      const wrongPassword = 'wrongPassword'
      const hash = await hashPassword(password)
      
      const isValid = await verifyPassword(wrongPassword, hash)
      expect(isValid).toBe(false)
    })

    it('大小写敏感 - 不同大小写应该验证失败', async () => {
      const password = 'CaseSensitive'
      const hash = await hashPassword(password)
      
      const isValid = await verifyPassword('casesensitive', hash)
      expect(isValid).toBe(false)
    })

    it('空格敏感 - 带空格和不带空格应该验证失败', async () => {
      const password = 'password with spaces'
      const hash = await hashPassword(password)
      
      const isValid = await verifyPassword('passwordwithspaces', hash)
      expect(isValid).toBe(false)
    })
  })

  describe('hashPasswordSync（同步加密）', () => {
    it('应该返回一个 bcrypt 格式的哈希值', () => {
      const password = 'syncTestPassword'
      const hash = hashPasswordSync(password)
      
      expect(hash).toMatch(/^\$2[ab]\$/)
      expect(hash.length).toBe(60)
    })

    it('相同密码每次加密应该产生不同的哈希值', () => {
      const password = 'samePassword'
      const hash1 = hashPasswordSync(password)
      const hash2 = hashPasswordSync(password)
      
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verifyPasswordSync（同步验证）', () => {
    it('正确的密码应该验证通过', () => {
      const password = 'syncCorrectPassword'
      const hash = hashPasswordSync(password)
      
      const isValid = verifyPasswordSync(password, hash)
      expect(isValid).toBe(true)
    })

    it('错误的密码应该验证失败', () => {
      const password = 'syncCorrectPassword'
      const wrongPassword = 'syncWrongPassword'
      const hash = hashPasswordSync(password)
      
      const isValid = verifyPasswordSync(wrongPassword, hash)
      expect(isValid).toBe(false)
    })
  })

  describe('异步和同步版本的互操作性', () => {
    it('同步加密的哈希值应该能被异步验证', async () => {
      const password = 'interopTest'
      const hash = hashPasswordSync(password)
      
      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(true)
    })

    it('异步加密的哈希值应该能被同步验证', async () => {
      const password = 'interopTest'
      const hash = await hashPassword(password)
      
      const isValid = verifyPasswordSync(password, hash)
      expect(isValid).toBe(true)
    })
  })

  describe('默认管理员密码测试', () => {
    it('默认密码 admin123 应该能正确加密和验证', async () => {
      const defaultPassword = 'admin123'
      const hash = await hashPassword(defaultPassword)
      
      const isValid = await verifyPassword(defaultPassword, hash)
      expect(isValid).toBe(true)
    })

    it('同步版本：默认密码 admin123 应该能正确加密和验证', () => {
      const defaultPassword = 'admin123'
      const hash = hashPasswordSync(defaultPassword)
      
      const isValid = verifyPasswordSync(defaultPassword, hash)
      expect(isValid).toBe(true)
    })
  })
})
