/**
 * Logger 工具类单元测试
 * 测试结构化日志系统的基本功能
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import fs from 'fs'
import path from 'path'
import { Logger, createLogger } from '../logger'

// 测试用的日志目录
const TEST_LOG_DIR = path.resolve(__dirname, '../../../test-logs')

describe('Logger 工具类', () => {
  let originalLogLevel: string | undefined
  let originalConsoleLog: typeof console.log
  let consoleOutput: string[] = []

  beforeAll(() => {
    // 保存原始环境变量
    originalLogLevel = process.env.LOG_LEVEL
    
    // 拦截 console.log 以便测试
    originalConsoleLog = console.log
    console.log = jest.fn((...args: unknown[]) => {
      consoleOutput.push(args.join(' '))
    })
  })

  afterAll(() => {
    // 恢复环境变量和 console.log
    if (originalLogLevel !== undefined) {
      process.env.LOG_LEVEL = originalLogLevel
    } else {
      delete process.env.LOG_LEVEL
    }
    console.log = originalConsoleLog

    // 清理测试日志目录
    if (fs.existsSync(TEST_LOG_DIR)) {
      const files = fs.readdirSync(TEST_LOG_DIR)
      for (const file of files) {
        fs.unlinkSync(path.join(TEST_LOG_DIR, file))
      }
      fs.rmdirSync(TEST_LOG_DIR)
    }
  })

  beforeEach(() => {
    consoleOutput = []
    ;(console.log as jest.Mock).mockClear()
  })

  describe('createLogger 工厂函数', () => {
    it('应该创建一个 Logger 实例', () => {
      const logger = createLogger('test-module')
      expect(logger).toBeInstanceOf(Logger)
    })

    it('应该为不同模块创建独立的 Logger 实例', () => {
      const logger1 = createLogger('module1')
      const logger2 = createLogger('module2')
      expect(logger1).not.toBe(logger2)
    })
  })

  describe('日志级别', () => {
    it('应该支持 debug 级别', () => {
      process.env.LOG_LEVEL = 'DEBUG'
      const logger = createLogger('test')
      logger.debug('debug message')
      
      expect(console.log).toHaveBeenCalled()
      const output = consoleOutput[consoleOutput.length - 1]
      const log = JSON.parse(output)
      expect(log.level).toBe('DEBUG')
      expect(log.message).toBe('debug message')
    })

    it('应该支持 info 级别', () => {
      process.env.LOG_LEVEL = 'INFO'
      const logger = createLogger('test')
      logger.info('info message')
      
      const output = consoleOutput[consoleOutput.length - 1]
      const log = JSON.parse(output)
      expect(log.level).toBe('INFO')
      expect(log.message).toBe('info message')
    })

    it('应该支持 warn 级别', () => {
      process.env.LOG_LEVEL = 'WARN'
      const logger = createLogger('test')
      logger.warn('warn message')
      
      const output = consoleOutput[consoleOutput.length - 1]
      const log = JSON.parse(output)
      expect(log.level).toBe('WARN')
      expect(log.message).toBe('warn message')
    })

    it('应该支持 error 级别', () => {
      process.env.LOG_LEVEL = 'ERROR'
      const logger = createLogger('test')
      logger.error('error message')
      
      const output = consoleOutput[consoleOutput.length - 1]
      const log = JSON.parse(output)
      expect(log.level).toBe('ERROR')
      expect(log.message).toBe('error message')
    })
  })

  describe('JSON 格式输出', () => {
    it('应该输出有效的 JSON 格式', () => {
      process.env.LOG_LEVEL = 'INFO'
      const logger = createLogger('test-module')
      logger.info('test message')
      
      const output = consoleOutput[consoleOutput.length - 1]
      expect(() => JSON.parse(output)).not.toThrow()
    })

    it('日志应该包含必需的字段：timestamp、level、module、message', () => {
      process.env.LOG_LEVEL = 'INFO'
      const logger = createLogger('test-module')
      logger.info('test message')
      
      const output = consoleOutput[consoleOutput.length - 1]
      const log = JSON.parse(output)
      
      expect(log).toHaveProperty('timestamp')
      expect(log).toHaveProperty('level')
      expect(log).toHaveProperty('module')
      expect(log).toHaveProperty('message')
      expect(log.module).toBe('test-module')
      expect(log.message).toBe('test message')
    })

    it('timestamp 应该是有效的 ISO 8601 格式', () => {
      process.env.LOG_LEVEL = 'INFO'
      const logger = createLogger('test')
      logger.info('test')
      
      const output = consoleOutput[consoleOutput.length - 1]
      const log = JSON.parse(output)
      
      // ISO 8601 格式验证
      expect(log.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      expect(new Date(log.timestamp).toISOString()).toBe(log.timestamp)
    })

    it('应该支持附加数据字段', () => {
      process.env.LOG_LEVEL = 'INFO'
      const logger = createLogger('test')
      const additionalData = { userId: 123, action: 'login' }
      logger.info('user action', additionalData)
      
      const output = consoleOutput[consoleOutput.length - 1]
      const log = JSON.parse(output)
      
      expect(log).toHaveProperty('data')
      expect(log.data).toEqual(additionalData)
    })
  })

  describe('日志级别过滤', () => {
    it('当 LOG_LEVEL=INFO 时，debug 日志应该被过滤', () => {
      process.env.LOG_LEVEL = 'INFO'
      const logger = createLogger('test')
      
      const beforeCount = (console.log as jest.Mock).mock.calls.length
      logger.debug('should be filtered')
      const afterCount = (console.log as jest.Mock).mock.calls.length
      
      expect(afterCount).toBe(beforeCount)
    })

    it('当 LOG_LEVEL=INFO 时，info 及以上级别应该输出', () => {
      process.env.LOG_LEVEL = 'INFO'
      const logger = createLogger('test')
      
      logger.info('info message')
      logger.warn('warn message')
      logger.error('error message')
      
      // 应该有 3 条日志输出
      const logs = consoleOutput.slice(-3).map(o => JSON.parse(o))
      expect(logs).toHaveLength(3)
      expect(logs[0].level).toBe('INFO')
      expect(logs[1].level).toBe('WARN')
      expect(logs[2].level).toBe('ERROR')
    })

    it('当 LOG_LEVEL=WARN 时，只有 warn 和 error 应该输出', () => {
      process.env.LOG_LEVEL = 'WARN'
      const logger = createLogger('test')
      
      const beforeCount = (console.log as jest.Mock).mock.calls.length
      logger.debug('filtered')
      logger.info('filtered')
      logger.warn('shown')
      logger.error('shown')
      const afterCount = (console.log as jest.Mock).mock.calls.length
      
      expect(afterCount - beforeCount).toBe(2)
    })

    it('当 LOG_LEVEL=ERROR 时，只有 error 应该输出', () => {
      process.env.LOG_LEVEL = 'ERROR'
      const logger = createLogger('test')
      
      const beforeCount = (console.log as jest.Mock).mock.calls.length
      logger.debug('filtered')
      logger.info('filtered')
      logger.warn('filtered')
      logger.error('shown')
      const afterCount = (console.log as jest.Mock).mock.calls.length
      
      expect(afterCount - beforeCount).toBe(1)
    })

    it('当 LOG_LEVEL 未设置时，默认为 INFO', () => {
      delete process.env.LOG_LEVEL
      const logger = createLogger('test')
      
      const beforeCount = (console.log as jest.Mock).mock.calls.length
      logger.debug('filtered')
      logger.info('shown')
      const afterCount = (console.log as jest.Mock).mock.calls.length
      
      expect(afterCount - beforeCount).toBe(1)
    })

    it('当 LOG_LEVEL 设置为无效值时，默认为 INFO', () => {
      process.env.LOG_LEVEL = 'INVALID'
      const logger = createLogger('test')
      
      const beforeCount = (console.log as jest.Mock).mock.calls.length
      logger.debug('filtered')
      logger.info('shown')
      const afterCount = (console.log as jest.Mock).mock.calls.length
      
      expect(afterCount - beforeCount).toBe(1)
    })
  })

  describe('模块名称', () => {
    it('应该在日志中正确记录模块名称', () => {
      process.env.LOG_LEVEL = 'INFO'
      const moduleName = 'auth-service'
      const logger = createLogger(moduleName)
      logger.info('test')
      
      const output = consoleOutput[consoleOutput.length - 1]
      const log = JSON.parse(output)
      expect(log.module).toBe(moduleName)
    })

    it('不同模块的日志应该有不同的模块名', () => {
      process.env.LOG_LEVEL = 'INFO'
      const logger1 = createLogger('module-a')
      const logger2 = createLogger('module-b')
      
      logger1.info('from a')
      logger2.info('from b')
      
      const logs = consoleOutput.slice(-2).map(o => JSON.parse(o))
      expect(logs[0].module).toBe('module-a')
      expect(logs[1].module).toBe('module-b')
    })
  })
})
