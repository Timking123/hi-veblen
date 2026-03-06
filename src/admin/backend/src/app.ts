/**
 * 应用入口文件
 * 配置 Express 应用和中间件
 * 
 * 需求: 1.5 - 在 2GB 内存限制下稳定运行，后端内存占用不超过 500MB
 * 
 * 功能:
 * - 配置 CORS 跨域
 * - 配置 JSON 解析
 * - 配置静态文件服务
 * - 注册所有模块路由
 * - 配置全局错误处理
 * - 初始化数据库
 */

import express, { Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import path from 'path'

// 导入路由
import apiRouter from './routes'

// 导入中间件
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { xssProtection } from './middleware/xssProtection'
import { csrfProtection, csrfTokenGenerator } from './middleware/csrfProtection'
import { apiCache } from './middleware/cache'
import { generalLimiter } from './middleware/rateLimit'

// 导入数据库初始化
import { initDatabase, closeDatabase, saveDatabase, initializeDefaultContent } from './database/init'

// 导入备份系统
import { getBackupSystem } from './services/backup'

// 导入日志系统
import { createLogger } from './utils/logger'

// 创建应用日志记录器
const logger = createLogger('app')

/**
 * 创建 Express 应用实例
 */
const app: Express = express()

/**
 * 服务器端口配置
 * 默认端口: 3001
 */
const PORT = process.env.PORT || 3001

/**
 * 静态文件目录配置
 * 用于文件管理模块的文件服务
 */
const STATIC_DIR = process.env.STATIC_DIR || path.resolve(__dirname, '../public')
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.resolve(__dirname, '../uploads')

// ========== 安全中间件 ==========

/**
 * Helmet 安全中间件
 * 设置各种 HTTP 头以增强安全性
 */
app.use(helmet({
  // 允许跨域资源共享
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // 内容安全策略配置
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}))

// ========== CORS 跨域配置 ==========

/**
 * CORS 配置
 * 允许前端应用跨域访问 API
 * 
 * 需求: 5.1 - 生产环境仅允许环境变量 CORS_ORIGIN 中配置的域名进行跨域访问
 * 需求: 5.2 - CORS_ORIGIN 环境变量未设置时拒绝所有跨域请求并记录警告日志
 * 需求: 5.3 - 来自未授权域名的跨域请求返回 HTTP 403 状态码
 */
const corsOptions: cors.CorsOptions = {
  // 允许的来源
  origin: (origin, callback) => {
    // 开发环境允许所有来源
    if (process.env.NODE_ENV !== 'production') {
      callback(null, true)
      return
    }

    // 生产环境：验证白名单
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(s => s.trim())
    
    // CORS_ORIGIN 未设置时拒绝所有跨域请求
    if (!allowedOrigins || allowedOrigins.length === 0) {
      logger.warn('CORS_ORIGIN 环境变量未设置，拒绝所有跨域请求')
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
      logger.warn('拒绝来自未授权域名的跨域请求', { origin })
      callback(new Error('不允许的跨域来源'))
    }
  },
  // 允许的 HTTP 方法
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  // 允许的请求头（包含 CSRF Token 头）
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  // 暴露给前端的响应头
  exposedHeaders: ['X-CSRF-Token'],
  // 允许携带凭证（cookies）
  credentials: true,
  // 预检请求缓存时间（秒）
  maxAge: 86400
}

app.use(cors(corsOptions))

// ========== 请求解析中间件 ==========

/**
 * JSON 解析中间件
 * 限制请求体大小为 10MB
 */
app.use(express.json({ limit: '10mb' }))

/**
 * URL 编码解析中间件
 * 用于解析表单数据
 */
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ========== XSS 防护中间件 ==========

/**
 * XSS 防护
 * 清理用户输入中的潜在 XSS 攻击代码
 */
app.use(xssProtection)

// ========== CSRF 防护中间件 ==========

/**
 * CSRF Token 生成
 * 为每个请求生成或刷新 CSRF Token
 */
app.use(csrfTokenGenerator)

/**
 * CSRF 验证
 * 验证非安全方法请求中的 CSRF Token
 */
app.use(csrfProtection)

// ========== 压缩中间件 ==========

/**
 * Gzip 压缩中间件
 * 压缩响应数据以减少传输大小
 */
app.use(compression({
  // 压缩级别（1-9，6 为默认平衡值）
  level: 6,
  // 最小压缩阈值（字节）
  threshold: 1024,
  // 压缩的 MIME 类型
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false
    }
    return compression.filter(req, res)
  }
}))

// ========== 静态文件服务 ==========

/**
 * 公共静态文件服务
 * 用于提供前端静态资源
 */
app.use('/static', express.static(STATIC_DIR, {
  // 缓存控制（1天）
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  // 启用 ETag
  etag: true,
  // 启用 Last-Modified
  lastModified: true
}))

/**
 * 上传文件服务
 * 用于文件管理模块的文件访问
 */
app.use('/uploads', express.static(UPLOADS_DIR, {
  // 缓存控制（1小时）
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
  // 启用 ETag
  etag: true,
  // 启用 Last-Modified
  lastModified: true
}))

// ========== 请求日志中间件 ==========

/**
 * 简单的请求日志中间件
 * 记录每个请求的基本信息
 */
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now()
    
    // 响应完成后记录日志
    res.on('finish', () => {
      const duration = Date.now() - start
      
      // 只在开发环境或错误时输出日志
      if (process.env.NODE_ENV === 'development' || res.statusCode >= 400) {
        const logData = {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: `${duration}ms`
        }
        
        if (res.statusCode >= 400) {
          logger.warn('HTTP 请求', logData)
        } else {
          logger.info('HTTP 请求', logData)
        }
      }
    })
    
    next()
  })
}

// ========== API 响应缓存 ==========

/**
 * API 响应缓存中间件
 * 对频繁访问的数据进行缓存，减少数据库查询
 * 缓存配置见 middleware/cache.ts
 */
app.use(apiCache)

// ========== API 路由 ==========

/**
 * 全局 API 请求限流
 * 限制每个 IP 在 15 分钟内最多 100 次请求
 * 需求: 4.1 - 对每个 IP 地址在 15 分钟窗口内限制最多 100 次通用 API 请求
 */
app.use('/api', generalLimiter)

/**
 * 注册所有 API 路由
 * 所有 API 路由都以 /api 为前缀
 */
app.use('/api', apiRouter)

// ========== 错误处理 ==========

/**
 * 404 错误处理
 * 处理未匹配到任何路由的请求
 */
app.use(notFoundHandler)

/**
 * 全局错误处理中间件
 * 捕获并处理所有错误
 */
app.use(errorHandler)

// ========== 数据库初始化和服务器启动 ==========

/**
 * 启动服务器
 * 初始化数据库并启动 HTTP 服务
 */
async function startServer(): Promise<void> {
  try {
    logger.info('后台管理系统服务启动中...')
    
    // 初始化数据库
    logger.info('正在初始化数据库...')
    await initDatabase()
    logger.info('数据库初始化完成')
    
    // 导入默认内容数据
    logger.info('正在导入默认内容数据...')
    await initializeDefaultContent()
    logger.info('默认内容数据导入完成')
    
    // 启动备份系统
    logger.info('正在启动备份系统...')
    const backupSystem = getBackupSystem()
    backupSystem.start()
    logger.info('备份系统已启动')
    
    // 启动 HTTP 服务器
    const server = app.listen(PORT, () => {
      logger.info('服务器已启动', {
        port: PORT,
        env: process.env.NODE_ENV || 'development',
        apiUrl: `http://localhost:${PORT}/api`,
        healthCheck: `http://localhost:${PORT}/api/health`
      })
    })
    
    // 优雅关闭处理
    const gracefulShutdown = (signal: string) => {
      logger.info('收到关闭信号，正在优雅关闭服务器...', { signal })
      
      server.close(() => {
        logger.info('HTTP 服务器已关闭')
        
        // 停止备份系统
        const backupSystem = getBackupSystem()
        backupSystem.stop()
        logger.info('备份系统已停止')
        
        // 保存并关闭数据库
        saveDatabase()
        closeDatabase()
        logger.info('数据库连接已关闭')
        
        logger.info('服务器已完全关闭')
        process.exit(0)
      })
      
      // 如果 10 秒内没有关闭完成，强制退出
      setTimeout(() => {
        logger.error('强制关闭服务器（超时）')
        process.exit(1)
      }, 10000)
    }
    
    // 监听进程信号
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
    
    // 未捕获的异常处理
    process.on('uncaughtException', (error) => {
      logger.error('未捕获的异常', { error: error.message, stack: error.stack })
      gracefulShutdown('uncaughtException')
    })
    
    // 未处理的 Promise 拒绝
    process.on('unhandledRejection', (reason) => {
      logger.error('未处理的 Promise 拒绝', { reason })
    })
    
  } catch (error) {
    logger.error('服务器启动失败', { error: error instanceof Error ? error.message : String(error) })
    process.exit(1)
  }
}

// 导出 app 实例（用于测试）
export { app, startServer }

// 如果直接运行此文件，则启动服务器
if (require.main === module) {
  startServer()
}

export default app
