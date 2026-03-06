/**
 * CORS 验证属性测试（Property-Based Testing）
 * 使用 fast-check 库测试 CORS 域名白名单验证的正确性属性
 * 
 * **Feature: project-audit-upgrade**
 * - Property 5: CORS 域名白名单验证
 * 
 * **Validates: Requirements 5.1, 5.3**
 */

import * as fc from 'fast-check'
import request from 'supertest'
import express, { Express, Request, Response, NextFunction } from 'express'
import cors from 'cors'

// ========== 测试辅助函数 ==========

/**
 * 创建测试用的 Express 应用
 * 配置指定的 CORS 白名单
 */
function createTestApp(allowedOrigins: string[], isProduction: boolean): Express {
  const app = express()
  
  // 配置 CORS 中间件
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // 非生产环境允许所有来源
      if (!isProduction) {
        callback(null, true)
        return
      }

      // 生产环境：验证白名单
      if (!allowedOrigins || allowedOrigins.length === 0) {
        callback(new Error('CORS 未配置'))
        return
      }

      // 允许同源请求（origin 为 undefined）
      if (!origin) {
        callback(null, true)
        return
      }

      // 验证请求来源是否在白名单中
      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('不允许的跨域来源'))
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }
  
  app.use(cors(corsOptions))
  
  // CORS 错误处理中间件
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err.message === 'CORS 未配置' || err.message === '不允许的跨域来源') {
      res.status(403).json({
        success: false,
        message: err.message
      })
      return
    }
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  })
  
  // 测试路由
  app.get('/test', (_req: Request, res: Response) => {
    res.status(200).json({ success: true, message: 'OK' })
  })
  
  return app
}

/**
 * 发送带有指定 Origin 的测试请求
 */
async function makeRequestWithOrigin(app: Express, origin: string | null) {
  const req = request(app).get('/test')
  
  if (origin !== null) {
    req.set('Origin', origin)
  }
  
  return req
}

// ========== 域名生成器 ==========

/**
 * 生成有效的域名字符串
 */
const validDomainArb = fc.oneof(
  // HTTP 域名
  fc.tuple(
    fc.constantFrom('http'),
    fc.domain()
  ).map(([protocol, domain]) => `${protocol}://${domain}`),
  
  // HTTPS 域名
  fc.tuple(
    fc.constantFrom('https'),
    fc.domain()
  ).map(([protocol, domain]) => `${protocol}://${domain}`),
  
  // 带端口的域名
  fc.tuple(
    fc.constantFrom('http', 'https'),
    fc.domain(),
    fc.integer({ min: 1000, max: 9999 })
  ).map(([protocol, domain, port]) => `${protocol}://${domain}:${port}`),
  
  // localhost
  fc.tuple(
    fc.constantFrom('http', 'https'),
    fc.constantFrom('localhost', '127.0.0.1'),
    fc.option(fc.integer({ min: 1000, max: 9999 }), { nil: null })
  ).map(([protocol, host, port]) => 
    port ? `${protocol}://${host}:${port}` : `${protocol}://${host}`
  )
)

// ========== 测试套件 ==========

describe('Property 5: CORS 域名白名单验证', () => {
  /**
   * 属性 5a：生产环境下，白名单中的域名应该被允许
   * 
   * **Validates: Requirements 5.1**
   */
  it('生产环境下，白名单中的域名应该被允许', async () => {
    const configArb = fc.record({
      allowedOrigins: fc.array(validDomainArb, { minLength: 1, maxLength: 5 }),
      selectedIndex: fc.nat()
    }).chain(config => 
      fc.record({
        allowedOrigins: fc.constant(config.allowedOrigins),
        selectedOrigin: fc.constant(
          config.allowedOrigins[config.selectedIndex % config.allowedOrigins.length]
        )
      })
    )
    
    await fc.assert(
      fc.asyncProperty(configArb, async (config) => {
        const app = createTestApp(config.allowedOrigins, true)
        const response = await makeRequestWithOrigin(app, config.selectedOrigin)
        
        // 白名单中的域名应该被允许（返回 200）
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        
        // 应该包含 CORS 响应头
        expect(response.headers['access-control-allow-origin']).toBe(config.selectedOrigin)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 5b：生产环境下，不在白名单中的域名应该被拒绝
   * 
   * **Validates: Requirements 5.3**
   */
  it('生产环境下，不在白名单中的域名应该被拒绝', async () => {
    const configArb = fc.record({
      allowedOrigins: fc.array(validDomainArb, { minLength: 1, maxLength: 3 }),
      unauthorizedOrigin: validDomainArb
    }).filter(config => 
      // 确保 unauthorizedOrigin 不在白名单中
      !config.allowedOrigins.includes(config.unauthorizedOrigin)
    )
    
    await fc.assert(
      fc.asyncProperty(configArb, async (config) => {
        const app = createTestApp(config.allowedOrigins, true)
        const response = await makeRequestWithOrigin(app, config.unauthorizedOrigin)
        
        // 未授权的域名应该被拒绝（返回 403）
        expect(response.status).toBe(403)
        expect(response.body.success).toBe(false)
        expect(response.body.message).toContain('不允许的跨域来源')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 5c：生产环境下，空白名单应该拒绝所有跨域请求
   * 
   * **Validates: Requirements 5.2**
   */
  it('生产环境下，空白名单应该拒绝所有跨域请求', async () => {
    await fc.assert(
      fc.asyncProperty(validDomainArb, async (origin) => {
        const app = createTestApp([], true)
        const response = await makeRequestWithOrigin(app, origin)
        
        // 空白名单应该拒绝所有请求（返回 403）
        expect(response.status).toBe(403)
        expect(response.body.success).toBe(false)
        expect(response.body.message).toBe('CORS 未配置')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 5d：生产环境下，同源请求（无 Origin 头）应该被允许
   * 
   * **Validates: Requirements 5.1**
   */
  it('生产环境下，同源请求应该被允许', async () => {
    const configArb = fc.array(validDomainArb, { minLength: 1, maxLength: 5 })
    
    await fc.assert(
      fc.asyncProperty(configArb, async (allowedOrigins) => {
        const app = createTestApp(allowedOrigins, true)
        const response = await makeRequestWithOrigin(app, null)
        
        // 同源请求应该被允许（返回 200）
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 5e：非生产环境下，所有域名都应该被允许
   * 
   * **Validates: Requirements 5.1**
   */
  it('非生产环境下，所有域名都应该被允许', async () => {
    const configArb = fc.record({
      allowedOrigins: fc.array(validDomainArb, { minLength: 0, maxLength: 3 }),
      requestOrigin: validDomainArb
    })
    
    await fc.assert(
      fc.asyncProperty(configArb, async (config) => {
        const app = createTestApp(config.allowedOrigins, false)
        const response = await makeRequestWithOrigin(app, config.requestOrigin)
        
        // 非生产环境应该允许所有域名（返回 200）
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 5f：白名单验证应该是精确匹配
   * 
   * **Validates: Requirements 5.1, 5.3**
   */
  it('白名单验证应该是精确匹配', async () => {
    const baseOrigin = 'https://example.com'
    const allowedOrigins = [baseOrigin]
    
    const similarOriginsArb = fc.constantFrom(
      'https://example.com:8080',      // 不同端口
      'http://example.com',             // 不同协议
      'https://www.example.com',        // 不同子域名
      'https://example.com.cn',         // 不同顶级域名
      'https://example.com/',           // 带尾部斜杠
      'https://sub.example.com'         // 子域名
    )
    
    await fc.assert(
      fc.asyncProperty(similarOriginsArb, async (similarOrigin) => {
        const app = createTestApp(allowedOrigins, true)
        const response = await makeRequestWithOrigin(app, similarOrigin)
        
        // 相似但不完全匹配的域名应该被拒绝
        expect(response.status).toBe(403)
        expect(response.body.success).toBe(false)
      }),
      { numRuns: 50 }
    )
  })

  /**
   * 属性 5g：白名单应该支持多个域名
   * 
   * **Validates: Requirements 5.1**
   */
  it('白名单应该支持多个域名', async () => {
    const configArb = fc.record({
      allowedOrigins: fc.array(validDomainArb, { minLength: 2, maxLength: 10 })
    })
    
    await fc.assert(
      fc.asyncProperty(configArb, async (config) => {
        const app = createTestApp(config.allowedOrigins, true)
        
        // 测试白名单中的每个域名都应该被允许
        for (const origin of config.allowedOrigins) {
          const response = await makeRequestWithOrigin(app, origin)
          expect(response.status).toBe(200)
          expect(response.body.success).toBe(true)
        }
      }),
      { numRuns: 50 }
    )
  })
})
