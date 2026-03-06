/**
 * Jest 测试设置文件
 * 在每个测试文件运行前执行
 */

// 导出空对象使文件成为模块（解决 TypeScript 全局声明问题）
export {}

// 设置测试环境变量
process.env.NODE_ENV = 'test'

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
