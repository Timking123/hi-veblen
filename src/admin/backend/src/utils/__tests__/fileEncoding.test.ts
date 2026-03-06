/**
 * 文件编码处理器单元测试
 * 测试各种特殊字符和多语言文件名
 * 
 * **Validates: Requirements 3.4**
 */

import {
  encodeContentDisposition,
  validateFilename,
  normalizeFilename,
  isValidUtf8
} from '../fileEncoding'

describe('encodeContentDisposition（编码 Content-Disposition）', () => {
  it('应该正确编码中文文件名', () => {
    const filename = '黄彦杰-个人简历.pdf'
    const result = encodeContentDisposition(filename)
    
    // 应该包含两种格式
    expect(result).toContain('attachment')
    expect(result).toContain('filename=')
    expect(result).toContain('filename*=UTF-8\'\'')
    
    // 提取并验证 UTF-8 编码部分
    const match = result.match(/filename\*=UTF-8''([^;]+)/)
    expect(match).toBeTruthy()
    
    if (match) {
      const decoded = decodeURIComponent(match[1])
      expect(decoded).toBe(filename)
    }
  })

  it('应该正确编码日文文件名', () => {
    const filename = 'ドキュメント.pdf'
    const result = encodeContentDisposition(filename)
    
    const match = result.match(/filename\*=UTF-8''([^;]+)/)
    expect(match).toBeTruthy()
    
    if (match) {
      const decoded = decodeURIComponent(match[1])
      expect(decoded).toBe(filename)
    }
  })

  it('应该正确编码韩文文件名', () => {
    const filename = '문서파일.pdf'
    const result = encodeContentDisposition(filename)
    
    const match = result.match(/filename\*=UTF-8''([^;]+)/)
    expect(match).toBeTruthy()
    
    if (match) {
      const decoded = decodeURIComponent(match[1])
      expect(decoded).toBe(filename)
    }
  })

  it('应该为纯 ASCII 文件名提供相同的 fallback', () => {
    const filename = 'resume.pdf'
    const result = encodeContentDisposition(filename)
    
    // ASCII fallback 应该与原文件名相同
    expect(result).toContain(`filename="${filename}"`)
  })

  it('应该为包含特殊字符的文件名提供 ASCII fallback', () => {
    const filename = '简历(2024).pdf'
    const result = encodeContentDisposition(filename)
    
    // 提取 ASCII fallback
    const asciiMatch = result.match(/filename="([^"]+)"/)
    expect(asciiMatch).toBeTruthy()
    
    if (asciiMatch) {
      const asciiFallback = asciiMatch[1]
      // fallback 应该只包含 ASCII 字符
      expect(/^[\x00-\x7F]+$/.test(asciiFallback)).toBe(true)
      // 应该保留扩展名
      expect(asciiFallback).toContain('.pdf')
    }
  })

  it('应该正确处理包含空格的文件名', () => {
    const filename = '个人 简历 2024.pdf'
    const result = encodeContentDisposition(filename)
    
    const match = result.match(/filename\*=UTF-8''([^;]+)/)
    expect(match).toBeTruthy()
    
    if (match) {
      const decoded = decodeURIComponent(match[1])
      expect(decoded).toBe(filename)
    }
  })

  it('应该正确处理包含括号的文件名', () => {
    const filename = '简历(最终版).pdf'
    const result = encodeContentDisposition(filename)
    
    const match = result.match(/filename\*=UTF-8''([^;]+)/)
    expect(match).toBeTruthy()
    
    if (match) {
      const decoded = decodeURIComponent(match[1])
      expect(decoded).toBe(filename)
    }
  })

  it('应该正确处理包含单引号的文件名', () => {
    const filename = "John's Resume.pdf"
    const result = encodeContentDisposition(filename)
    
    const match = result.match(/filename\*=UTF-8''([^;]+)/)
    expect(match).toBeTruthy()
    
    if (match) {
      const decoded = decodeURIComponent(match[1])
      expect(decoded).toBe(filename)
    }
  })
})

describe('validateFilename（验证文件名）', () => {
  it('应该接受有效的中文文件名', () => {
    const validNames = [
      '简历.pdf',
      '个人资料.doc',
      '项目文档.txt',
      '测试文件123.jpg'
    ]
    
    for (const name of validNames) {
      const result = validateFilename(name)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    }
  })

  it('应该接受有效的日文文件名', () => {
    const validNames = [
      'ファイル.pdf',
      'ドキュメント.doc',
      'テスト.txt'
    ]
    
    for (const name of validNames) {
      const result = validateFilename(name)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    }
  })

  it('应该接受有效的韩文文件名', () => {
    const validNames = [
      '파일.pdf',
      '문서.doc',
      '테스트.txt'
    ]
    
    for (const name of validNames) {
      const result = validateFilename(name)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    }
  })

  it('应该拒绝空文件名', () => {
    const invalidNames = ['', '   ', '\t', '\n']
    
    for (const name of invalidNames) {
      const result = validateFilename(name)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('文件名不能为空')
    }
  })

  it('应该拒绝包含路径遍历的文件名', () => {
    const invalidNames = [
      '../file.pdf',
      '..\\file.pdf',
      'folder/../file.pdf',
      '../../etc/passwd'
    ]
    
    for (const name of invalidNames) {
      const result = validateFilename(name)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('路径遍历'))).toBe(true)
    }
  })

  it('应该拒绝包含非法字符的文件名', () => {
    const invalidChars = ['<', '>', ':', '"', '|', '?', '*']
    
    for (const char of invalidChars) {
      const filename = `file${char}name.pdf`
      const result = validateFilename(filename)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('非法字符'))).toBe(true)
    }
  })

  it('应该拒绝 Windows 保留名称', () => {
    const reservedNames = [
      'CON', 'PRN', 'AUX', 'NUL',
      'COM1', 'COM2', 'COM9',
      'LPT1', 'LPT2', 'LPT9',
      'con.txt', 'prn.pdf'
    ]
    
    for (const name of reservedNames) {
      const result = validateFilename(name)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('保留名称'))).toBe(true)
    }
  })

  it('应该拒绝过长的文件名', () => {
    // 创建一个超过 255 字节的文件名
    const longName = 'a'.repeat(300) + '.pdf'
    const result = validateFilename(longName)
    
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('过长'))).toBe(true)
  })

  it('应该接受包含空格的文件名', () => {
    const filename = '个人 简历 2024.pdf'
    const result = validateFilename(filename)
    
    expect(result.valid).toBe(true)
  })

  it('应该接受包含连字符和下划线的文件名', () => {
    const validNames = [
      'my-resume.pdf',
      'my_resume.pdf',
      'resume-2024_final.pdf'
    ]
    
    for (const name of validNames) {
      const result = validateFilename(name)
      expect(result.valid).toBe(true)
    }
  })
})

describe('normalizeFilename（规范化文件名）', () => {
  it('应该移除路径遍历字符', () => {
    const testCases = [
      { input: '../file.pdf', expected: 'file.pdf' },
      { input: '..\\file.pdf', expected: 'file.pdf' },
      { input: 'folder/../file.pdf', expected: 'folder_file.pdf' }
    ]
    
    for (const { input, expected } of testCases) {
      const result = normalizeFilename(input)
      expect(result).not.toContain('..')
      expect(result).not.toContain('/')
      expect(result).not.toContain('\\')
    }
  })

  it('应该替换非法字符为下划线', () => {
    const testCases = [
      { input: 'file<name>.pdf', expected: 'file_name_.pdf' },
      { input: 'file:name.pdf', expected: 'file_name.pdf' },
      { input: 'file|name.pdf', expected: 'file_name.pdf' },
      { input: 'file?name.pdf', expected: 'file_name.pdf' },
      { input: 'file*name.pdf', expected: 'file_name.pdf' }
    ]
    
    for (const { input, expected } of testCases) {
      const result = normalizeFilename(input)
      expect(result).toBe(expected)
    }
  })

  it('应该移除开头和结尾的点和空格', () => {
    const testCases = [
      { input: '  file.pdf  ', expected: 'file.pdf' },
      { input: '...file.pdf', expected: 'file.pdf' },
      { input: 'file.pdf...', expected: 'file.pdf' },
      { input: '. file.pdf .', expected: 'file.pdf' }
    ]
    
    for (const { input, expected } of testCases) {
      const result = normalizeFilename(input)
      expect(result).toBe(expected)
    }
  })

  it('应该处理 Windows 保留名称', () => {
    const testCases = [
      { input: 'CON', expected: '_CON' },
      { input: 'PRN', expected: '_PRN' },
      { input: 'AUX', expected: '_AUX' },
      { input: 'COM1', expected: '_COM1' },
      { input: 'LPT1', expected: '_LPT1' }
    ]
    
    for (const { input, expected } of testCases) {
      const result = normalizeFilename(input)
      expect(result).toBe(expected)
    }
  })

  it('应该为空文件名提供默认名称', () => {
    const invalidInputs = ['', '   ', '...', '<<<>>>']
    
    for (const input of invalidInputs) {
      const result = normalizeFilename(input)
      expect(result).toBe('unnamed_file')
    }
  })

  it('应该保留有效的中文文件名', () => {
    const filename = '个人简历.pdf'
    const result = normalizeFilename(filename)
    
    expect(result).toBe(filename)
  })

  it('应该保留有效的日文文件名', () => {
    const filename = 'ドキュメント.pdf'
    const result = normalizeFilename(filename)
    
    expect(result).toBe(filename)
  })

  it('应该保留有效的韩文文件名', () => {
    const filename = '문서파일.pdf'
    const result = normalizeFilename(filename)
    
    expect(result).toBe(filename)
  })

  it('应该截断过长的文件名', () => {
    // 创建一个超过 255 字节的文件名
    const longName = 'a'.repeat(300) + '.pdf'
    const result = normalizeFilename(longName)
    
    // 结果应该不超过 255 字节
    const byteLength = Buffer.from(result, 'utf8').length
    expect(byteLength).toBeLessThanOrEqual(255)
    
    // 应该保留扩展名
    expect(result).toContain('.pdf')
  })

  it('应该截断过长的中文文件名并保留扩展名', () => {
    // 创建一个超过 255 字节的中文文件名（每个中文字符 3 字节）
    const longName = '测'.repeat(100) + '.pdf'
    const result = normalizeFilename(longName)
    
    // 结果应该不超过 255 字节
    const byteLength = Buffer.from(result, 'utf8').length
    expect(byteLength).toBeLessThanOrEqual(255)
    
    // 应该保留扩展名
    expect(result).toEndWith('.pdf')
  })

  it('应该处理没有扩展名的长文件名', () => {
    const longName = 'a'.repeat(300)
    const result = normalizeFilename(longName)
    
    const byteLength = Buffer.from(result, 'utf8').length
    expect(byteLength).toBeLessThanOrEqual(255)
  })

  it('规范化后的文件名应该通过验证', () => {
    const problematicNames = [
      '../../../etc/passwd',
      'file<>:"|?*.pdf',
      '  ...file...  ',
      'CON',
      'a'.repeat(300) + '.pdf'
    ]
    
    for (const name of problematicNames) {
      const normalized = normalizeFilename(name)
      const validation = validateFilename(normalized)
      
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    }
  })
})

describe('isValidUtf8（验证 UTF-8）', () => {
  it('应该接受有效的 ASCII 字符串', () => {
    const validStrings = [
      'hello',
      'test.pdf',
      'file123',
      'my-file_name.txt'
    ]
    
    for (const str of validStrings) {
      expect(isValidUtf8(str)).toBe(true)
    }
  })

  it('应该接受有效的中文字符串', () => {
    const validStrings = [
      '简历',
      '个人资料',
      '项目文档',
      '测试文件',
      '黄彦杰-个人简历.pdf'
    ]
    
    for (const str of validStrings) {
      expect(isValidUtf8(str)).toBe(true)
    }
  })

  it('应该接受有效的日文字符串', () => {
    const validStrings = [
      'ファイル',
      'ドキュメント',
      'テスト',
      'プロジェクト.pdf'
    ]
    
    for (const str of validStrings) {
      expect(isValidUtf8(str)).toBe(true)
    }
  })

  it('应该接受有效的韩文字符串', () => {
    const validStrings = [
      '파일',
      '문서',
      '테스트',
      '프로젝트.pdf'
    ]
    
    for (const str of validStrings) {
      expect(isValidUtf8(str)).toBe(true)
    }
  })

  it('应该接受混合语言字符串', () => {
    const validStrings = [
      'Resume简历.pdf',
      'Project项目文档.doc',
      'Test测试ファイル.txt'
    ]
    
    for (const str of validStrings) {
      expect(isValidUtf8(str)).toBe(true)
    }
  })

  it('应该接受包含 emoji 的字符串', () => {
    const validStrings = [
      '📄 文档.pdf',
      '✅ 完成.txt',
      '🎉 项目.doc'
    ]
    
    for (const str of validStrings) {
      expect(isValidUtf8(str)).toBe(true)
    }
  })

  it('应该接受空字符串', () => {
    expect(isValidUtf8('')).toBe(true)
  })
})
