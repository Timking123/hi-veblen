/**
 * Jest 测试设置文件
 * 在每个测试文件运行前执行
 */

// 模块导入同时保证下方 Jest 类型扩展限定在模块中。
import fs from 'fs'
import os from 'os'
import path from 'path'

// 设置测试环境变量
process.env.NODE_ENV = 'test'
process.env.TEST_DATABASE_PATH = ':memory:'
process.env.ADMIN_USERNAME = 'admin'
process.env.ADMIN_PASSWORD = 'test-only-admin-password'

// 每个套件独占临时资源目录，禁止使用仓库资源和持久化数据库。
const artifactRoot = path.resolve(process.env.TEST_ARTIFACT_ROOT || os.tmpdir())
fs.mkdirSync(artifactRoot, { recursive: true })
const testRoot = fs.mkdtempSync(path.join(artifactRoot, 'myweb-backend-'))
process.env.TEST_SUITE_ROOT = testRoot
process.env.TEST_FILE_ROOT = path.join(testRoot, 'files')
process.env.TEST_PUBLIC_ROOT = path.join(testRoot, 'public')
process.env.TEST_LOG_DIR = path.join(testRoot, 'logs')

// 扩展 Jest 匹配器
expect.extend({
  /**
   * 自定义匹配器：检查字符串是否以指定后缀结尾
   */
  toEndWith(received: string, suffix: string) {
    const pass = received.endsWith(suffix)
    if (pass) {
      return {
        message: () => `期望 "${received}" 不以 "${suffix}" 结尾`,
        pass: true
      }
    } else {
      return {
        message: () => `期望 "${received}" 以 "${suffix}" 结尾`,
        pass: false
      }
    }
  }
})

// 声明自定义匹配器类型
declare global {
  namespace jest {
    interface Matchers<R> {
      toEndWith(suffix: string): R
    }
  }
}

// 全局测试超时设置
jest.setTimeout(30000)

// 控制台输出静默（可选）
// 在测试中减少不必要的日志输出
const originalConsoleLog = console.log
const originalConsoleError = console.error

beforeAll(() => {
  // 可以选择在测试时静默某些日志
  // console.log = jest.fn()
})

afterAll(() => {
  // 恢复原始的 console 方法
  console.log = originalConsoleLog
  console.error = originalConsoleError
})
