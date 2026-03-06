/**
 * messageStorage 模块属性测试
 * 
 * Feature: contact-page-update
 * 
 * 使用 fast-check 进行属性测试，验证留言存储系统的核心属性：
 * - Property 1: 文件名格式一致性
 * - Property 2: 留言存储往返一致性
 * 
 * 测试配置：
 * - 测试框架：Vitest + fast-check
 * - 最小迭代次数：每个属性测试运行 20 次
 * 
 * **Validates: Requirements 3.2, 3.3**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  generateFilename,
  serializeMessage,
  deserializeMessage,
  type MessageData
} from '../messageStorage'

// ========== 自定义生成器 ==========

const yearArb = fc.integer({ min: 2020, max: 2030 })
const monthArb = fc.integer({ min: 1, max: 12 })
const dayArb = fc.integer({ min: 1, max: 28 })

const dateArb = fc.tuple(yearArb, monthArb, dayArb).map(([year, month, day]) => {
  return new Date(year, month - 1, day)
})

const isoDateStringArb = fc.tuple(yearArb, monthArb, dayArb).map(([year, month, day]) => {
  const monthStr = String(month).padStart(2, '0')
  const dayStr = String(day).padStart(2, '0')
  return `${year}-${monthStr}-${dayStr}T10:30:00.000Z`
})

const nicknameArb = fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5]{1,20}$/)

const contactArb = fc.oneof(
  fc.stringMatching(/^1[3-9]\d{9}$/),
  fc.emailAddress(),
  fc.stringMatching(/^[a-zA-Z0-9]{6,20}$/)
)

const messageContentArb = fc.tuple(
  fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 })
).map(([parts]) => parts.join('\n')).filter(s => s.trim().length > 0)

const simpleMessageContentArb = fc.string({ minLength: 1, maxLength: 200 })
  .filter(s => !s.includes('\n') && !s.includes('\r') && s.trim().length > 0)

const timestampArb = fc.tuple(
  fc.integer({ min: 2020, max: 2030 }),
  fc.integer({ min: 1, max: 12 }),
  fc.integer({ min: 1, max: 28 }),
  fc.integer({ min: 0, max: 23 }),
  fc.integer({ min: 0, max: 59 }),
  fc.integer({ min: 0, max: 59 })
).map(([year, month, day, hour, minute, second]) => {
  const monthStr = String(month).padStart(2, '0')
  const dayStr = String(day).padStart(2, '0')
  const hourStr = String(hour).padStart(2, '0')
  const minuteStr = String(minute).padStart(2, '0')
  const secondStr = String(second).padStart(2, '0')
  return `${year}-${monthStr}-${dayStr}T${hourStr}:${minuteStr}:${secondStr}.000Z`
})

const messageDataArb = fc.record({
  nickname: nicknameArb,
  contact: contactArb,
  message: simpleMessageContentArb,
  timestamp: timestampArb
})

const messageDataWithNewlinesArb = fc.record({
  nickname: nicknameArb,
  contact: contactArb,
  message: messageContentArb,
  timestamp: timestampArb
})

// ========== 辅助函数 ==========

function isValidFilenameFormat(filename: string): boolean {
  const pattern = /^\d{4}-\d{2}-\d{2}_.+\.txt$/
  return pattern.test(filename)
}

function isValidDatePart(datePart: string): boolean {
  const pattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
  return pattern.test(datePart)
}

function extractDatePart(filename: string): string {
  return filename.split('_')[0]
}

function extractNicknamePart(filename: string): string {
  const withoutDate = filename.substring(11)
  return withoutDate.replace('.txt', '')
}

// ========== 测试套件 ==========

describe('messageStorage 属性测试', () => {
  describe('Property 1: 文件名格式一致性', () => {
    it('Date对象生成的文件名应符合格式', () => {
      fc.assert(
        fc.property(dateArb, nicknameArb, (date, nickname) => {
          const filename = generateFilename(date, nickname)
          expect(isValidFilenameFormat(filename)).toBe(true)
          expect(isValidDatePart(extractDatePart(filename))).toBe(true)
          expect(filename.endsWith('.txt')).toBe(true)
        }),
        { numRuns: 20 }
      )
    })

    it('ISO字符串生成的文件名应符合格式', () => {
      fc.assert(
        fc.property(isoDateStringArb, nicknameArb, (isoString, nickname) => {
          const filename = generateFilename(isoString, nickname)
          expect(isValidFilenameFormat(filename)).toBe(true)
          expect(isValidDatePart(extractDatePart(filename))).toBe(true)
        }),
        { numRuns: 20 }
      )
    })

    it('日期部分应正确反映输入日期', () => {
      fc.assert(
        fc.property(dateArb, nicknameArb, (date, nickname) => {
          const filename = generateFilename(date, nickname)
          const [year, month, day] = extractDatePart(filename).split('-').map(Number)
          expect(year).toBe(date.getFullYear())
          expect(month).toBe(date.getMonth() + 1)
          expect(day).toBe(date.getDate())
        }),
        { numRuns: 20 }
      )
    })

    it('文件名应包含清理后的称呼', () => {
      fc.assert(
        fc.property(dateArb, nicknameArb, (date, nickname) => {
          const filename = generateFilename(date, nickname)
          const nicknamePart = extractNicknamePart(filename)
          expect(nicknamePart.length).toBeGreaterThan(0)
          expect(nicknamePart).not.toMatch(/[/\\:*?"<>|]/)
        }),
        { numRuns: 20 }
      )
    })

    it('相同输入应产生相同输出', () => {
      fc.assert(
        fc.property(dateArb, nicknameArb, fc.integer({ min: 2, max: 5 }), (date, nickname, repeatCount) => {
          const results: string[] = []
          for (let i = 0; i < repeatCount; i++) {
            results.push(generateFilename(date, nickname))
          }
          expect(results.every(r => r === results[0])).toBe(true)
        }),
        { numRuns: 20 }
      )
    })
  })

  describe('Property 2: 留言存储往返一致性', () => {
    it('序列化后反序列化应得到等价对象', () => {
      fc.assert(
        fc.property(messageDataArb, (data) => {
          const serialized = serializeMessage(data)
          const deserialized = deserializeMessage(serialized)
          expect(deserialized).not.toBeNull()
          expect(deserialized!.nickname).toBe(data.nickname)
          expect(deserialized!.contact).toBe(data.contact)
          expect(deserialized!.message).toBe(data.message)
          expect(deserialized!.timestamp).toBe(data.timestamp)
        }),
        { numRuns: 20 }
      )
    })

    it('包含换行符的留言内容往返一致', () => {
      fc.assert(
        fc.property(messageDataWithNewlinesArb, (data) => {
          const serialized = serializeMessage(data)
          const deserialized = deserializeMessage(serialized)
          expect(deserialized).not.toBeNull()
          expect(deserialized!.message).toBe(data.message)
        }),
        { numRuns: 20 }
      )
    })

    it('序列化结果应为非空字符串', () => {
      fc.assert(
        fc.property(messageDataArb, (data) => {
          const serialized = serializeMessage(data)
          expect(typeof serialized).toBe('string')
          expect(serialized.length).toBeGreaterThan(0)
        }),
        { numRuns: 20 }
      )
    })

    it('序列化结果应为4行格式', () => {
      fc.assert(
        fc.property(messageDataArb, (data) => {
          const serialized = serializeMessage(data)
          const lines = serialized.split('\n')
          expect(lines.length).toBe(4)
          expect(lines[0]).toBe(data.nickname)
          expect(lines[1]).toBe(data.contact)
          expect(lines[3]).toBe(data.timestamp)
        }),
        { numRuns: 20 }
      )
    })

    it('多次往返应保持一致性', () => {
      fc.assert(
        fc.property(messageDataArb, fc.integer({ min: 2, max: 5 }), (data, roundTrips) => {
          let current: MessageData = { ...data }
          for (let i = 0; i < roundTrips; i++) {
            const serialized = serializeMessage(current)
            const deserialized = deserializeMessage(serialized)
            expect(deserialized).not.toBeNull()
            current = deserialized!
          }
          expect(current.nickname).toBe(data.nickname)
          expect(current.contact).toBe(data.contact)
          expect(current.message).toBe(data.message)
          expect(current.timestamp).toBe(data.timestamp)
        }),
        { numRuns: 20 }
      )
    })

    it('反序列化无效内容应返回null', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 3 }).chain(lineCount => 
            fc.array(fc.string({ minLength: 1, maxLength: 20 }), { 
              minLength: lineCount, 
              maxLength: lineCount 
            })
          ),
          (lines) => {
            const content = lines.join('\n')
            const result = deserializeMessage(content)
            if (lines.length < 4) {
              expect(result).toBeNull()
            }
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  describe('组合属性测试', () => {
    it('文件名和序列化应独立', () => {
      fc.assert(
        fc.property(messageDataArb, (data) => {
          const filename = generateFilename(data.timestamp, data.nickname)
          const serialized = serializeMessage(data)
          expect(filename).not.toContain(serialized)
          expect(serialized).not.toContain(filename)
        }),
        { numRuns: 20 }
      )
    })

    it('序列化/反序列化应保留所有字段', () => {
      fc.assert(
        fc.property(messageDataArb, (data) => {
          const serialized = serializeMessage(data)
          const deserialized = deserializeMessage(serialized)
          expect(deserialized).not.toBeNull()
          expect(deserialized!.nickname).toBeTruthy()
          expect(deserialized!.contact).toBeTruthy()
          expect(deserialized!.message).toBeTruthy()
          expect(deserialized!.timestamp).toBeTruthy()
        }),
        { numRuns: 20 }
      )
    })
  })
})
