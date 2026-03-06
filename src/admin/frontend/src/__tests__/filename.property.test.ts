/**
 * 中文文件名编码属性测试
 * 
 * Feature: admin-dark-theme-fix
 * Property 7: 中文文件名编码往返一致性
 * 
 * 使用 fast-check 进行属性测试，验证文件名编码的往返一致性：
 * - 对于任意包含中文字符的文件名，经过 encodeURIComponent 编码后
 *   再经过 decodeURIComponent 解码，应该得到与原始文件名相同的字符串
 * 
 * **Validates: Requirements 12.1, 12.2**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ========== 辅助函数 ==========

/**
 * 解码文件名
 * 模拟 ResumeManager 组件中的 decodeFilename 函数
 */
function decodeFilename(filename: string): string {
  if (!filename) return '-'
  try {
    return decodeURIComponent(filename)
  } catch {
    return filename
  }
}

/**
 * 编码文件名
 * 模拟后端可能使用的编码方式
 */
function encodeFilename(filename: string): string {
  if (!filename) return ''
  return encodeURIComponent(filename)
}

// ========== 自定义生成器 ==========

/**
 * 生成中文字符
 */
const chineseCharArb = fc.integer({ min: 0x4E00, max: 0x9FFF }).map(code => String.fromCharCode(code))

/**
 * 生成中文字符串
 */
const chineseStringArb = fc.array(chineseCharArb, { minLength: 1, maxLength: 20 }).map(chars => chars.join(''))

/**
 * 生成混合字符串（中文 + 英文 + 数字）
 */
const mixedStringArb = fc.array(
  fc.oneof(
    chineseCharArb,
    fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'),
    fc.integer({ min: 0, max: 9 }).map(n => String(n))
  ),
  { minLength: 1, maxLength: 30 }
).map(chars => chars.join(''))

/**
 * 生成有效的文件名（不包含非法字符）
 */
const validFilenameArb = fc.tuple(
  mixedStringArb,
  fc.constantFrom('.pdf', '.doc', '.txt', '.jpg', '.png')
).map(([name, ext]) => {
  // 过滤掉文件名中的非法字符
  const safeName = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
  return safeName.length > 0 ? safeName + ext : 'file' + ext
})

/**
 * 生成纯中文文件名
 */
const chineseFilenameArb = fc.tuple(
  chineseStringArb,
  fc.constantFrom('.pdf', '.doc', '.txt')
).map(([name, ext]) => name + ext)

// ========== 测试套件 ==========

describe('中文文件名编码属性测试', () => {
  /**
   * Property 7: 中文文件名编码往返一致性
   * **Validates: Requirements 12.1, 12.2**
   */
  describe('Property 7: 中文文件名编码往返一致性', () => {
    it('对于任意中文文件名，编码后解码应得到原始文件名', () => {
      fc.assert(
        fc.property(chineseFilenameArb, (filename) => {
          // 编码
          const encoded = encodeFilename(filename)
          
          // 解码
          const decoded = decodeFilename(encoded)
          
          // 验证往返一致性
          expect(decoded).toBe(filename)
        }),
        { numRuns: 50 }
      )
    })

    it('对于任意混合字符文件名，编码后解码应得到原始文件名', () => {
      fc.assert(
        fc.property(validFilenameArb, (filename) => {
          // 编码
          const encoded = encodeFilename(filename)
          
          // 解码
          const decoded = decodeFilename(encoded)
          
          // 验证往返一致性
          expect(decoded).toBe(filename)
        }),
        { numRuns: 50 }
      )
    })

    it('对于任意 Unicode 字符串，编码后解码应得到原始字符串', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 50 }), (str) => {
          // 编码
          const encoded = encodeURIComponent(str)
          
          // 解码
          const decoded = decodeURIComponent(encoded)
          
          // 验证往返一致性
          expect(decoded).toBe(str)
        }),
        { numRuns: 50 }
      )
    })

    it('编码后的字符串应只包含 ASCII 安全字符', () => {
      fc.assert(
        fc.property(chineseFilenameArb, (filename) => {
          const encoded = encodeFilename(filename)
          
          // 编码后的字符串应该只包含 ASCII 字符
          // encodeURIComponent 会将非 ASCII 字符转换为 %XX 格式
          const asciiPattern = /^[\x00-\x7F]*$/
          expect(asciiPattern.test(encoded)).toBe(true)
        }),
        { numRuns: 30 }
      )
    })

    it('多次编码解码应保持一致性', () => {
      fc.assert(
        fc.property(
          chineseFilenameArb,
          fc.integer({ min: 2, max: 5 }),
          (filename, iterations) => {
            let current = filename
            
            // 多次编码解码
            for (let i = 0; i < iterations; i++) {
              const encoded = encodeFilename(current)
              current = decodeFilename(encoded)
            }
            
            // 最终结果应该与原始文件名相同
            expect(current).toBe(filename)
          }
        ),
        { numRuns: 30 }
      )
    })
  })

  describe('边界情况处理', () => {
    it('空字符串应返回默认值', () => {
      expect(decodeFilename('')).toBe('-')
    })

    it('已解码的字符串应保持不变', () => {
      const normalFilename = '简历.pdf'
      expect(decodeFilename(normalFilename)).toBe(normalFilename)
    })

    it('无效的编码字符串应返回原始值', () => {
      // 无效的 % 编码
      const invalidEncoded = '%ZZ%YY'
      expect(decodeFilename(invalidEncoded)).toBe(invalidEncoded)
    })

    it('特殊字符应正确处理', () => {
      const specialChars = [
        '文件 名.pdf',      // 空格
        '文件-名.pdf',      // 连字符
        '文件_名.pdf',      // 下划线
        '文件(1).pdf',      // 括号
        '文件【测试】.pdf', // 中文括号
      ]
      
      for (const filename of specialChars) {
        const encoded = encodeFilename(filename)
        const decoded = decodeFilename(encoded)
        expect(decoded).toBe(filename)
      }
    })

    it('常见中文简历文件名应正确处理', () => {
      const commonFilenames = [
        '张三_简历.pdf',
        '李四-前端工程师简历.pdf',
        '王五的个人简历2024.pdf',
        '简历_最新版.pdf',
        '个人简历（更新）.pdf'
      ]
      
      for (const filename of commonFilenames) {
        const encoded = encodeFilename(filename)
        const decoded = decodeFilename(encoded)
        expect(decoded).toBe(filename)
      }
    })
  })

  describe('编码格式验证', () => {
    it('中文字符应被编码为 %XX 格式', () => {
      const chineseChar = '中'
      const encoded = encodeFilename(chineseChar)
      
      // 中文字符在 UTF-8 中是多字节的，编码后应该包含 %
      expect(encoded).toContain('%')
      expect(encoded).not.toBe(chineseChar)
    })

    it('ASCII 字母和数字不应被编码', () => {
      const asciiOnly = 'abc123'
      const encoded = encodeFilename(asciiOnly)
      
      // ASCII 字母和数字不会被 encodeURIComponent 编码
      expect(encoded).toBe(asciiOnly)
    })

    it('文件扩展名应保持可读', () => {
      fc.assert(
        fc.property(chineseStringArb, (name) => {
          const filename = name + '.pdf'
          const encoded = encodeFilename(filename)
          
          // .pdf 扩展名中的点和字母不会被编码
          expect(encoded).toContain('.pdf')
        }),
        { numRuns: 20 }
      )
    })
  })
})
