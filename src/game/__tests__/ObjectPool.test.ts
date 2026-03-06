/**
 * ObjectPool 单元测试
 * 测试对象池的优化功能
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ObjectPool } from '../ObjectPool'

// 测试对象类
class TestObject {
  value: number = 0
  isActive: boolean = false

  reset(): void {
    this.value = 0
    this.isActive = false
  }
}

describe('ObjectPool', () => {
  let pool: ObjectPool<TestObject>

  beforeEach(() => {
    pool = new ObjectPool<TestObject>(
      () => new TestObject(),
      (obj) => obj.reset(),
      10, // initialSize
      50  // maxSize
    )
  })

  describe('基本功能', () => {
    it('应该创建对象池并预创建对象', () => {
      const stats = pool.getStats()
      expect(stats.available).toBeGreaterThan(0)
      expect(stats.available).toBeLessThanOrEqual(10)
      expect(stats.minSize).toBe(5) // 初始大小的一半
      expect(stats.maxSize).toBe(50)
    })

    it('应该能够获取和释放对象', () => {
      const obj = pool.acquire()
      expect(obj).toBeInstanceOf(TestObject)
      
      const statsBefore = pool.getStats()
      expect(statsBefore.inUse).toBe(1)
      
      pool.release(obj)
      
      const statsAfter = pool.getStats()
      expect(statsAfter.inUse).toBe(0)
      expect(statsAfter.available).toBe(statsBefore.available + 1)
    })

    it('应该在池为空时创建新对象', () => {
      const initialStats = pool.getStats()
      const initialAvailable = initialStats.available
      
      // 获取所有可用对象
      const objects: TestObject[] = []
      for (let i = 0; i < initialAvailable; i++) {
        objects.push(pool.acquire())
      }
      
      // 再获取一个，应该创建新对象
      const newObj = pool.acquire()
      expect(newObj).toBeInstanceOf(TestObject)
      
      const stats = pool.getStats()
      expect(stats.totalCreated).toBe(initialStats.totalCreated + 1)
    })

    it('应该在释放对象时重置对象状态', () => {
      const obj = pool.acquire()
      obj.value = 100
      obj.isActive = true
      
      pool.release(obj)
      
      const reusedObj = pool.acquire()
      expect(reusedObj.value).toBe(0)
      expect(reusedObj.isActive).toBe(false)
    })
  })

  describe('池大小管理', () => {
    it('应该在池满时丢弃对象', () => {
      // 创建大量对象
      const objects: TestObject[] = []
      for (let i = 0; i < 60; i++) {
        objects.push(pool.acquire())
      }
      
      // 释放所有对象
      for (const obj of objects) {
        pool.release(obj)
      }
      
      const stats = pool.getStats()
      expect(stats.available).toBeLessThanOrEqual(50) // 不超过最大大小
    })

    it('应该跟踪正在使用的对象数量', () => {
      const obj1 = pool.acquire()
      const obj2 = pool.acquire()
      const obj3 = pool.acquire()
      
      let stats = pool.getStats()
      expect(stats.inUse).toBe(3)
      
      pool.release(obj1)
      stats = pool.getStats()
      expect(stats.inUse).toBe(2)
      
      pool.release(obj2)
      pool.release(obj3)
      stats = pool.getStats()
      expect(stats.inUse).toBe(0)
    })
  })

  describe('收缩功能', () => {
    it('应该能够收缩对象池', () => {
      // 创建大量对象
      const objects: TestObject[] = []
      for (let i = 0; i < 30; i++) {
        objects.push(pool.acquire())
      }
      
      // 释放所有对象
      for (const obj of objects) {
        pool.release(obj)
      }
      
      const statsBefore = pool.getStats()
      expect(statsBefore.available).toBeGreaterThan(statsBefore.minSize)
      
      // 收缩对象池
      pool.shrink()
      
      const statsAfter = pool.getStats()
      expect(statsAfter.available).toBeLessThanOrEqual(statsBefore.available)
      expect(statsAfter.available).toBeGreaterThanOrEqual(statsAfter.minSize)
    })

    it('应该保留最小数量的对象', () => {
      // 获取并释放一些对象
      const objects: TestObject[] = []
      for (let i = 0; i < 20; i++) {
        objects.push(pool.acquire())
      }
      for (const obj of objects) {
        pool.release(obj)
      }
      
      // 收缩
      pool.shrink()
      
      const stats = pool.getStats()
      expect(stats.available).toBeGreaterThanOrEqual(stats.minSize)
    })

    it('应该保留正在使用的对象', () => {
      // 获取一些对象但不释放
      const inUseObjects: TestObject[] = []
      for (let i = 0; i < 5; i++) {
        inUseObjects.push(pool.acquire())
      }
      
      // 获取并释放一些对象
      const releasedObjects: TestObject[] = []
      for (let i = 0; i < 20; i++) {
        releasedObjects.push(pool.acquire())
      }
      for (const obj of releasedObjects) {
        pool.release(obj)
      }
      
      const statsBefore = pool.getStats()
      expect(statsBefore.inUse).toBe(5)
      
      // 收缩
      pool.shrink()
      
      const statsAfter = pool.getStats()
      expect(statsAfter.inUse).toBe(5) // 正在使用的对象不应该被影响
      
      // 清理
      for (const obj of inUseObjects) {
        pool.release(obj)
      }
    })
  })

  describe('统计信息', () => {
    it('应该返回完整的统计信息', () => {
      const obj1 = pool.acquire()
      const obj2 = pool.acquire()
      
      const stats = pool.getStats()
      
      expect(stats).toHaveProperty('available')
      expect(stats).toHaveProperty('inUse')
      expect(stats).toHaveProperty('totalCreated')
      expect(stats).toHaveProperty('maxSize')
      expect(stats).toHaveProperty('minSize')
      
      expect(stats.inUse).toBe(2)
      expect(stats.maxSize).toBe(50)
      expect(stats.minSize).toBe(5)
      
      pool.release(obj1)
      pool.release(obj2)
    })

    it('应该正确跟踪总创建数量', () => {
      const initialStats = pool.getStats()
      const initialCreated = initialStats.totalCreated
      
      // 获取所有可用对象
      const objects: TestObject[] = []
      for (let i = 0; i < initialStats.available; i++) {
        objects.push(pool.acquire())
      }
      
      // 再获取几个，应该创建新对象
      for (let i = 0; i < 5; i++) {
        objects.push(pool.acquire())
      }
      
      const stats = pool.getStats()
      expect(stats.totalCreated).toBe(initialCreated + 5)
      
      // 清理
      for (const obj of objects) {
        pool.release(obj)
      }
    })
  })

  describe('清空功能', () => {
    it('应该能够清空对象池', () => {
      const obj1 = pool.acquire()
      const obj2 = pool.acquire()
      
      pool.clear()
      
      const stats = pool.getStats()
      expect(stats.available).toBe(0)
      expect(stats.inUse).toBe(0)
      
      // 注意：obj1 和 obj2 仍然存在，但不再被池管理
    })
  })
})
