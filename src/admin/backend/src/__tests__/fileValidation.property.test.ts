/**
 * 文件验证属性测试（Property-Based Testing）
 * 使用 fast-check 库测试文件上传安全验证的正确性属性
 * 
 * **Feature: project-audit-upgrade**
 * - Property 6: 文件类型双重验证
 * - Property 7: 文件大小限制
 * 
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
 */

import * as fc from 'fast-check'
import {
  validateMagicBytes,
  validateFileSize,
  isValidImageFile,
  isValidAudioFile,
  isPdfFile,
  FILE_SIZE_LIMITS
} from '../services/file'

// ========== Magic Bytes 常量 ==========

/**
 * 有效的 Magic Bytes 签名
 */
const VALID_MAGIC_BYTES: Record<string, Buffer[]> = {
  'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
  'image/gif': [Buffer.from([0x47, 0x49, 0x46])],
  'image/webp': [Buffer.from([0x52, 0x49, 0x46, 0x46])],
  'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])],
  'audio/mpeg': [
    Buffer.from([0xFF, 0xFB]),
    Buffer.from([0xFF, 0xF3]),
    Buffer.from([0xFF, 0xF2]),
    Buffer.from([0x49, 0x44, 0x33])
  ],
  'audio/ogg': [Buffer.from([0x4F, 0x67, 0x67, 0x53])],
  'audio/wav': [Buffer.from([0x52, 0x49, 0x46, 0x46])]
}

/**
 * 无效的 Magic Bytes（用于测试）
 */
const INVALID_MAGIC_BYTES = Buffer.from([0x00, 0x00, 0x00, 0x00])

// ========== 文件生成器 ==========

/**
 * 生成有效的文件扩展名
 */
const validImageExtensionArb = fc.constantFrom('.jpg', '.jpeg', '.png', '.webp')
const validAudioExtensionArb = fc.constantFrom('.mp3', '.ogg')
const validPdfExtensionArb = fc.constant('.pdf')

/**
 * 生成无效的文件扩展名
 */
const invalidExtensionArb = fc.constantFrom(
  '.exe', '.bat', '.sh', '.dll', '.so',
  '.txt', '.doc', '.zip', '.rar'
)

/**
 * 生成文件名
 */
const filenameArb = (extensionArb: fc.Arbitrary<string>) =>
  fc.tuple(
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_-'), { minLength: 1, maxLength: 20 }),
    extensionArb
  ).map(([name, ext]) => `${name}${ext}`)

/**
 * 生成带有正确 Magic Bytes 的文件内容
 */
function createFileWithMagicBytes(mimeType: string, additionalSize: number = 100): Buffer {
  const signatures = VALID_MAGIC_BYTES[mimeType]
  if (!signatures || signatures.length === 0) {
    throw new Error(`未知的 MIME 类型: ${mimeType}`)
  }
  
  // 使用第一个签名
  const signature = signatures[0]
  
  // 创建包含签名和额外数据的缓冲区
  const buffer = Buffer.alloc(signature.length + additionalSize)
  signature.copy(buffer, 0)
  
  // 填充随机数据
  for (let i = signature.length; i < buffer.length; i++) {
    buffer[i] = Math.floor(Math.random() * 256)
  }
  
  return buffer
}

/**
 * 生成带有错误 Magic Bytes 的文件内容
 */
function createFileWithInvalidMagicBytes(size: number = 100): Buffer {
  const buffer = Buffer.alloc(size)
  INVALID_MAGIC_BYTES.copy(buffer, 0)
  
  // 填充随机数据
  for (let i = INVALID_MAGIC_BYTES.length; i < buffer.length; i++) {
    buffer[i] = Math.floor(Math.random() * 256)
  }
  
  return buffer
}

// ========== 测试套件 ==========

describe('Property 6: 文件类型双重验证', () => {
  /**
   * 属性 6a：扩展名和 Magic Bytes 都正确时，验证应该通过
   * 
   * **Validates: Requirements 6.1**
   */
  it('扩展名和 Magic Bytes 都正确时，图片验证应该通过', async () => {
    const validImageArb = fc.oneof(
      // JPEG 文件
      fc.tuple(
        fc.constantFrom('.jpg', '.jpeg'),
        fc.constant('image/jpeg')
      ),
      // PNG 文件
      fc.tuple(
        fc.constant('.png'),
        fc.constant('image/png')
      ),
      // WebP 文件
      fc.tuple(
        fc.constant('.webp'),
        fc.constant('image/webp')
      )
    ).chain(([ext, mimeType]) => {
      return fc.record({
        filename: filenameArb(fc.constant(ext)).map(name => name),
        buffer: fc.constant(createFileWithMagicBytes(mimeType, 1000))
      })
    })
    
    await fc.assert(
      fc.asyncProperty(validImageArb, async (file) => {
        const result = isValidImageFile(file.filename, file.buffer)
        expect(result).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 6b：扩展名正确但 Magic Bytes 错误时，验证应该失败
   * 
   * **Validates: Requirements 6.4**
   */
  it('扩展名正确但 Magic Bytes 错误时，图片验证应该失败', async () => {
    const invalidImageArb = fc.record({
      filename: filenameArb(validImageExtensionArb),
      buffer: fc.constant(createFileWithInvalidMagicBytes(1000))
    })
    
    await fc.assert(
      fc.asyncProperty(invalidImageArb, async (file) => {
        const result = isValidImageFile(file.filename, file.buffer)
        expect(result).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 6c：扩展名错误时，无论 Magic Bytes 如何，验证都应该失败
   * 
   * **Validates: Requirements 6.3**
   */
  it('扩展名错误时，图片验证应该失败', async () => {
    const invalidExtImageArb = fc.record({
      filename: filenameArb(invalidExtensionArb),
      buffer: fc.oneof(
        fc.constant(createFileWithMagicBytes('image/jpeg', 1000)),
        fc.constant(createFileWithInvalidMagicBytes(1000))
      )
    })
    
    await fc.assert(
      fc.asyncProperty(invalidExtImageArb, async (file) => {
        const result = isValidImageFile(file.filename, file.buffer)
        expect(result).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 6d：音频文件的双重验证 - 扩展名和 Magic Bytes 都正确
   * 
   * **Validates: Requirements 6.1**
   */
  it('扩展名和 Magic Bytes 都正确时，音频验证应该通过', async () => {
    const validAudioArb = fc.oneof(
      // MP3 文件
      fc.tuple(
        fc.constant('.mp3'),
        fc.constant('audio/mpeg')
      ),
      // OGG 文件
      fc.tuple(
        fc.constant('.ogg'),
        fc.constant('audio/ogg')
      )
    ).chain(([ext, mimeType]) => {
      return fc.record({
        filename: filenameArb(fc.constant(ext)).map(name => name),
        buffer: fc.constant(createFileWithMagicBytes(mimeType, 1000))
      })
    })
    
    await fc.assert(
      fc.asyncProperty(validAudioArb, async (file) => {
        const result = isValidAudioFile(file.filename, file.buffer)
        expect(result).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 6e：音频文件 - 扩展名正确但 Magic Bytes 错误
   * 
   * **Validates: Requirements 6.4**
   */
  it('扩展名正确但 Magic Bytes 错误时，音频验证应该失败', async () => {
    const invalidAudioArb = fc.record({
      filename: filenameArb(validAudioExtensionArb),
      buffer: fc.constant(createFileWithInvalidMagicBytes(1000))
    })
    
    await fc.assert(
      fc.asyncProperty(invalidAudioArb, async (file) => {
        const result = isValidAudioFile(file.filename, file.buffer)
        expect(result).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 6f：PDF 文件的双重验证 - 扩展名和 Magic Bytes 都正确
   * 
   * **Validates: Requirements 6.1**
   */
  it('扩展名和 Magic Bytes 都正确时，PDF 验证应该通过', async () => {
    const validPdfArb = fc.record({
      filename: filenameArb(validPdfExtensionArb),
      buffer: fc.constant(createFileWithMagicBytes('application/pdf', 1000))
    })
    
    await fc.assert(
      fc.asyncProperty(validPdfArb, async (file) => {
        const result = isPdfFile(file.filename, file.buffer)
        expect(result).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 6g：PDF 文件 - 扩展名正确但 Magic Bytes 错误
   * 
   * **Validates: Requirements 6.4**
   */
  it('扩展名正确但 Magic Bytes 错误时，PDF 验证应该失败', async () => {
    const invalidPdfArb = fc.record({
      filename: filenameArb(validPdfExtensionArb),
      buffer: fc.constant(createFileWithInvalidMagicBytes(1000))
    })
    
    await fc.assert(
      fc.asyncProperty(invalidPdfArb, async (file) => {
        const result = isPdfFile(file.filename, file.buffer)
        expect(result).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 6h：Magic Bytes 验证函数的正确性
   * 
   * **Validates: Requirements 6.1**
   */
  it('validateMagicBytes 应该正确识别有效的文件签名', async () => {
    const mimeTypeArb = fc.constantFrom(
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'audio/mpeg',
      'audio/ogg'
    )
    
    await fc.assert(
      fc.asyncProperty(mimeTypeArb, async (mimeType) => {
        const buffer = createFileWithMagicBytes(mimeType, 500)
        const result = validateMagicBytes(buffer, mimeType)
        expect(result).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 6i：Magic Bytes 验证应该拒绝错误的签名
   * 
   * **Validates: Requirements 6.4**
   */
  it('validateMagicBytes 应该拒绝错误的文件签名', async () => {
    const mimeTypeArb = fc.constantFrom(
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'audio/mpeg',
      'audio/ogg'
    )
    
    await fc.assert(
      fc.asyncProperty(mimeTypeArb, async (mimeType) => {
        const buffer = createFileWithInvalidMagicBytes(500)
        const result = validateMagicBytes(buffer, mimeType)
        expect(result).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 6j：文件类型不匹配时应该失败
   * 
   * **Validates: Requirements 6.4**
   */
  it('文件内容与声明类型不匹配时应该失败', async () => {
    const mismatchArb = fc.record({
      actualType: fc.constantFrom('image/jpeg', 'image/png', 'application/pdf'),
      declaredType: fc.constantFrom('image/jpeg', 'image/png', 'application/pdf')
    }).filter(config => config.actualType !== config.declaredType)
    
    await fc.assert(
      fc.asyncProperty(mismatchArb, async (config) => {
        // 创建一个类型的文件，但用另一个类型验证
        const buffer = createFileWithMagicBytes(config.actualType, 500)
        const result = validateMagicBytes(buffer, config.declaredType)
        expect(result).toBe(false)
      }),
      { numRuns: 100 }
    )
  })
})

describe('Property 7: 文件大小限制', () => {
  /**
   * 属性 7a：未超过限制的文件应该通过验证
   * 
   * **Validates: Requirements 6.2**
   */
  it('未超过限制的图片文件应该通过验证', async () => {
    const validSizeArb = fc.integer({ min: 1, max: FILE_SIZE_LIMITS.image })
    
    await fc.assert(
      fc.asyncProperty(validSizeArb, async (size) => {
        const result = validateFileSize(size, 'image')
        expect(result).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 7b：超过限制的文件应该被拒绝
   * 
   * **Validates: Requirements 6.2**
   */
  it('超过限制的图片文件应该被拒绝', async () => {
    const invalidSizeArb = fc.integer({ 
      min: FILE_SIZE_LIMITS.image + 1, 
      max: FILE_SIZE_LIMITS.image + 100 * 1024 * 1024 
    })
    
    await fc.assert(
      fc.asyncProperty(invalidSizeArb, async (size) => {
        const result = validateFileSize(size, 'image')
        expect(result).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 7c：音频文件大小限制验证
   * 
   * **Validates: Requirements 6.2**
   */
  it('音频文件应该遵守 50MB 的大小限制', async () => {
    const sizeArb = fc.integer({ min: 1, max: FILE_SIZE_LIMITS.audio + 10 * 1024 * 1024 })
    
    await fc.assert(
      fc.asyncProperty(sizeArb, async (size) => {
        const result = validateFileSize(size, 'audio')
        const expected = size <= FILE_SIZE_LIMITS.audio
        expect(result).toBe(expected)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 7d：简历 PDF 文件大小限制验证
   * 
   * **Validates: Requirements 6.2**
   */
  it('简历 PDF 应该遵守 20MB 的大小限制', async () => {
    const sizeArb = fc.integer({ min: 1, max: FILE_SIZE_LIMITS.resume + 10 * 1024 * 1024 })
    
    await fc.assert(
      fc.asyncProperty(sizeArb, async (size) => {
        const result = validateFileSize(size, 'resume')
        const expected = size <= FILE_SIZE_LIMITS.resume
        expect(result).toBe(expected)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 7e：边界值测试 - 恰好等于限制的文件应该通过
   * 
   * **Validates: Requirements 6.2**
   */
  it('恰好等于限制的文件应该通过验证', async () => {
    const fileTypeArb = fc.constantFrom<'image' | 'audio' | 'resume'>('image', 'audio', 'resume')
    
    await fc.assert(
      fc.asyncProperty(fileTypeArb, async (fileType) => {
        const limit = FILE_SIZE_LIMITS[fileType]
        const result = validateFileSize(limit, fileType)
        expect(result).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 7f：边界值测试 - 超过限制 1 字节的文件应该被拒绝
   * 
   * **Validates: Requirements 6.2**
   */
  it('超过限制 1 字节的文件应该被拒绝', async () => {
    const fileTypeArb = fc.constantFrom<'image' | 'audio' | 'resume'>('image', 'audio', 'resume')
    
    await fc.assert(
      fc.asyncProperty(fileTypeArb, async (fileType) => {
        const limit = FILE_SIZE_LIMITS[fileType]
        const result = validateFileSize(limit + 1, fileType)
        expect(result).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 7g：零字节文件应该被拒绝
   * 
   * **Validates: Requirements 6.2**
   */
  it('零字节文件应该被拒绝', async () => {
    const fileTypeArb = fc.constantFrom<'image' | 'audio' | 'resume'>('image', 'audio', 'resume')
    
    await fc.assert(
      fc.asyncProperty(fileTypeArb, async (fileType) => {
        const result = validateFileSize(0, fileType)
        expect(result).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 7h：不同文件类型有不同的大小限制
   * 
   * **Validates: Requirements 6.2**
   */
  it('不同文件类型应该有不同的大小限制', async () => {
    // 验证限制值的正确性
    expect(FILE_SIZE_LIMITS.image).toBe(10 * 1024 * 1024)  // 10MB
    expect(FILE_SIZE_LIMITS.audio).toBe(50 * 1024 * 1024)  // 50MB
    expect(FILE_SIZE_LIMITS.resume).toBe(20 * 1024 * 1024) // 20MB
    
    // 验证限制的相对大小关系
    expect(FILE_SIZE_LIMITS.audio).toBeGreaterThan(FILE_SIZE_LIMITS.resume)
    expect(FILE_SIZE_LIMITS.resume).toBeGreaterThan(FILE_SIZE_LIMITS.image)
  })

  /**
   * 属性 7i：大小验证应该对所有有效大小范围一致
   * 
   * **Validates: Requirements 6.2**
   */
  it('大小验证应该对所有有效大小范围一致', async () => {
    const configArb = fc.record({
      fileType: fc.constantFrom<'image' | 'audio' | 'resume'>('image', 'audio', 'resume'),
      size: fc.integer({ min: 1, max: 100 * 1024 * 1024 })
    })
    
    await fc.assert(
      fc.asyncProperty(configArb, async (config) => {
        const result = validateFileSize(config.size, config.fileType)
        const limit = FILE_SIZE_LIMITS[config.fileType]
        const expected = config.size <= limit
        expect(result).toBe(expected)
      }),
      { numRuns: 200 }
    )
  })
})
