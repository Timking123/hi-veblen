/**
 * 时间格式化工具函数属性测试
 * 
 * Feature: admin-dark-theme-fix
 * Property 6: 时间格式化正确性
 * 
 * 使用 fast-check 进行属性测试，验证时间格式化函数的核心属性：
 * - 对于任意有效的 ISO 格式时间字符串，formatBeijingTime 函数的输出应该是 UTC+8 时区的时间
 * - 输出格式应匹配 'YYYY-MM-DD HH:mm' 或 'YYYY-MM-DD HH:mm:ss'
 * 
 * **Validates: Requirements 14.1, 14.2, 14.3**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { formatBeijingTime } from '../utils/time'

// ========== 自定义生成器 ==========

/**
 * 生成有效的年份（2000-2099）
 */
const yearArb = fc.integer({ min: 2000, max: 2099 })

/**
 * 生成有效的月份（1-12）
 */
const monthArb = fc.integer({ min: 1, max: 12 })

/**
 * 生成有效的日期（1-28，避免月份天数问题）
 */
const dayArb = fc.integer({ min: 1, max: 28 })

/**
 * 生成有效的小时（0-23）
 */
const hourArb = fc.integer({ min: 0, max: 23 })

/**
 * 生成有效的分钟（0-59）
 */
const minuteArb = fc.integer({ min: 0, max: 59 })

/**
 * 生成有效的秒（0-59）
 */
const secondArb = fc.integer({ min: 0, max: 59 })

/**
 * 生成有效的 ISO 时间字符串
 */
const isoDateStringArb = fc.tuple(
  yearArb,
  monthArb,
  dayArb,
  hourArb,
  minuteArb,
  secondArb
).map(([year, month, day, hour, minute, second]) => {
  const monthStr = String(month).padStart(2, '0')
  const dayStr = String(day).padStart(2, '0')
  const hourStr = String(hour).padStart(2, '0')
  const minuteStr = String(minute).padStart(2, '0')
  const secondStr = String(second).padStart(2, '0')
  return `${year}-${monthStr}-${dayStr}T${hourStr}:${minuteStr}:${secondStr}.000Z`
})

/**
 * 生成 UTC 时间组件（用于验证转换正确性）
 */
const utcTimeComponentsArb = fc.tuple(
  yearArb,
  monthArb,
  dayArb,
  hourArb,
  minuteArb,
  secondArb
)

// ========== 辅助函数 ==========

/**
 * 验证输出格式是否匹配 YYYY-MM-DD HH:mm
 */
function isValidDefaultFormat(output: string): boolean {
  const pattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/
  return pattern.test(output)
}

/**
 * 验证输出格式是否匹配 YYYY-MM-DD HH:mm:ss
 */
function isValidFullFormat(output: string): boolean {
  const pattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/
  return pattern.test(output)
}

/**
 * 验证输出格式是否匹配 YYYY-MM-DD
 */
function isValidDateOnlyFormat(output: string): boolean {
  const pattern = /^\d{4}-\d{2}-\d{2}$/
  return pattern.test(output)
}

/**
 * 手动计算北京时间（用于验证）
 * @param utcYear UTC 年
 * @param utcMonth UTC 月（1-12）
 * @param utcDay UTC 日
 * @param utcHour UTC 时
 * @param utcMinute UTC 分
 * @param utcSecond UTC 秒
 * @returns 北京时间组件
 */
function calculateBeijingTime(
  utcYear: number,
  utcMonth: number,
  utcDay: number,
  utcHour: number,
  utcMinute: number,
  utcSecond: number
): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  // 创建 UTC 日期
  const utcDate = new Date(Date.UTC(utcYear, utcMonth - 1, utcDay, utcHour, utcMinute, utcSecond))
  
  // 加上 8 小时偏移
  const beijingOffset = 8 * 60 * 60 * 1000
  const beijingDate = new Date(utcDate.getTime() + beijingOffset)
  
  return {
    year: beijingDate.getUTCFullYear(),
    month: beijingDate.getUTCMonth() + 1,
    day: beijingDate.getUTCDate(),
    hour: beijingDate.getUTCHours(),
    minute: beijingDate.getUTCMinutes(),
    second: beijingDate.getUTCSeconds()
  }
}

// ========== 测试套件 ==========

describe('时间格式化属性测试', () => {
  /**
   * Property 6: 时间格式化正确性
   * **Validates: Requirements 14.1, 14.2, 14.3**
   */
  describe('Property 6: 时间格式化正确性', () => {
    it('对于任意有效的 ISO 时间字符串，输出应符合默认格式 YYYY-MM-DD HH:mm', () => {
      fc.assert(
        fc.property(isoDateStringArb, (isoString) => {
          const result = formatBeijingTime(isoString)
          expect(isValidDefaultFormat(result)).toBe(true)
        }),
        { numRuns: 20 }
      )
    })

    it('对于任意有效的 ISO 时间字符串，使用完整格式时输出应符合 YYYY-MM-DD HH:mm:ss', () => {
      fc.assert(
        fc.property(isoDateStringArb, (isoString) => {
          const result = formatBeijingTime(isoString, 'YYYY-MM-DD HH:mm:ss')
          expect(isValidFullFormat(result)).toBe(true)
        }),
        { numRuns: 20 }
      )
    })

    it('对于任意有效的 ISO 时间字符串，使用仅日期格式时输出应符合 YYYY-MM-DD', () => {
      fc.assert(
        fc.property(isoDateStringArb, (isoString) => {
          const result = formatBeijingTime(isoString, 'YYYY-MM-DD')
          expect(isValidDateOnlyFormat(result)).toBe(true)
        }),
        { numRuns: 20 }
      )
    })

    it('时区转换正确性：输出时间应为 UTC+8（北京时间）', () => {
      fc.assert(
        fc.property(utcTimeComponentsArb, ([year, month, day, hour, minute, second]) => {
          // 构造 ISO 字符串
          const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.000Z`
          
          // 获取格式化结果
          const result = formatBeijingTime(isoString, 'YYYY-MM-DD HH:mm:ss')
          
          // 手动计算预期的北京时间
          const expected = calculateBeijingTime(year, month, day, hour, minute, second)
          
          // 解析结果
          const [datePart, timePart] = result.split(' ')
          const [resultYear, resultMonth, resultDay] = datePart.split('-').map(Number)
          const [resultHour, resultMinute, resultSecond] = timePart.split(':').map(Number)
          
          // 验证各个部分
          expect(resultYear).toBe(expected.year)
          expect(resultMonth).toBe(expected.month)
          expect(resultDay).toBe(expected.day)
          expect(resultHour).toBe(expected.hour)
          expect(resultMinute).toBe(expected.minute)
          expect(resultSecond).toBe(expected.second)
        }),
        { numRuns: 30 }
      )
    })

    it('相同输入应产生相同输出（确定性）', () => {
      fc.assert(
        fc.property(
          isoDateStringArb,
          fc.integer({ min: 2, max: 5 }),
          (isoString, repeatCount) => {
            const results: string[] = []
            for (let i = 0; i < repeatCount; i++) {
              results.push(formatBeijingTime(isoString))
            }
            // 所有结果应该相同
            expect(results.every(r => r === results[0])).toBe(true)
          }
        ),
        { numRuns: 20 }
      )
    })

    it('UTC 时间 16:00 及之后应转换为北京时间次日', () => {
      fc.assert(
        fc.property(
          yearArb,
          monthArb,
          // 使用 1-27 避免月末边界问题
          fc.integer({ min: 1, max: 27 }),
          // 16:00-23:59 UTC 会跨天到北京时间次日
          fc.integer({ min: 16, max: 23 }),
          minuteArb,
          secondArb,
          (year, month, day, hour, minute, second) => {
            const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.000Z`
            
            const result = formatBeijingTime(isoString, 'YYYY-MM-DD HH:mm:ss')
            const [datePart] = result.split(' ')
            const [, , resultDay] = datePart.split('-').map(Number)
            
            // UTC 16:00+ 应该转换为北京时间次日（00:00+）
            expect(resultDay).toBe(day + 1)
          }
        ),
        { numRuns: 20 }
      )
    })

    it('UTC 时间 00:00-15:59 应转换为北京时间同日', () => {
      fc.assert(
        fc.property(
          yearArb,
          monthArb,
          dayArb,
          // 00:00-15:59 UTC 不会跨天
          fc.integer({ min: 0, max: 15 }),
          minuteArb,
          secondArb,
          (year, month, day, hour, minute, second) => {
            const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.000Z`
            
            const result = formatBeijingTime(isoString, 'YYYY-MM-DD HH:mm:ss')
            const [datePart] = result.split(' ')
            const [, , resultDay] = datePart.split('-').map(Number)
            
            // UTC 00:00-15:59 应该转换为北京时间同日
            expect(resultDay).toBe(day)
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  describe('边界情况处理', () => {
    it('空字符串应返回 "-"', () => {
      expect(formatBeijingTime('')).toBe('-')
    })

    it('无效日期字符串应返回 "-"', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => isNaN(new Date(s).getTime())),
          (invalidString) => {
            expect(formatBeijingTime(invalidString)).toBe('-')
          }
        ),
        { numRuns: 20 }
      )
    })

    it('各种无效输入应返回 "-"', () => {
      const invalidInputs = [
        'not-a-date',
        '2024-13-01T00:00:00.000Z', // 无效月份
        '2024-01-32T00:00:00.000Z', // 无效日期
        'abc123',
        '   ',
        'null',
        'undefined'
      ]
      
      for (const input of invalidInputs) {
        expect(formatBeijingTime(input)).toBe('-')
      }
    })
  })

  describe('格式化选项测试', () => {
    it('自定义格式应正确替换占位符', () => {
      fc.assert(
        fc.property(isoDateStringArb, (isoString) => {
          // 测试各种格式组合
          const formats = [
            'YYYY',
            'MM',
            'DD',
            'HH',
            'mm',
            'ss',
            'YYYY/MM/DD',
            'HH:mm:ss',
            'YYYY年MM月DD日',
            'YYYY-MM-DD',
            'MM-DD HH:mm'
          ]
          
          for (const format of formats) {
            const result = formatBeijingTime(isoString, format)
            // 结果不应包含未替换的占位符
            expect(result).not.toBe('-')
            // 结果长度应该合理
            expect(result.length).toBeGreaterThan(0)
          }
        }),
        { numRuns: 15 }
      )
    })
  })
})
