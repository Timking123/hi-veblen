/**
 * 认证中间件单元测试
 * 
 * 测试 authMiddleware 和 optionalAuthMiddleware 的各种场景
 */

import { Request, Response, NextFunction } from 'express'
import { authMiddleware, optionalAuthMiddleware, extractBearerToken } from '../auth'
import { generateToken } from '../../utils/jwt'
import { jwtConfig } from '../../config/jwt'
import jwt from 'jsonwebtoken'

// 模拟 Request 对象
function createMockRequest(authHeader?: string): Partial<Request> {
  return {
    headers: authHeader ? { authorization: authHeader } : {}
  }
}

// 模拟 Response 对象
function createMockResponse(): Partial<Response> & { 
  statusCode?: number
  jsonData?: unknown
} {
  const res: Partial<Response> & { statusCode?: number; jsonData?: unknown } = {
    statusCode: undefined,
    jsonData: undefined
  }
  
  res.status = jest.fn().mockImplementation((code: number) => {
    res.statusCode = code
    return res
  })
  
  res.json = jest.fn().mockImplementation((data: unknown) => {
    res.jsonData = data
    return res
  })
  
  return res
}

// 模拟 NextFunction
function createMockNext(): NextFunction & { called: boolean } {
  const next = jest.fn() as NextFunction & { called: boolean }
  next.called = false
  ;(next as jest.Mock).mockImplementation(() => {
    next.called = true
  })
  return next
}

describe('extractBearerToken（提取 Bearer Token）', () => {
  test('应该正确提取有效的 Bearer Token', () => {
    const token = extractBearerToken('Bearer abc123')
    expect(token).toBe('abc123')
  })

  test('应该处理 bearer 小写', () => {
    const token = extractBearerToken('bearer abc123')
    expect(token).toBe('abc123')
  })

  test('应该处理 BEARER 大写', () => {
    const token = extractBearerToken('BEARER abc123')
    expect(token).toBe('abc123')
  })

  test('应该返回 null 当 Authorization 头为空', () => {
    const token = extractBearerToken(undefined)
    expect(token).toBeNull()
  })

  test('应该返回 null 当格式不是 Bearer', () => {
    const token = extractBearerToken('Basic abc123')
    expect(token).toBeNull()
  })

  test('应该返回 null 当只有 Bearer 没有 Token', () => {
    const token = extractBearerToken('Bearer ')
    expect(token).toBeNull()
  })

  test('应该返回 null 当 Token 为空字符串', () => {
    const token = extractBearerToken('Bearer    ')
    expect(token).toBeNull()
  })

  test('应该返回 null 当格式有多余空格', () => {
    const token = extractBearerToken('Bearer abc 123')
    expect(token).toBeNull()
  })
})

describe('authMiddleware（认证中间件）', () => {
  describe('未提供 Token', () => {
    test('应该返回 401 和 "未提供认证令牌" 消息', () => {
      const req = createMockRequest() as Request
      const res = createMockResponse() as Response
      const next = createMockNext()

      authMiddleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect((res as any).jsonData).toEqual({
        code: 401,
        message: '未提供认证令牌',
        details: { reason: 'missing_token' }
      })
      expect(next.called).toBe(false)
    })
  })

  describe('Token 格式错误', () => {
    test('应该返回 401 当使用 Basic 认证', () => {
      const req = createMockRequest('Basic abc123') as Request
      const res = createMockResponse() as Response
      const next = createMockNext()

      authMiddleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect((res as any).jsonData).toEqual({
        code: 401,
        message: '认证令牌格式无效',
        details: { reason: 'invalid_format' }
      })
      expect(next.called).toBe(false)
    })

    test('应该返回 401 当 Token 为空', () => {
      const req = createMockRequest('Bearer ') as Request
      const res = createMockResponse() as Response
      const next = createMockNext()

      authMiddleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect((res as any).jsonData.message).toBe('认证令牌格式无效')
      expect(next.called).toBe(false)
    })
  })

  describe('Token 已过期', () => {
    test('应该返回 401 和 "认证令牌已过期" 消息', () => {
      // 创建一个已过期的 Token
      const expiredToken = jwt.sign(
        { userId: 1, username: 'admin' },
        jwtConfig.secret,
        { expiresIn: '-1s' } // 已过期
      )

      const req = createMockRequest(`Bearer ${expiredToken}`) as Request
      const res = createMockResponse() as Response
      const next = createMockNext()

      authMiddleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect((res as any).jsonData).toEqual({
        code: 401,
        message: '认证令牌已过期',
        details: { reason: 'token_expired' }
      })
      expect(next.called).toBe(false)
    })
  })

  describe('Token 签名无效', () => {
    test('应该返回 401 当 Token 使用错误密钥签名', () => {
      // 使用错误的密钥签名
      // 注意：verifyToken 将签名无效的错误归类为 'malformed'，因为错误消息包含 'invalid'
      const invalidToken = jwt.sign(
        { userId: 1, username: 'admin' },
        'wrong-secret-key',
        { expiresIn: '1h' }
      )

      const req = createMockRequest(`Bearer ${invalidToken}`) as Request
      const res = createMockResponse() as Response
      const next = createMockNext()

      authMiddleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      // verifyToken 将 'invalid signature' 错误归类为 'malformed' 类型
      expect((res as any).jsonData.message).toBe('认证令牌格式无效')
      expect(next.called).toBe(false)
    })

    test('应该返回 401 当 Token 格式损坏', () => {
      const req = createMockRequest('Bearer invalid.token.format') as Request
      const res = createMockResponse() as Response
      const next = createMockNext()

      authMiddleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(next.called).toBe(false)
    })
  })

  describe('Token 有效', () => {
    test('应该调用 next() 并将用户信息附加到 req.user', () => {
      const validToken = generateToken({ userId: 1, username: 'admin' })

      const req = createMockRequest(`Bearer ${validToken}`) as Request
      const res = createMockResponse() as Response
      const next = createMockNext()

      authMiddleware(req, res, next)

      expect(next.called).toBe(true)
      expect(req.user).toBeDefined()
      expect(req.user?.userId).toBe(1)
      expect(req.user?.username).toBe('admin')
    })

    test('应该正确处理包含特殊字符的用户名', () => {
      const validToken = generateToken({ userId: 2, username: 'user@example.com' })

      const req = createMockRequest(`Bearer ${validToken}`) as Request
      const res = createMockResponse() as Response
      const next = createMockNext()

      authMiddleware(req, res, next)

      expect(next.called).toBe(true)
      expect(req.user?.username).toBe('user@example.com')
    })
  })
})

describe('optionalAuthMiddleware（可选认证中间件）', () => {
  describe('未提供 Token', () => {
    test('应该调用 next() 且 req.user 为 undefined', () => {
      const req = createMockRequest() as Request
      const res = createMockResponse() as Response
      const next = createMockNext()

      optionalAuthMiddleware(req, res, next)

      expect(next.called).toBe(true)
      expect(req.user).toBeUndefined()
    })
  })

  describe('Token 格式错误', () => {
    test('应该调用 next() 且 req.user 为 undefined', () => {
      const req = createMockRequest('Basic abc123') as Request
      const res = createMockResponse() as Response
      const next = createMockNext()

      optionalAuthMiddleware(req, res, next)

      expect(next.called).toBe(true)
      expect(req.user).toBeUndefined()
    })
  })

  describe('Token 已过期', () => {
    test('应该调用 next() 且 req.user 为 undefined', () => {
      const expiredToken = jwt.sign(
        { userId: 1, username: 'admin' },
        jwtConfig.secret,
        { expiresIn: '-1s' }
      )

      const req = createMockRequest(`Bearer ${expiredToken}`) as Request
      const res = createMockResponse() as Response
      const next = createMockNext()

      optionalAuthMiddleware(req, res, next)

      expect(next.called).toBe(true)
      expect(req.user).toBeUndefined()
    })
  })

  describe('Token 签名无效', () => {
    test('应该调用 next() 且 req.user 为 undefined', () => {
      const invalidToken = jwt.sign(
        { userId: 1, username: 'admin' },
        'wrong-secret-key',
        { expiresIn: '1h' }
      )

      const req = createMockRequest(`Bearer ${invalidToken}`) as Request
      const res = createMockResponse() as Response
      const next = createMockNext()

      optionalAuthMiddleware(req, res, next)

      expect(next.called).toBe(true)
      expect(req.user).toBeUndefined()
    })
  })

  describe('Token 有效', () => {
    test('应该调用 next() 并将用户信息附加到 req.user', () => {
      const validToken = generateToken({ userId: 1, username: 'admin' })

      const req = createMockRequest(`Bearer ${validToken}`) as Request
      const res = createMockResponse() as Response
      const next = createMockNext()

      optionalAuthMiddleware(req, res, next)

      expect(next.called).toBe(true)
      expect(req.user).toBeDefined()
      expect(req.user?.userId).toBe(1)
      expect(req.user?.username).toBe('admin')
    })
  })
})
