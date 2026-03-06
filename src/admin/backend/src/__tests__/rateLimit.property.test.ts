/**
 * 请求限流属性测试（Property-Based Testing）
 * 使用 fast-check 库测试 API 请求限流的正确性属性
 * 
 * **Feature: project-audit-upgrade**
 * - Property 3: 请求限流正确性
 * - Property 4: 限流响应头完整性
 * 
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
 */

import * as fc from 'fast-check'
import request from 'supertest'
import express, { Express, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'

// ========== 测试辅助函数 ==========

/**
 * 解析 RateLimit 响应头（draft-7 标准）
 * 格式：limit=10, remaining=9, reset=5
 */
function parseRateLimitHeader(header: string | undefined): {
  limit: number
  remaining: number
  reset: number
} | null {
  if (!header) return null
  
  const parts = header.split(',').map(p => p.trim())
  const result: any = {}
  
  for (const part of parts) {
    const [key, value] = part.split('=').map(s => s.trim())
    result[key] = parseInt(value)
  }
  
  return {
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset
  }
}

/**
 * 创建测试用的 Express 应用
 * 配置指定的限流规则
 */
function createTestApp(windowMs: number, max: number): Express {
  const app = express()
  
  // 配置限流中间件（禁用验证以避免测试环境警告）
  const limiter = rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-7', // 使用标准的 RateLimit-* 响应头
    legacyHeaders: false,
    skipFailedRequests: false,
    skipSuccessfulRequests: false,
    validate: false, // 禁用验证
    message: {
      success: false,
      message: '请求过于频繁，请稍后再试'
    },
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        message: '请求过于频繁，请稍后再试'
      })
    }
  })
  
  // 应用限流中间件
  app.use(limiter)
  
  // 测试路由
  app.get('/test', (_req: Request, res: Response) => {
    res.status(200).json({ success: true, message: 'OK' })
  })
  
  return app
}

/**
 * 发送测试请求
 */
async function makeRequest(app: Express) {
  return request(app).get('/test')
}

/**
 * 等待指定毫秒数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ========== 测试套件 ==========

describe('Property 3: 请求限流正确性', () => {
  /**
   * 属性 3a：在窗口时间内，请求数不超过最大值时应全部通过
   * 
   * **Validates: Requirements 4.1, 4.2, 4.3**
   */
  it('在限制内的请求应全部通过', async () => {
    const rateLimitConfigArb = fc.record({
      windowMs: fc.constant(5000),
      max: fc.integer({ min: 1, max: 10 }),
      requestCount: fc.integer({ min: 1, max: 10 })
    }).filter(config => config.requestCount <= config.max)
    
    await fc.assert(
      fc.asyncProperty(rateLimitConfigArb, async (config) => {
        const app = createTestApp(config.windowMs, config.max)
        
        for (let i = 0; i < config.requestCount; i++) {
          const response = await makeRequest(app)
          expect(response.status).toBe(200)
          expect(response.body.success).toBe(true)
        }
      }),
      { numRuns: 50, timeout: 30000 }
    )
  }, 60000)

  /**
   * 属性 3b：超过最大值后的请求应返回 HTTP 429
   * 
   * **Validates: Requirements 4.1, 4.2, 4.3**
   */
  it('超过限制的请求应返回 429', async () => {
    const rateLimitConfigArb = fc.record({
      windowMs: fc.constant(5000),
      max: fc.integer({ min: 2, max: 5 }),
      extraRequests: fc.integer({ min: 1, max: 3 })
    })
    
    await fc.assert(
      fc.asyncProperty(rateLimitConfigArb, async (config) => {
        const app = createTestApp(config.windowMs, config.max)
        
        // 发送最大数量的请求
        for (let i = 0; i < config.max; i++) {
          const response = await makeRequest(app)
          expect(response.status).toBe(200)
        }
        
        // 发送超出限制的请求
        for (let i = 0; i < config.extraRequests; i++) {
          const response = await makeRequest(app)
          expect(response.status).toBe(429)
          expect(response.body.success).toBe(false)
          expect(response.body.message).toContain('请求过于频繁')
        }
      }),
      { numRuns: 50, timeout: 30000 }
    )
  }, 60000)

  /**
   * 属性 3c：窗口重置后应该可以继续请求
   * 
   * **Validates: Requirements 4.1**
   */
  it('窗口重置后应该可以继续请求', async () => {
    const configArb = fc.record({
      windowMs: fc.constant(2000), // 2 秒窗口
      max: fc.integer({ min: 2, max: 3 })
    })
    
    await fc.assert(
      fc.asyncProperty(configArb, async (config) => {
        const app = createTestApp(config.windowMs, config.max)
        
        // 用完第一个窗口的配额
        for (let i = 0; i < config.max; i++) {
          const response = await makeRequest(app)
          expect(response.status).toBe(200)
        }
        
        // 下一个请求应该被限流
        const blockedResponse = await makeRequest(app)
        expect(blockedResponse.status).toBe(429)
        
        // 等待窗口重置
        await sleep(config.windowMs + 500)
        
        // 窗口重置后应该可以继续请求
        const afterResetResponse = await makeRequest(app)
        expect(afterResetResponse.status).toBe(200)
      }),
      { numRuns: 20, timeout: 30000 }
    )
  }, 90000)
})

describe('Property 4: 限流响应头完整性', () => {
  /**
   * 属性 4a：所有响应都应包含完整的限流响应头
   * 
   * **Validates: Requirements 4.4**
   */
  it('所有响应都应包含完整的限流响应头', async () => {
    const configArb = fc.record({
      windowMs: fc.constant(5000),
      max: fc.integer({ min: 3, max: 10 })
    })
    
    await fc.assert(
      fc.asyncProperty(configArb, async (config) => {
        const app = createTestApp(config.windowMs, config.max)
        const response = await makeRequest(app)
        
        // 验证响应头存在（draft-7 标准使用单个 ratelimit 响应头）
        expect(response.headers['ratelimit']).toBeDefined()
        
        // 解析响应头
        const rateLimit = parseRateLimitHeader(response.headers['ratelimit'])
        expect(rateLimit).not.toBeNull()
        
        // 验证响应头值
        expect(Number.isInteger(rateLimit!.limit)).toBe(true)
        expect(Number.isInteger(rateLimit!.remaining)).toBe(true)
        expect(Number.isInteger(rateLimit!.reset)).toBe(true)
      }),
      { numRuns: 50, timeout: 30000 }
    )
  }, 60000)

  /**
   * 属性 4b：RateLimit-Limit 应该等于配置的最大值
   * 
   * **Validates: Requirements 4.4**
   */
  it('RateLimit-Limit 应该等于配置的最大值', async () => {
    const configArb = fc.record({
      windowMs: fc.constant(5000),
      max: fc.integer({ min: 1, max: 20 })
    })
    
    await fc.assert(
      fc.asyncProperty(configArb, async (config) => {
        const app = createTestApp(config.windowMs, config.max)
        const response = await makeRequest(app)
        const rateLimit = parseRateLimitHeader(response.headers['ratelimit'])
        
        expect(rateLimit).not.toBeNull()
        expect(rateLimit!.limit).toBe(config.max)
      }),
      { numRuns: 50, timeout: 30000 }
    )
  }, 60000)

  /**
   * 属性 4c：RateLimit-Remaining 应该不超过 Limit
   * 
   * **Validates: Requirements 4.4**
   */
  it('RateLimit-Remaining 应该不超过 Limit', async () => {
    const configArb = fc.record({
      windowMs: fc.constant(5000),
      max: fc.integer({ min: 2, max: 10 }),
      requestCount: fc.integer({ min: 1, max: 10 })
    }).filter(config => config.requestCount <= config.max)
    
    await fc.assert(
      fc.asyncProperty(configArb, async (config) => {
        const app = createTestApp(config.windowMs, config.max)
        
        for (let i = 0; i < config.requestCount; i++) {
          const response = await makeRequest(app)
          const rateLimit = parseRateLimitHeader(response.headers['ratelimit'])
          
          expect(rateLimit).not.toBeNull()
          expect(rateLimit!.remaining).toBeGreaterThanOrEqual(0)
          expect(rateLimit!.remaining).toBeLessThanOrEqual(rateLimit!.limit)
        }
      }),
      { numRuns: 50, timeout: 30000 }
    )
  }, 60000)

  /**
   * 属性 4d：RateLimit-Remaining 应该随请求递减
   * 
   * **Validates: Requirements 4.4**
   */
  it('RateLimit-Remaining 应该随请求递减', async () => {
    const configArb = fc.record({
      windowMs: fc.constant(5000),
      max: fc.integer({ min: 3, max: 10 })
    })
    
    await fc.assert(
      fc.asyncProperty(configArb, async (config) => {
        const app = createTestApp(config.windowMs, config.max)
        let previousRemaining = config.max
        
        for (let i = 0; i < config.max; i++) {
          const response = await makeRequest(app)
          const rateLimit = parseRateLimitHeader(response.headers['ratelimit'])
          
          expect(rateLimit).not.toBeNull()
          const remaining = rateLimit!.remaining
          
          if (i === 0) {
            expect(remaining).toBe(config.max - 1)
          } else {
            expect(remaining).toBe(previousRemaining - 1)
          }
          
          previousRemaining = remaining
        }
        
        expect(previousRemaining).toBe(0)
      }),
      { numRuns: 50, timeout: 30000 }
    )
  }, 60000)

  /**
   * 属性 4e：RateLimit-Reset 应该是未来的时间戳
   * 
   * **Validates: Requirements 4.4**
   */
  it('RateLimit-Reset 应该是未来的时间戳', async () => {
    const configArb = fc.record({
      windowMs: fc.constant(5000),
      max: fc.integer({ min: 2, max: 10 })
    })
    
    await fc.assert(
      fc.asyncProperty(configArb, async (config) => {
        const app = createTestApp(config.windowMs, config.max)
        
        const beforeRequest = Math.floor(Date.now() / 1000)
        const response = await makeRequest(app)
        const afterRequest = Math.floor(Date.now() / 1000)
        
        const rateLimit = parseRateLimitHeader(response.headers['ratelimit'])
        expect(rateLimit).not.toBeNull()
        
        const reset = rateLimit!.reset
        
        // Reset 应该是未来的时间戳（相对秒数）
        expect(reset).toBeGreaterThan(0)
        
        // Reset 应该在合理的范围内（窗口时间的秒数）
        const maxReset = Math.ceil(config.windowMs / 1000) + 1
        expect(reset).toBeLessThanOrEqual(maxReset)
      }),
      { numRuns: 50, timeout: 30000 }
    )
  }, 60000)

  /**
   * 属性 4f：被限流的请求也应该包含响应头
   * 
   * **Validates: Requirements 4.4**
   */
  it('被限流的请求也应该包含响应头', async () => {
    const configArb = fc.record({
      windowMs: fc.constant(5000),
      max: fc.integer({ min: 2, max: 5 })
    })
    
    await fc.assert(
      fc.asyncProperty(configArb, async (config) => {
        const app = createTestApp(config.windowMs, config.max)
        
        // 用完配额
        for (let i = 0; i < config.max; i++) {
          await makeRequest(app)
        }
        
        // 发送被限流的请求
        const blockedResponse = await makeRequest(app)
        
        expect(blockedResponse.status).toBe(429)
        
        // 验证响应头仍然存在
        expect(blockedResponse.headers['ratelimit']).toBeDefined()
        
        const rateLimit = parseRateLimitHeader(blockedResponse.headers['ratelimit'])
        expect(rateLimit).not.toBeNull()
        
        // Remaining 应该为 0
        expect(rateLimit!.remaining).toBe(0)
      }),
      { numRuns: 50, timeout: 30000 }
    )
  }, 60000)
})
