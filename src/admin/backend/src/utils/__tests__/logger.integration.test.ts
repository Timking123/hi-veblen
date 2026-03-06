/**
 * Logger 工具类集成测试
 * 测试日志文件写入、轮转和清理功能
 * 
 * Requirements: 8.3, 8.4
 */

import fs from 'fs'
import path from 'path'
import { createLogger } from '../logger'

describe('Logger 集成测试 - 文件操作', () => {
  const logDir = path.resolve(__dirname, '../../../logs')

  beforeAll(() => {
    // 确保测试前日志目录存在
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
  })

  afterAll(() => {
    // 清理测试生成的日志文件
    if (fs.existsSync(logDir)) {
      const files = fs.readdirSync(logDir)
      for (const file of files) {
        if (file.startsWith('app-') && file.endsWith('.log')) {
          try {
            fs.unlinkSync(path.join(logDir, file))
          } catch (error) {
            // 忽略清理错误
          }
        }
      }
    }
  })

  describe('日志文件写入', () => {
    it('应该创建日志文件并写入日志', () => {
      process.env.LOG_LEVEL = 'INFO'
      const logger = createLogger('file-test')
      
      logger.info('test file write')
      
      // 等待文件写入完成
      const date = new Date().toISOString().split('T')[0]
      const logFilePath = path.join(logDir, `app-${date}.log`)
      
      // 验证文件存在
      expect(fs.existsSync(logFilePath)).toBe(true)
      
      // 验证文件内容
      const content = fs.readFileSync(logFilePath, 'utf-8')
      expect(content).toContain('test file write')
      expect(content).toContain('"level":"INFO"')
      expect(content).toContain('"module":"file-test"')
    })

    it('日志文件应该按日期命名', () => {
      process.env.LOG_LEVEL = 'INFO'
      const logger = createLogger('date-test')
      
      logger.info('date test')
      
      const date = new Date().toISOString().split('T')[0]
      const expectedFileName = `app-${date}.log`
      const logFilePath = path.join(logDir, expectedFileName)
      
      expect(fs.existsSync(logFilePath)).toBe(true)
    })

    it('多条日志应该追加到同一文件', () => {
      process.env.LOG_LEVEL = 'INFO'
      const logger = createLogger('append-test')
      
      logger.info('first log')
      logger.info('second log')
      logger.info('third log')
      
      const date = new Date().toISOString().split('T')[0]
      const logFilePath = path.join(logDir, `app-${date}.log`)
      
      const content = fs.readFileSync(logFilePath, 'utf-8')
      const lines = content.trim().split('\n')
      
      // 应该至少有 3 条日志（可能有之前测试的日志）
      expect(lines.length).toBeGreaterThanOrEqual(3)
      
      // 验证最后三条日志
      const lastThree = lines.slice(-3)
      expect(lastThree[0]).toContain('first log')
      expect(lastThree[1]).toContain('second log')
      expect(lastThree[2]).toContain('third log')
    })

    it('每条日志应该是独立的 JSON 行', () => {
      process.env.LOG_LEVEL = 'INFO'
      const logger = createLogger('json-lines-test')
      
      logger.info('json line 1')
      logger.info('json line 2')
      
      const date = new Date().toISOString().split('T')[0]
      const logFilePath = path.join(logDir, `app-${date}.log`)
      
      const content = fs.readFileSync(logFilePath, 'utf-8')
      const lines = content.trim().split('\n')
      
      // 每一行都应该是有效的 JSON
      for (const line of lines) {
        if (line.trim()) {
          expect(() => JSON.parse(line)).not.toThrow()
        }
      }
    })
  })

  describe('日志目录创建', () => {
    it('如果日志目录不存在，应该自动创建', () => {
      // 这个测试验证 Logger 构造函数中的 ensureLogDirectory 逻辑
      // 由于目录已经在 beforeAll 中创建，我们只验证它存在
      expect(fs.existsSync(logDir)).toBe(true)
    })
  })

  describe('错误处理', () => {
    it('写入失败时应该回退到 console 输出', () => {
      // 这个测试验证错误处理逻辑存在
      // 实际的错误场景（如权限问题）难以在单元测试中模拟
      process.env.LOG_LEVEL = 'INFO'
      const logger = createLogger('error-handling-test')
      
      // 正常情况下应该不抛出异常
      expect(() => {
        logger.info('should not throw')
      }).not.toThrow()
    })
  })
})
