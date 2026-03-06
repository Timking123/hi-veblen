/**
 * 下载统计服务属性测试
 * 验证下载统计的一致性和原子性
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.5**
 */

import * as fc from 'fast-check'
import { initDatabase, closeDatabase, saveDatabase, getDatabase } from '../../database/init'
import {
  recordResumeDownload,
  getTotalResumeDownloads,
  getVersionDownloads,
  checkStatsConsistency,
  type DownloadSource
} from '../downloadStats'
import { uploadResume } from '../file'
import fs from 'fs'
import path from 'path'

describe('属性测试：下载统计一致性', () => {
  beforeEach(async () => {
    // 初始化测试数据库
    await initDatabase(':memory:', true)
  })

  afterEach(() => {
    // 关闭数据库
    closeDatabase(true)
  })

  /**
   * 属性 3: 下载统计一致性
   * 
   * 对于任何简历版本，从任何来源（前端或后台）下载该版本后，
   * resume_versions 表中该版本的 download_count 应该增加 1，
   * 且 statistics 表中的 resume_downloads 也应该增加 1。
   */
  it('属性 3: 下载统计一致性 - 单次下载应同时更新两个表', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<DownloadSource>('frontend', 'admin'), // 下载来源
        async (source) => {
          // 1. 创建一个测试简历
          const pdfContent = Buffer.concat([
            Buffer.from('%PDF-1.4\n'),
            Buffer.from('test content')
          ])
          const uploadResult = await uploadResume(pdfContent, 'test-resume.pdf')
          
          if (!uploadResult.success || !uploadResult.version) {
            return true // 上传失败是可接受的
          }
          
          const version = uploadResult.version
          
          // 2. 获取下载前的统计数据
          const beforeVersionCount = await getVersionDownloads(version)
          const beforeTotalCount = await getTotalResumeDownloads()
          
          // 3. 记录一次下载
          await recordResumeDownload(version, source)
          
          // 4. 获取下载后的统计数据
          const afterVersionCount = await getVersionDownloads(version)
          const afterTotalCount = await getTotalResumeDownloads()
          
          // 5. 验证两个表都增加了 1
          expect(afterVersionCount).toBe(beforeVersionCount + 1)
          expect(afterTotalCount).toBe(beforeTotalCount + 1)
          
          // 6. 验证数据一致性
          const consistencyCheck = await checkStatsConsistency()
          expect(consistencyCheck.consistent).toBe(true)
          
          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * 属性 3: 下载统计一致性 - 多次下载应累加正确
   */
  it('属性 3: 下载统计一致性 - 多次下载应累加正确', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // 下载次数
        fc.constantFrom<DownloadSource>('frontend', 'admin'), // 下载来源
        async (downloadCount, source) => {
          // 1. 创建一个测试简历
          const pdfContent = Buffer.concat([
            Buffer.from('%PDF-1.4\n'),
            Buffer.from('test content')
          ])
          const uploadResult = await uploadResume(pdfContent, 'test-resume.pdf')
          
          if (!uploadResult.success || !uploadResult.version) {
            return true
          }
          
          const version = uploadResult.version
          
          // 2. 获取初始统计数据
          const initialVersionCount = await getVersionDownloads(version)
          const initialTotalCount = await getTotalResumeDownloads()
          
          // 3. 执行多次下载
          for (let i = 0; i < downloadCount; i++) {
            await recordResumeDownload(version, source)
          }
          
          // 4. 获取最终统计数据
          const finalVersionCount = await getVersionDownloads(version)
          const finalTotalCount = await getTotalResumeDownloads()
          
          // 5. 验证增加的次数正确
          expect(finalVersionCount).toBe(initialVersionCount + downloadCount)
          expect(finalTotalCount).toBe(initialTotalCount + downloadCount)
          
          // 6. 验证数据一致性
          const consistencyCheck = await checkStatsConsistency()
          expect(consistencyCheck.consistent).toBe(true)
          
          return true
        }
      ),
      { numRuns: 30 }
    )
  })

  /**
   * 属性 3: 下载统计一致性 - 多个版本的下载统计应独立且总和一致
   */
  it('属性 3: 下载统计一致性 - 多个版本的下载统计应独立且总和一致', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 2, maxLength: 3 }), // 每个版本的下载次数
        async (downloadCounts) => {
          const versions: number[] = []
          
          // 1. 创建多个简历版本
          for (let i = 0; i < downloadCounts.length; i++) {
            const pdfContent = Buffer.concat([
              Buffer.from('%PDF-1.4\n'),
              Buffer.from(`test content ${i}`)
            ])
            const uploadResult = await uploadResume(pdfContent, `test-resume-${i}.pdf`)
            
            if (uploadResult.success && uploadResult.version) {
              versions.push(uploadResult.version)
            }
          }
          
          if (versions.length === 0) {
            return true
          }
          
          // 2. 获取初始总下载次数
          const initialTotalCount = await getTotalResumeDownloads()
          
          // 3. 为每个版本记录指定次数的下载
          let expectedTotalIncrease = 0
          for (let i = 0; i < versions.length; i++) {
            const version = versions[i]
            const count = downloadCounts[i]
            
            for (let j = 0; j < count; j++) {
              await recordResumeDownload(version, 'frontend')
            }
            
            expectedTotalIncrease += count
            
            // 验证该版本的下载次数
            const versionCount = await getVersionDownloads(version)
            expect(versionCount).toBe(count)
          }
          
          // 4. 验证总下载次数
          const finalTotalCount = await getTotalResumeDownloads()
          expect(finalTotalCount).toBe(initialTotalCount + expectedTotalIncrease)
          
          // 5. 验证数据一致性
          const consistencyCheck = await checkStatsConsistency()
          expect(consistencyCheck.consistent).toBe(true)
          
          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 3: 下载统计一致性 - 事务回滚测试
   * 如果版本不存在，应该不更新任何表
   */
  it('属性 3: 下载统计一致性 - 无效版本不应更新统计', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 9999, max: 99999 }), // 不存在的版本号
        async (invalidVersion) => {
          // 1. 获取初始统计数据
          const initialTotalCount = await getTotalResumeDownloads()
          
          // 2. 尝试记录不存在版本的下载（应该失败）
          try {
            await recordResumeDownload(invalidVersion, 'frontend')
            // 如果没有抛出错误，测试失败
            return false
          } catch (error) {
            // 预期会抛出错误
          }
          
          // 3. 验证总下载次数没有变化
          const finalTotalCount = await getTotalResumeDownloads()
          expect(finalTotalCount).toBe(initialTotalCount)
          
          // 4. 验证数据一致性
          const consistencyCheck = await checkStatsConsistency()
          expect(consistencyCheck.consistent).toBe(true)
          
          return true
        }
      ),
      { numRuns: 20 }
    )
  })
})

describe('属性测试：并发下载统计准确性', () => {
  beforeEach(async () => {
    // 初始化测试数据库
    await initDatabase(':memory:', true)
  })

  afterEach(() => {
    // 关闭数据库
    closeDatabase(true)
  })

  /**
   * 并发测试：多个并发下载请求的统计准确性
   * 
   * 验证在并发场景下，下载统计仍然准确
   */
  it('并发测试：多个并发下载应正确累加统计', async () => {
    // 1. 创建一个测试简历
    const pdfContent = Buffer.concat([
      Buffer.from('%PDF-1.4\n'),
      Buffer.from('test content')
    ])
    const uploadResult = await uploadResume(pdfContent, 'test-resume.pdf')
    
    expect(uploadResult.success).toBe(true)
    expect(uploadResult.version).toBeDefined()
    
    const version = uploadResult.version!
    
    // 2. 获取初始统计数据
    const initialVersionCount = await getVersionDownloads(version)
    const initialTotalCount = await getTotalResumeDownloads()
    
    // 3. 并发执行多次下载（使用较小的并发数以避免数据库锁问题）
    const concurrentDownloads = 10
    const downloadPromises = Array.from({ length: concurrentDownloads }, (_, i) =>
      recordResumeDownload(version, i % 2 === 0 ? 'frontend' : 'admin')
    )
    
    await Promise.all(downloadPromises)
    
    // 4. 验证最终统计数据
    const finalVersionCount = await getVersionDownloads(version)
    const finalTotalCount = await getTotalResumeDownloads()
    
    expect(finalVersionCount).toBe(initialVersionCount + concurrentDownloads)
    expect(finalTotalCount).toBe(initialTotalCount + concurrentDownloads)
    
    // 5. 验证数据一致性
    const consistencyCheck = await checkStatsConsistency()
    expect(consistencyCheck.consistent).toBe(true)
  })

  /**
   * 并发测试：多个版本的并发下载
   */
  it('并发测试：多个版本的并发下载应正确统计', async () => {
    // 1. 创建多个测试简历
    const versions: number[] = []
    for (let i = 0; i < 3; i++) {
      const pdfContent = Buffer.concat([
        Buffer.from('%PDF-1.4\n'),
        Buffer.from(`test content ${i}`)
      ])
      const uploadResult = await uploadResume(pdfContent, `test-resume-${i}.pdf`)
      
      if (uploadResult.success && uploadResult.version) {
        versions.push(uploadResult.version)
      }
    }
    
    expect(versions.length).toBeGreaterThan(0)
    
    // 2. 获取初始统计数据
    const initialTotalCount = await getTotalResumeDownloads()
    
    // 3. 为每个版本并发执行下载
    const downloadsPerVersion = 5
    const allDownloadPromises: Promise<void>[] = []
    
    for (const version of versions) {
      for (let i = 0; i < downloadsPerVersion; i++) {
        allDownloadPromises.push(
          recordResumeDownload(version, i % 2 === 0 ? 'frontend' : 'admin')
        )
      }
    }
    
    await Promise.all(allDownloadPromises)
    
    // 4. 验证每个版本的下载次数
    for (const version of versions) {
      const versionCount = await getVersionDownloads(version)
      expect(versionCount).toBe(downloadsPerVersion)
    }
    
    // 5. 验证总下载次数
    const finalTotalCount = await getTotalResumeDownloads()
    const expectedTotal = initialTotalCount + (versions.length * downloadsPerVersion)
    expect(finalTotalCount).toBe(expectedTotal)
    
    // 6. 验证数据一致性
    const consistencyCheck = await checkStatsConsistency()
    expect(consistencyCheck.consistent).toBe(true)
  })
})
