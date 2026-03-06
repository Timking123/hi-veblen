/**
 * 文件编码处理器属性测试
 * 验证文件名编码往返一致性
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 */

import * as fc from 'fast-check'
import {
  encodeContentDisposition,
  validateFilename,
  normalizeFilename,
  isValidUtf8
} from '../fileEncoding'

describe('属性测试：文件名编码往返一致性', () => {
  /**
   * 属性 4: 文件名编码往返一致性
   * 
   * 对于任何包含多字节字符（中文、日文、韩文等）的文件名，
   * 上传文件后再下载，下载响应头中的文件名应该能正确解码回原始文件名。
   */
  it('属性 4: 文件名编码往返一致性 - 中文文件名应正确编码和解码', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成包含中文字符的文件名
        fc.tuple(
          fc.stringOf(
            fc.constantFrom(
              '简', '历', '文', '档', '测', '试', '个', '人', '资', '料',
              '项', '目', '报', '告', '总', '结', '计', '划', '方', '案'
            ),
            { minLength: 1, maxLength: 10 }
          ),
          fc.constantFrom('.pdf', '.doc', '.txt', '.jpg', '.png')
        ),
        async ([basename, ext]) => {
          const filename = basename + ext
          
          // 1. 编码文件名
          const contentDisposition = encodeContentDisposition(filename)
          
          // 2. 验证包含两种格式
          expect(contentDisposition).toContain('filename=')
          expect(contentDisposition).toContain('filename*=UTF-8\'\'')
          
          // 3. 提取 RFC 5987 编码的文件名
          const match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/)
          expect(match).toBeTruthy()
          
          if (match) {
            const encodedName = match[1]
            // 4. 解码文件名
            const decodedName = decodeURIComponent(encodedName)
            
            // 5. 验证解码后与原始文件名一致
            expect(decodedName).toBe(filename)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 4: 文件名编码往返一致性 - 日文文件名
   */
  it('属性 4: 文件名编码往返一致性 - 日文文件名应正确编码和解码', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.stringOf(
            fc.constantFrom(
              'あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ',
              'さ', 'し', 'す', 'せ', 'そ', 'た', 'ち', 'つ', 'て', 'と'
            ),
            { minLength: 1, maxLength: 10 }
          ),
          fc.constantFrom('.pdf', '.doc', '.txt')
        ),
        async ([basename, ext]) => {
          const filename = basename + ext
          
          const contentDisposition = encodeContentDisposition(filename)
          const match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/)
          
          if (match) {
            const decodedName = decodeURIComponent(match[1])
            expect(decodedName).toBe(filename)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 4: 文件名编码往返一致性 - 韩文文件名
   */
  it('属性 4: 文件名编码往返一致性 - 韩文文件名应正确编码和解码', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.stringOf(
            fc.constantFrom(
              '가', '나', '다', '라', '마', '바', '사', '아', '자', '차',
              '카', '타', '파', '하', '이', '름', '문', '서', '파', '일'
            ),
            { minLength: 1, maxLength: 10 }
          ),
          fc.constantFrom('.pdf', '.doc', '.txt')
        ),
        async ([basename, ext]) => {
          const filename = basename + ext
          
          const contentDisposition = encodeContentDisposition(filename)
          const match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/)
          
          if (match) {
            const decodedName = decodeURIComponent(match[1])
            expect(decodedName).toBe(filename)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 4: 文件名编码往返一致性 - 混合语言文件名
   */
  it('属性 4: 文件名编码往返一致性 - 混合语言文件名应正确编码和解码', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => {
            // 过滤掉包含非法字符的字符串
            return !/[<>:"|?*\x00-\x1F/\\]/.test(s) && s.trim() !== ''
          }),
          fc.constantFrom('.pdf', '.doc', '.txt', '.jpg', '.png')
        ),
        async ([basename, ext]) => {
          const filename = basename + ext
          
          // 只测试有效的 UTF-8 文件名
          if (!isValidUtf8(filename)) {
            return true
          }
          
          const contentDisposition = encodeContentDisposition(filename)
          const match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/)
          
          if (match) {
            const decodedName = decodeURIComponent(match[1])
            expect(decodedName).toBe(filename)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 4: 文件名编码往返一致性 - ASCII fallback 应该存在
   */
  it('属性 4: 文件名编码往返一致性 - 应提供 ASCII fallback', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.stringOf(
            fc.constantFrom('简', '历', '文', '档', '测', '试'),
            { minLength: 1, maxLength: 5 }
          ),
          fc.constantFrom('.pdf', '.doc')
        ),
        async ([basename, ext]) => {
          const filename = basename + ext
          
          const contentDisposition = encodeContentDisposition(filename)
          
          // 1. 验证包含 ASCII fallback
          const asciiMatch = contentDisposition.match(/filename="([^"]+)"/)
          expect(asciiMatch).toBeTruthy()
          
          if (asciiMatch) {
            const asciiFallback = asciiMatch[1]
            
            // 2. 验证 fallback 只包含 ASCII 字符
            expect(/^[\x00-\x7F]+$/.test(asciiFallback)).toBe(true)
            
            // 3. 验证 fallback 包含扩展名
            expect(asciiFallback).toContain(ext)
          }
          
          return true
        }
      ),
      { numRuns: 50 }
    )
  })
})

describe('属性测试：文件名验证和规范化', () => {
  /**
   * 属性：规范化后的文件名应该通过验证
   */
  it('属性：规范化后的文件名应该通过验证', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (filename) => {
          // 1. 规范化文件名
          const normalized = normalizeFilename(filename)
          
          // 2. 验证规范化后的文件名
          const validation = validateFilename(normalized)
          
          // 3. 规范化后的文件名应该通过验证
          expect(validation.valid).toBe(true)
          expect(validation.errors).toHaveLength(0)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性：规范化应该移除路径遍历字符
   */
  it('属性：规范化应该移除路径遍历字符', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.constantFrom('../', '..\\', '/', '\\'),
          fc.string({ minLength: 1, maxLength: 20 })
        ),
        async ([prefix, traversal, suffix]) => {
          const filename = prefix + traversal + suffix
          
          const normalized = normalizeFilename(filename)
          
          // 规范化后不应包含路径遍历字符
          expect(normalized).not.toContain('../')
          expect(normalized).not.toContain('..\\')
          
          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * 属性：规范化应该替换非法字符
   */
  it('属性：规范化应该替换非法字符', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 10 }),
          fc.constantFrom('<', '>', ':', '"', '|', '?', '*'),
          fc.string({ minLength: 1, maxLength: 10 })
        ),
        async ([prefix, illegalChar, suffix]) => {
          const filename = prefix + illegalChar + suffix
          
          const normalized = normalizeFilename(filename)
          
          // 规范化后不应包含非法字符
          expect(normalized).not.toContain(illegalChar)
          
          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * 属性：包含路径遍历的文件名应该验证失败
   */
  it('属性：包含路径遍历的文件名应该验证失败', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.constantFrom('../', '..\\', '../../', '..\\..\\')
        ),
        async ([basename, traversal]) => {
          const filename = traversal + basename
          
          const validation = validateFilename(filename)
          
          // 应该验证失败
          expect(validation.valid).toBe(false)
          expect(validation.errors.length).toBeGreaterThan(0)
          
          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * 属性：空文件名应该验证失败
   */
  it('属性：空文件名应该验证失败', () => {
    const emptyNames = ['', '   ', '\t', '\n']
    
    for (const name of emptyNames) {
      const validation = validateFilename(name)
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('文件名不能为空')
    }
  })

  /**
   * 属性：Windows 保留名称应该验证失败
   */
  it('属性：Windows 保留名称应该验证失败', () => {
    const reservedNames = [
      'CON', 'PRN', 'AUX', 'NUL',
      'COM1', 'COM2', 'COM9',
      'LPT1', 'LPT2', 'LPT9',
      'con.txt', 'prn.pdf', 'aux.doc'
    ]
    
    for (const name of reservedNames) {
      const validation = validateFilename(name)
      expect(validation.valid).toBe(false)
      expect(validation.errors.some(e => e.includes('保留名称'))).toBe(true)
    }
  })

  /**
   * 属性：规范化应该处理 Windows 保留名称
   */
  it('属性：规范化应该处理 Windows 保留名称', () => {
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT1']
    
    for (const name of reservedNames) {
      const normalized = normalizeFilename(name)
      
      // 规范化后应该添加前缀
      expect(normalized).toBe('_' + name)
      
      // 规范化后应该通过验证
      const validation = validateFilename(normalized)
      expect(validation.valid).toBe(true)
    }
  })

  /**
   * 属性：过长的文件名应该被截断
   */
  it('属性：过长的文件名应该被截断', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 300, maxLength: 500 }),
        async (longName) => {
          const normalized = normalizeFilename(longName)
          
          // 规范化后的文件名不应超过 255 字节
          const byteLength = Buffer.from(normalized, 'utf8').length
          expect(byteLength).toBeLessThanOrEqual(255)
          
          return true
        }
      ),
      { numRuns: 20 }
    )
  })
})

describe('属性测试：UTF-8 验证', () => {
  /**
   * 属性：有效的 UTF-8 字符串应该通过验证
   */
  it('属性：有效的 UTF-8 字符串应该通过验证', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (str) => {
          // JavaScript 字符串默认是有效的 UTF-8
          const result = isValidUtf8(str)
          expect(result).toBe(true)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性：中文字符串应该是有效的 UTF-8
   */
  it('属性：中文字符串应该是有效的 UTF-8', () => {
    const chineseStrings = [
      '简历',
      '个人资料',
      '项目文档',
      '测试文件',
      '黄彦杰-个人简历.pdf'
    ]
    
    for (const str of chineseStrings) {
      expect(isValidUtf8(str)).toBe(true)
    }
  })

  /**
   * 属性：日文字符串应该是有效的 UTF-8
   */
  it('属性：日文字符串应该是有效的 UTF-8', () => {
    const japaneseStrings = [
      'ファイル',
      'ドキュメント',
      'テスト',
      'プロジェクト'
    ]
    
    for (const str of japaneseStrings) {
      expect(isValidUtf8(str)).toBe(true)
    }
  })

  /**
   * 属性：韩文字符串应该是有效的 UTF-8
   */
  it('属性：韩文字符串应该是有效的 UTF-8', () => {
    const koreanStrings = [
      '파일',
      '문서',
      '테스트',
      '프로젝트'
    ]
    
    for (const str of koreanStrings) {
      expect(isValidUtf8(str)).toBe(true)
    }
  })
})
