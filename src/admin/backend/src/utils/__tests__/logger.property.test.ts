/**
 * Logger 工具类属性测试
 * 使用 fast-check 进行基于属性的测试
 * 
 * Feature: project-audit-upgrade
 * Requirements: 8.1, 8.2
 */

import * as fc from 'fast-check'
import { Logger, createLogger } from '../logger'

describe('Logger 属性测试', () => {
  let originalLogLevel: string | undefined
  let originalConsoleLog: typeof console.log
  let consoleOutput: string[] = []

  beforeAll(() => {
    originalLogLevel = process.env.LOG_LEVEL
    originalConsoleLog = console.log
    console.log = jest.fn((...args: unknown[]) => {
      consoleOutput.push(args.join(' '))
    })
  })

  afterAll(() => {
    if (originalLogLevel !== undefined) {
      process.env.LOG_LEVEL = originalLogLevel
    } else {
      delete process.env.LOG_LEVEL
    }
    console.log = originalConsoleLog
  })

  beforeEach(() => {
    consoleOutput = []
    ;(console.log as jest.Mock).mockClear()
  })

  /**
   * Property 9: 日志格式正确性
   * 
   * For any 日志级别和消息内容，Logger 输出的日志应为有效 JSON 格式，
   * 且包含 timestamp（ISO 8601）、level、module 和 message 四个必需字段。
   * 
   * **Validates: Requirements 8.1**
   */
  describe('Property 9: 日志格式正确性', () => {
    it('对于任意日志级别和消息，输出应为有效 JSON 且包含必需字段', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('DEBUG', 'INFO', 'WARN', 'ERROR'),
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (level, message, moduleName) => {
            // 设置日志级别为 DEBUG 以确保所有级别都输出
            process.env.LOG_LEVEL = 'DEBUG'
            consoleOutput = []
            ;(console.log as jest.Mock).mockClear()

            const logger = createLogger(moduleName)
            
            // 根据级别调用对应方法
            switch (level) {
              case 'DEBUG':
                logger.debug(message)
                break
              case 'INFO':
                logger.info(message)
                break
              case 'WARN':
                logger.warn(message)
                break
              case 'ERROR':
                logger.error(message)
                break
            }

            // 应该有输出
            expect(consoleOutput.length).toBeGreaterThan(0)
            
            const output = consoleOutput[consoleOutput.length - 1]
            
            // 1. 应该是有效的 JSON
            let log: any
            expect(() => {
              log = JSON.parse(output)
            }).not.toThrow()

            // 2. 必须包含四个必需字段
            expect(log).toHaveProperty('timestamp')
            expect(log).toHaveProperty('level')
            expect(log).toHaveProperty('module')
            expect(log).toHaveProperty('message')

            // 3. timestamp 应该是有效的 ISO 8601 格式
            expect(log.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
            expect(() => new Date(log.timestamp)).not.toThrow()
            expect(new Date(log.timestamp).toISOString()).toBe(log.timestamp)

            // 4. level 应该匹配
            expect(log.level).toBe(level)

            // 5. module 应该匹配
            expect(log.module).toBe(moduleName)

            // 6. message 应该匹配
            expect(log.message).toBe(message)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('对于包含附加数据的日志，data 字段应该正确序列化', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.record({
            userId: fc.integer(),
            action: fc.string(),
            timestamp: fc.integer()
          }),
          (message, data) => {
            process.env.LOG_LEVEL = 'INFO'
            consoleOutput = []
            ;(console.log as jest.Mock).mockClear()

            const logger = createLogger('test')
            logger.info(message, data)

            const output = consoleOutput[consoleOutput.length - 1]
            const log = JSON.parse(output)

            // data 字段应该存在且匹配
            expect(log).toHaveProperty('data')
            expect(log.data).toEqual(data)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 10: 日志级别过滤
   * 
   * For any 配置的最低日志级别和任意日志调用，只有级别大于等于最低级别的日志
   * 才应被写入，低于最低级别的日志应被忽略。
   * 
   * **Validates: Requirements 8.2**
   */
  describe('Property 10: 日志级别过滤', () => {
    // 日志级别数值映射
    const levelValues: Record<string, number> = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3
    }

    it('只有级别 >= 配置级别的日志才应输出', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('DEBUG', 'INFO', 'WARN', 'ERROR'),
          fc.constantFrom('DEBUG', 'INFO', 'WARN', 'ERROR'),
          fc.string({ minLength: 1, maxLength: 100 }),
          (configLevel, logLevel, message) => {
            // 设置日志级别
            process.env.LOG_LEVEL = configLevel
            consoleOutput = []
            ;(console.log as jest.Mock).mockClear()

            const logger = createLogger('test')
            const beforeCount = (console.log as jest.Mock).mock.calls.length

            // 调用对应级别的日志方法
            switch (logLevel) {
              case 'DEBUG':
                logger.debug(message)
                break
              case 'INFO':
                logger.info(message)
                break
              case 'WARN':
                logger.warn(message)
                break
              case 'ERROR':
                logger.error(message)
                break
            }

            const afterCount = (console.log as jest.Mock).mock.calls.length
            const wasLogged = afterCount > beforeCount

            // 验证过滤逻辑
            const shouldLog = levelValues[logLevel] >= levelValues[configLevel]
            expect(wasLogged).toBe(shouldLog)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('对于一系列不同级别的日志调用，过滤应该一致', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('DEBUG', 'INFO', 'WARN', 'ERROR'),
          fc.array(
            fc.record({
              level: fc.constantFrom('DEBUG', 'INFO', 'WARN', 'ERROR'),
              message: fc.string({ minLength: 1, maxLength: 50 })
            }),
            { minLength: 5, maxLength: 20 }
          ),
          (configLevel, logCalls) => {
            process.env.LOG_LEVEL = configLevel
            consoleOutput = []
            ;(console.log as jest.Mock).mockClear()

            const logger = createLogger('test')

            // 执行所有日志调用
            for (const call of logCalls) {
              switch (call.level) {
                case 'DEBUG':
                  logger.debug(call.message)
                  break
                case 'INFO':
                  logger.info(call.message)
                  break
                case 'WARN':
                  logger.warn(call.message)
                  break
                case 'ERROR':
                  logger.error(call.message)
                  break
              }
            }

            // 计算应该输出的日志数量
            const expectedCount = logCalls.filter(
              call => levelValues[call.level] >= levelValues[configLevel]
            ).length

            // 验证实际输出数量
            const actualCount = consoleOutput.length
            expect(actualCount).toBe(expectedCount)

            // 验证输出的日志级别都符合要求
            for (const output of consoleOutput) {
              const log = JSON.parse(output)
              expect(levelValues[log.level]).toBeGreaterThanOrEqual(
                levelValues[configLevel]
              )
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
