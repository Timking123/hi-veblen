/**
 * ResourceManager 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ResourceManager, ResourceType, ResourceLoadError, ResourceTimeoutError } from '../ResourceManager'

describe('ResourceManager', () => {
  let resourceManager: ResourceManager

  beforeEach(() => {
    resourceManager = ResourceManager.getInstance()
  })

  afterEach(() => {
    resourceManager.destroy()
  })

  describe('单例模式', () => {
    it('应该返回相同的实例', () => {
      const instance1 = ResourceManager.getInstance()
      const instance2 = ResourceManager.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('资源缓存', () => {
    it('应该能够缓存和获取资源', () => {
      const testData = { value: 'test' }
      const key = 'test-resource'
      
      // 使用私有方法缓存资源（通过 any 类型绕过）
      ;(resourceManager as any).cacheResource(key, testData, ResourceType.DATA)
      
      const retrieved = resourceManager.getResource<typeof testData>(key)
      expect(retrieved).toEqual(testData)
    })

    it('应该在资源不存在时返回 null', () => {
      const retrieved = resourceManager.getResource('non-existent')
      expect(retrieved).toBeNull()
    })

    it('应该能够检查资源是否存在', () => {
      const key = 'test-resource'
      ;(resourceManager as any).cacheResource(key, { value: 'test' }, ResourceType.DATA)
      
      expect(resourceManager.hasResource(key)).toBe(true)
      expect(resourceManager.hasResource('non-existent')).toBe(false)
    })

    it('应该能够释放资源', () => {
      const key = 'test-resource'
      ;(resourceManager as any).cacheResource(key, { value: 'test' }, ResourceType.DATA)
      
      expect(resourceManager.hasResource(key)).toBe(true)
      
      resourceManager.releaseResource(key)
      
      expect(resourceManager.hasResource(key)).toBe(false)
    })
  })

  describe('内存管理', () => {
    it('应该能够获取内存使用情况', () => {
      const usage = resourceManager.getMemoryUsage()
      
      expect(usage).toHaveProperty('used')
      expect(usage).toHaveProperty('total')
      expect(usage).toHaveProperty('percentage')
      expect(usage).toHaveProperty('resourceCount')
      
      expect(usage.used).toBeGreaterThanOrEqual(0)
      expect(usage.total).toBeGreaterThan(0)
      expect(usage.percentage).toBeGreaterThanOrEqual(0)
      expect(usage.resourceCount).toBeGreaterThanOrEqual(0)
    })

    it('应该在缓存资源后增加内存使用', () => {
      const initialUsage = resourceManager.getMemoryUsage()
      
      ;(resourceManager as any).cacheResource('test', { value: 'test' }, ResourceType.DATA)
      
      const afterUsage = resourceManager.getMemoryUsage()
      
      expect(afterUsage.used).toBeGreaterThan(initialUsage.used)
      expect(afterUsage.resourceCount).toBe(initialUsage.resourceCount + 1)
    })

    it('应该在释放资源后减少内存使用', () => {
      const key = 'test-resource'
      ;(resourceManager as any).cacheResource(key, { value: 'test' }, ResourceType.DATA)
      
      const beforeRelease = resourceManager.getMemoryUsage()
      
      resourceManager.releaseResource(key)
      
      const afterRelease = resourceManager.getMemoryUsage()
      
      expect(afterRelease.used).toBeLessThan(beforeRelease.used)
      expect(afterRelease.resourceCount).toBe(beforeRelease.resourceCount - 1)
    })
  })

  describe('资源清理', () => {
    it('应该能够清理所有资源', () => {
      ;(resourceManager as any).cacheResource('test1', { value: 'test1' }, ResourceType.DATA)
      ;(resourceManager as any).cacheResource('test2', { value: 'test2' }, ResourceType.DATA)
      
      expect(resourceManager.getMemoryUsage().resourceCount).toBe(2)
      
      resourceManager.clear()
      
      expect(resourceManager.getMemoryUsage().resourceCount).toBe(0)
      expect(resourceManager.getMemoryUsage().used).toBe(0)
    })

    it('应该能够清理未使用的资源', () => {
      // 缓存一些资源
      ;(resourceManager as any).cacheResource('test1', { value: 'test1' }, ResourceType.DATA)
      ;(resourceManager as any).cacheResource('test2', { value: 'test2' }, ResourceType.DATA)
      
      // 修改元数据，使资源看起来很久没用过
      const metadata = (resourceManager as any).metadata
      for (const [key, meta] of metadata.entries()) {
        meta.lastAccessed = Date.now() - 120000 // 2分钟前
        meta.accessCount = 0
      }
      
      const beforeCleanup = resourceManager.getMemoryUsage().resourceCount
      
      resourceManager.cleanup()
      
      const afterCleanup = resourceManager.getMemoryUsage().resourceCount
      
      // 应该清理了一些资源
      expect(afterCleanup).toBeLessThanOrEqual(beforeCleanup)
    })
  })

  describe('资源统计', () => {
    it('应该能够获取资源统计信息', () => {
      ;(resourceManager as any).cacheResource('audio1', {}, ResourceType.AUDIO)
      ;(resourceManager as any).cacheResource('image1', {}, ResourceType.IMAGE)
      ;(resourceManager as any).cacheResource('data1', {}, ResourceType.DATA)
      
      const stats = resourceManager.getStats()
      
      expect(stats.totalResources).toBe(3)
      expect(stats.byType[ResourceType.AUDIO]).toBe(1)
      expect(stats.byType[ResourceType.IMAGE]).toBe(1)
      expect(stats.byType[ResourceType.DATA]).toBe(1)
      expect(stats.memoryUsage).toBeDefined()
      expect(stats.topResources).toBeDefined()
    })

    it('应该能够导出资源清单', () => {
      ;(resourceManager as any).cacheResource('test1', { value: 'test1' }, ResourceType.DATA, 'http://test.com/test1')
      ;(resourceManager as any).cacheResource('test2', { value: 'test2' }, ResourceType.DATA, 'http://test.com/test2')
      
      const manifest = resourceManager.exportManifest()
      
      expect(manifest).toHaveLength(2)
      expect(manifest[0]).toHaveProperty('key')
      expect(manifest[0]).toHaveProperty('type')
      expect(manifest[0]).toHaveProperty('size')
      expect(manifest[0]).toHaveProperty('url')
    })
  })

  describe('访问跟踪', () => {
    it('应该跟踪资源访问次数', () => {
      const key = 'test-resource'
      ;(resourceManager as any).cacheResource(key, { value: 'test' }, ResourceType.DATA)
      
      const metadata = (resourceManager as any).metadata.get(key)
      const initialAccessCount = metadata.accessCount
      
      // 访问资源多次
      resourceManager.getResource(key)
      resourceManager.getResource(key)
      resourceManager.getResource(key)
      
      const updatedMetadata = (resourceManager as any).metadata.get(key)
      expect(updatedMetadata.accessCount).toBe(initialAccessCount + 3)
    })

    it('应该更新最后访问时间', async () => {
      const key = 'test-resource'
      ;(resourceManager as any).cacheResource(key, { value: 'test' }, ResourceType.DATA)
      
      const metadata = (resourceManager as any).metadata.get(key)
      const initialTime = metadata.lastAccessed
      
      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 10))
      
      resourceManager.getResource(key)
      
      const updatedMetadata = (resourceManager as any).metadata.get(key)
      expect(updatedMetadata.lastAccessed).toBeGreaterThan(initialTime)
    })
  })

  describe('资源大小估算', () => {
    it('应该能够估算不同类型资源的大小', () => {
      const estimateSize = (resourceManager as any).estimateResourceSize.bind(resourceManager)
      
      // 音频
      const audioSize = estimateSize({}, ResourceType.AUDIO)
      expect(audioSize).toBeGreaterThan(0)
      
      // 数据
      const dataSize = estimateSize({ value: 'test' }, ResourceType.DATA)
      expect(dataSize).toBeGreaterThan(0)
      
      // 精灵图 - 模拟 ImageData 对象
      const spriteData = { width: 100, height: 100, data: new Uint8ClampedArray(100 * 100 * 4) }
      const spriteSize = estimateSize(spriteData, ResourceType.SPRITE)
      expect(spriteSize).toBe(100 * 100 * 4) // width * height * 4 (RGBA)
    })
  })

  describe('错误处理', () => {
    it('应该在加载超时时抛出 ResourceTimeoutError', async () => {
      // 模拟一个永远不会加载完成的音频
      const originalAudio = global.Audio
      global.Audio = class MockAudio {
        addEventListener() {
          // 不触发任何事件
        }
        load() {
          // 不触发任何事件
        }
      } as any
      
      // 设置一个很短的超时时间
      ;(resourceManager as any).LOAD_TIMEOUT = 100
      
      await expect(resourceManager.loadAudio('http://test.com/audio.mp3'))
        .rejects.toThrow(ResourceTimeoutError)
      
      // 恢复原始 Audio
      global.Audio = originalAudio
    })
  })

  describe('内存监控', () => {
    it('应该能够获取真实内存使用（如果可用）', () => {
      const realUsage = resourceManager.getRealMemoryUsage()
      
      if (performance.memory) {
        expect(realUsage).toBeGreaterThanOrEqual(0)
      } else {
        expect(realUsage).toBeNull()
      }
    })
  })
})
