/**
 * 文件管理属性测试
 * 
 * 使用属性测试验证文件管理服务的通用正确性属性
 * 
 * **Feature: admin-system, Property 8-9: 文件管理正确性**
 * 
 * 验证需求: 5.1.1, 5.1.2, 5.2.1, 5.3.1
 */

import { describe, it, expect } from '@jest/globals'
import * as fc from 'fast-check'
import { initDatabase, closeDatabase } from '../database/init'
import {
  isPdfFile,
  isValidImageFile,
  isValidAudioFile,
  uploadResume,
  getResumeVersions,
  deleteResumeVersion,
  MAX_RESUME_VERSIONS
} from '../services/file'

describe('文件管理属性测试', () => {
  /**
   * Property 8: 文件类型验证正确性
   * 
   * 对于任意上传的文件，系统应该正确验证文件类型：
   * - 简历只接受 PDF
   * - 图片只接受 JPG/PNG/WebP
   * - 音频只接受 MP3/OGG
   * 
   * **Validates: Requirements 5.1.1, 5.2.1, 5.3.1**
   */
  describe('Property 8: 文件类型验证正确性', () => {
    describe('PDF 文件验证', () => {
      it('有效的 PDF 文件名应该通过验证', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => !s.includes('/') && !s.includes('\\'))
              .map(s => `${s}.pdf`),
            (filename) => {
              const result = isPdfFile(filename)
              expect(result).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('非 PDF 扩展名应该被拒绝', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => !s.includes('/') && !s.includes('\\')),
            fc.constantFrom('.doc', '.docx', '.txt', '.jpg', '.png', '.mp3', '.ogg', '.zip'),
            (basename, ext) => {
              const filename = `${basename}${ext}`
              const result = isPdfFile(filename)
              expect(result).toBe(false)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('PDF 文件头验证应该正确识别真实 PDF', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => !s.includes('/') && !s.includes('\\'))
              .map(s => `${s}.pdf`),
            fc.uint8Array({ minLength: 10, maxLength: 100 }),
            (filename, randomBytes) => {
              // 创建有效的 PDF 文件头
              const pdfHeader = Buffer.from('%PDF-1.4\n')
              const validPdfBuffer = Buffer.concat([pdfHeader, Buffer.from(randomBytes)])
              
              const result = isPdfFile(filename, validPdfBuffer)
              expect(result).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('PDF 文件头验证应该拒绝伪造的 PDF', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => !s.includes('/') && !s.includes('\\'))
              .map(s => `${s}.pdf`),
            fc.uint8Array({ minLength: 10, maxLength: 100 }),
            (filename, randomBytes) => {
              // 创建无效的文件头（不是 %PDF）
              const invalidBuffer = Buffer.from(randomBytes)
              
              // 确保不是以 %PDF 开头
              if (invalidBuffer.length >= 4) {
                const header = invalidBuffer.subarray(0, 4).toString('ascii')
                if (header === '%PDF') {
                  // 如果碰巧是 %PDF，修改第一个字节
                  invalidBuffer[0] = 0x00
                }
              }
              
              const result = isPdfFile(filename, invalidBuffer)
              expect(result).toBe(false)
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('图片文件验证', () => {
      it('有效的图片扩展名应该通过验证', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => !s.includes('/') && !s.includes('\\')),
            fc.constantFrom('.jpg', '.jpeg', '.png', '.webp'),
            (basename, ext) => {
              const filename = `${basename}${ext}`
              const result = isValidImageFile(filename)
              expect(result).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('无效的图片扩展名应该被拒绝', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => !s.includes('/') && !s.includes('\\')),
            fc.constantFrom('.pdf', '.doc', '.txt', '.mp3', '.ogg', '.zip', '.exe'),
            (basename, ext) => {
              const filename = `${basename}${ext}`
              const result = isValidImageFile(filename)
              expect(result).toBe(false)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('JPEG 文件头验证应该正确识别真实 JPEG', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => !s.includes('/') && !s.includes('\\'))
              .map(s => `${s}.jpg`),
            fc.uint8Array({ minLength: 10, maxLength: 100 }),
            (filename, randomBytes) => {
              // 创建有效的 JPEG 文件头 (FF D8 FF)
              const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF])
              const validJpegBuffer = Buffer.concat([jpegHeader, Buffer.from(randomBytes)])
              
              const result = isValidImageFile(filename, validJpegBuffer)
              expect(result).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('PNG 文件头验证应该正确识别真实 PNG', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => !s.includes('/') && !s.includes('\\'))
              .map(s => `${s}.png`),
            fc.uint8Array({ minLength: 10, maxLength: 100 }),
            (filename, randomBytes) => {
              // 创建有效的 PNG 文件头 (89 50 4E 47)
              const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
              const validPngBuffer = Buffer.concat([pngHeader, Buffer.from(randomBytes)])
              
              const result = isValidImageFile(filename, validPngBuffer)
              expect(result).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('WebP 文件头验证应该正确识别真实 WebP', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => !s.includes('/') && !s.includes('\\'))
              .map(s => `${s}.webp`),
            fc.uint8Array({ minLength: 10, maxLength: 100 }),
            (filename, randomBytes) => {
              // 创建有效的 WebP 文件头 (RIFF....WEBP)
              const riffHeader = Buffer.from('RIFF')
              const fileSize = Buffer.alloc(4) // 文件大小占位符
              const webpHeader = Buffer.from('WEBP')
              const validWebpBuffer = Buffer.concat([
                riffHeader,
                fileSize,
                webpHeader,
                Buffer.from(randomBytes)
              ])
              
              const result = isValidImageFile(filename, validWebpBuffer)
              expect(result).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('图片文件头验证应该拒绝伪造的图片', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => !s.includes('/') && !s.includes('\\')),
            fc.constantFrom('.jpg', '.png', '.webp'),
            fc.uint8Array({ minLength: 10, maxLength: 100 }),
            (basename, ext, randomBytes) => {
              const filename = `${basename}${ext}`
              const invalidBuffer = Buffer.from(randomBytes)
              
              // 确保不是有效的图片文件头
              if (invalidBuffer.length >= 4) {
                // 破坏可能的有效文件头
                if (ext === '.jpg' && invalidBuffer[0] === 0xFF && invalidBuffer[1] === 0xD8) {
                  invalidBuffer[0] = 0x00
                } else if (ext === '.png' && invalidBuffer[0] === 0x89 && invalidBuffer[1] === 0x50) {
                  invalidBuffer[0] = 0x00
                } else if (ext === '.webp' && invalidBuffer.subarray(0, 4).toString('ascii') === 'RIFF') {
                  invalidBuffer[0] = 0x00
                }
              }
              
              const result = isValidImageFile(filename, invalidBuffer)
              
              // 如果文件头无效，应该返回 false
              // 注意：如果没有提供 buffer 或 buffer 太小，只检查扩展名，会返回 true
              if (invalidBuffer.length >= 4) {
                const isValidHeader = 
                  (ext === '.jpg' && invalidBuffer[0] === 0xFF && invalidBuffer[1] === 0xD8 && invalidBuffer[2] === 0xFF) ||
                  (ext === '.png' && invalidBuffer[0] === 0x89 && invalidBuffer[1] === 0x50 && invalidBuffer[2] === 0x4E && invalidBuffer[3] === 0x47) ||
                  (ext === '.webp' && invalidBuffer.length >= 12 && 
                   invalidBuffer.subarray(0, 4).toString('ascii') === 'RIFF' && 
                   invalidBuffer.subarray(8, 12).toString('ascii') === 'WEBP')
                
                expect(result).toBe(isValidHeader)
              }
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('音频文件验证', () => {
      it('有效的音频扩展名应该通过验证', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => !s.includes('/') && !s.includes('\\')),
            fc.constantFrom('.mp3', '.ogg'),
            (basename, ext) => {
              const filename = `${basename}${ext}`
              const result = isValidAudioFile(filename)
              expect(result).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('无效的音频扩展名应该被拒绝', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => !s.includes('/') && !s.includes('\\')),
            fc.constantFrom('.pdf', '.doc', '.txt', '.jpg', '.png', '.wav', '.m4a', '.zip'),
            (basename, ext) => {
              const filename = `${basename}${ext}`
              const result = isValidAudioFile(filename)
              expect(result).toBe(false)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('MP3 文件头验证应该正确识别真实 MP3 (ID3 标签)', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => !s.includes('/') && !s.includes('\\'))
              .map(s => `${s}.mp3`),
            fc.uint8Array({ minLength: 10, maxLength: 100 }),
            (filename, randomBytes) => {
              // 创建有效的 MP3 文件头 (ID3)
              const mp3Header = Buffer.from('ID3')
              const validMp3Buffer = Buffer.concat([mp3Header, Buffer.from(randomBytes)])
              
              const result = isValidAudioFile(filename, validMp3Buffer)
              expect(result).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('MP3 文件头验证应该正确识别真实 MP3 (帧同步)', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => !s.includes('/') && !s.includes('\\'))
              .map(s => `${s}.mp3`),
            fc.uint8Array({ minLength: 10, maxLength: 100 }),
            (filename, randomBytes) => {
              // 创建有效的 MP3 帧同步字 (FF Fx)
              const mp3Header = Buffer.from([0xFF, 0xFB]) // FF FB 是常见的 MP3 帧同步字
              const validMp3Buffer = Buffer.concat([mp3Header, Buffer.from(randomBytes)])
              
              const result = isValidAudioFile(filename, validMp3Buffer)
              expect(result).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('OGG 文件头验证应该正确识别真实 OGG', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => !s.includes('/') && !s.includes('\\'))
              .map(s => `${s}.ogg`),
            fc.uint8Array({ minLength: 10, maxLength: 100 }),
            (filename, randomBytes) => {
              // 创建有效的 OGG 文件头 (OggS)
              const oggHeader = Buffer.from('OggS')
              const validOggBuffer = Buffer.concat([oggHeader, Buffer.from(randomBytes)])
              
              const result = isValidAudioFile(filename, validOggBuffer)
              expect(result).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('音频文件头验证应该拒绝伪造的音频', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => !s.includes('/') && !s.includes('\\')),
            fc.constantFrom('.mp3', '.ogg'),
            fc.uint8Array({ minLength: 10, maxLength: 100 }),
            (basename, ext, randomBytes) => {
              const filename = `${basename}${ext}`
              const invalidBuffer = Buffer.from(randomBytes)
              
              // 确保不是有效的音频文件头
              if (invalidBuffer.length >= 4) {
                // 破坏可能的有效文件头
                if (ext === '.mp3') {
                  const id3 = invalidBuffer.subarray(0, 3).toString('ascii')
                  if (id3 === 'ID3') {
                    invalidBuffer[0] = 0x00
                  }
                  // 破坏可能的帧同步字
                  if (invalidBuffer[0] === 0xFF && (invalidBuffer[1] & 0xE0) === 0xE0) {
                    invalidBuffer[0] = 0x00
                  }
                } else if (ext === '.ogg') {
                  const oggs = invalidBuffer.subarray(0, 4).toString('ascii')
                  if (oggs === 'OggS') {
                    invalidBuffer[0] = 0x00
                  }
                }
              }
              
              const result = isValidAudioFile(filename, invalidBuffer)
              
              // 验证结果
              if (invalidBuffer.length >= 4) {
                const isValidHeader = 
                  (ext === '.mp3' && (
                    invalidBuffer.subarray(0, 3).toString('ascii') === 'ID3' ||
                    (invalidBuffer[0] === 0xFF && (invalidBuffer[1] & 0xE0) === 0xE0)
                  )) ||
                  (ext === '.ogg' && invalidBuffer.subarray(0, 4).toString('ascii') === 'OggS')
                
                expect(result).toBe(isValidHeader)
              }
            }
          ),
          { numRuns: 100 }
        )
      })
    })
  })

  /**
   * Property 9: 简历版本管理正确性
   * 
   * 对于任意简历上传序列，系统应该保留最多 5 个版本，超过时删除最旧的版本。
   * 
   * **Validates: Requirements 5.1.2**
   */
  describe('Property 9: 简历版本管理正确性', () => {
    it('上传简历后版本数不应超过最大限制', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          async (uploadCount) => {
            await initDatabase(':memory:', true)
            try {
              // 创建有效的 PDF 文件
              const pdfHeader = Buffer.from('%PDF-1.4\n%âãÏÓ\n')
              const pdfContent = Buffer.from('1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n')
              const pdfFooter = Buffer.from('%%EOF\n')
              const pdfBuffer = Buffer.concat([pdfHeader, pdfContent, pdfFooter])
              
              // 上传多个简历
              for (let i = 0; i < uploadCount; i++) {
                const filename = `resume_${i}.pdf`
                uploadResume(pdfBuffer, filename)
              }
              
              // 获取版本列表
              const versions = getResumeVersions()
              
              // 验证版本数不超过最大限制
              expect(versions.length).toBeLessThanOrEqual(MAX_RESUME_VERSIONS)
              
              // 如果上传数超过最大限制，应该只保留最新的版本
              if (uploadCount > MAX_RESUME_VERSIONS) {
                expect(versions.length).toBe(MAX_RESUME_VERSIONS)
                
                // 验证保留的是最新的版本
                const versionNumbers = versions.map(v => v.version).sort((a, b) => b - a)
                const expectedVersions = Array.from(
                  { length: MAX_RESUME_VERSIONS },
                  (_, i) => uploadCount - i
                )
                expect(versionNumbers).toEqual(expectedVersions)
              } else {
                // 如果上传数未超过最大限制，应该保留所有版本
                expect(versions.length).toBe(uploadCount)
              }
            } finally {
              closeDatabase()
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('删除旧版本后应该保留正确的版本', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: MAX_RESUME_VERSIONS + 1, max: MAX_RESUME_VERSIONS + 5 }),
          async (uploadCount) => {
            await initDatabase(':memory:', true)
            try {
              // 创建有效的 PDF 文件
              const pdfHeader = Buffer.from('%PDF-1.4\n%âãÏÓ\n')
              const pdfContent = Buffer.from('1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n')
              const pdfFooter = Buffer.from('%%EOF\n')
              const pdfBuffer = Buffer.concat([pdfHeader, pdfContent, pdfFooter])
              
              // 上传多个简历（超过最大限制）
              for (let i = 0; i < uploadCount; i++) {
                const filename = `resume_${i}.pdf`
                uploadResume(pdfBuffer, filename)
              }
              
              // 获取版本列表
              const versions = getResumeVersions()
              
              // 应该只保留最新的 MAX_RESUME_VERSIONS 个版本
              expect(versions.length).toBe(MAX_RESUME_VERSIONS)
              
              // 验证版本号是连续的最新版本
              const versionNumbers = versions.map(v => v.version).sort((a, b) => b - a)
              for (let i = 0; i < MAX_RESUME_VERSIONS; i++) {
                expect(versionNumbers[i]).toBe(uploadCount - i)
              }
              
              // 验证旧版本已被删除（版本号小于 uploadCount - MAX_RESUME_VERSIONS 的版本）
              const oldestKeptVersion = uploadCount - MAX_RESUME_VERSIONS + 1
              for (const version of versions) {
                expect(version.version).toBeGreaterThanOrEqual(oldestKeptVersion)
              }
            } finally {
              closeDatabase()
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('手动删除版本后版本数应该正确减少', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: MAX_RESUME_VERSIONS }),
          fc.integer({ min: 0, max: MAX_RESUME_VERSIONS - 1 }),
          async (uploadCount, deleteIndex) => {
            // 确保 deleteIndex 在有效范围内
            if (deleteIndex >= uploadCount) {
              return
            }
            
            await initDatabase(':memory:', true)
            try {
              // 创建有效的 PDF 文件
              const pdfHeader = Buffer.from('%PDF-1.4\n%âãÏÓ\n')
              const pdfContent = Buffer.from('1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n')
              const pdfFooter = Buffer.from('%%EOF\n')
              const pdfBuffer = Buffer.concat([pdfHeader, pdfContent, pdfFooter])
              
              // 上传多个简历
              for (let i = 0; i < uploadCount; i++) {
                const filename = `resume_${i}.pdf`
                uploadResume(pdfBuffer, filename)
              }
              
              // 获取版本列表
              const versionsBefore = getResumeVersions()
              const versionToDelete = versionsBefore[deleteIndex].version
              
              // 删除指定版本
              const deleteResult = deleteResumeVersion(versionToDelete)
              expect(deleteResult.success).toBe(true)
              
              // 获取删除后的版本列表
              const versionsAfter = getResumeVersions()
              
              // 验证版本数减少了 1
              expect(versionsAfter.length).toBe(versionsBefore.length - 1)
              
              // 验证被删除的版本不在列表中
              const versionNumbers = versionsAfter.map(v => v.version)
              expect(versionNumbers).not.toContain(versionToDelete)
            } finally {
              closeDatabase()
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('版本号应该单调递增', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          async (uploadCount) => {
            await initDatabase(':memory:', true)
            try {
              // 创建有效的 PDF 文件
              const pdfHeader = Buffer.from('%PDF-1.4\n%âãÏÓ\n')
              const pdfContent = Buffer.from('1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n')
              const pdfFooter = Buffer.from('%%EOF\n')
              const pdfBuffer = Buffer.concat([pdfHeader, pdfContent, pdfFooter])
              
              // 上传多个简历
              const uploadedVersions: number[] = []
              for (let i = 0; i < uploadCount; i++) {
                const filename = `resume_${i}.pdf`
                const result = uploadResume(pdfBuffer, filename)
                if (result.success && result.version) {
                  uploadedVersions.push(result.version)
                }
              }
              
              // 验证版本号单调递增
              for (let i = 1; i < uploadedVersions.length; i++) {
                expect(uploadedVersions[i]).toBeGreaterThan(uploadedVersions[i - 1])
              }
              
              // 验证版本号从 1 开始
              if (uploadedVersions.length > 0) {
                expect(uploadedVersions[0]).toBe(1)
              }
            } finally {
              closeDatabase()
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('第一个上传的简历应该自动设置为当前使用的简历', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          async (uploadCount) => {
            await initDatabase(':memory:', true)
            try {
              // 创建有效的 PDF 文件
              const pdfHeader = Buffer.from('%PDF-1.4\n%âãÏÓ\n')
              const pdfContent = Buffer.from('1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n')
              const pdfFooter = Buffer.from('%%EOF\n')
              const pdfBuffer = Buffer.concat([pdfHeader, pdfContent, pdfFooter])
              
              // 上传多个简历
              for (let i = 0; i < uploadCount; i++) {
                const filename = `resume_${i}.pdf`
                uploadResume(pdfBuffer, filename)
              }
              
              // 获取版本列表
              const versions = getResumeVersions()
              
              // 应该有且仅有一个版本被标记为当前使用
              const activeVersions = versions.filter(v => v.isActive)
              expect(activeVersions.length).toBe(1)
              
              // 第一个版本应该是当前使用的版本
              expect(activeVersions[0].version).toBe(1)
            } finally {
              closeDatabase()
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
