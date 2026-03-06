/**
 * 对象池类
 * 用于减少频繁的内存分配和垃圾回收
 */
export class ObjectPool<T> {
  private pool: T[] = []
  private factory: () => T
  private reset: (obj: T) => void
  private maxSize: number
  private minSize: number
  private inUseCount: number = 0
  private totalCreated: number = 0

  /**
   * 创建对象池
   * @param factory 创建新对象的工厂函数
   * @param reset 重置对象状态的函数
   * @param initialSize 初始池大小
   * @param maxSize 最大池大小
   */
  constructor(
    factory: () => T,
    reset: (obj: T) => void,
    initialSize: number = 10,
    maxSize: number = 100
  ) {
    this.factory = factory
    this.reset = reset
    this.maxSize = maxSize
    this.minSize = Math.max(1, Math.floor(initialSize / 2)) // 最小保留初始大小的一半

    // 预创建对象（优化：只创建最小数量）
    const preCreateSize = Math.min(initialSize, this.minSize)
    for (let i = 0; i < preCreateSize; i++) {
      this.pool.push(this.factory())
      this.totalCreated++
    }

    console.log(`[对象池] 创建对象池，初始大小: ${preCreateSize}，最小大小: ${this.minSize}，最大大小: ${maxSize}`)
  }

  /**
   * 从池中获取对象
   * 如果池为空，创建新对象
   */
  acquire(): T {
    let obj: T
    
    if (this.pool.length > 0) {
      obj = this.pool.pop()!
    } else {
      // 池为空，创建新对象
      obj = this.factory()
      this.totalCreated++
    }
    
    this.inUseCount++
    return obj
  }

  /**
   * 将对象归还到池中
   * @param obj 要归还的对象
   */
  release(obj: T): void {
    this.inUseCount = Math.max(0, this.inUseCount - 1)
    
    // 检查池是否已满
    if (this.pool.length >= this.maxSize) {
      // 池已满，丢弃对象以减少内存占用
      return
    }

    // 重置对象状态
    this.reset(obj)

    // 归还到池中
    this.pool.push(obj)
  }

  /**
   * 获取池中可用对象数量
   */
  getAvailableCount(): number {
    return this.pool.length
  }

  /**
   * 获取正在使用的对象数量
   */
  getInUseCount(): number {
    return this.inUseCount
  }

  /**
   * 获取总共创建的对象数量
   */
  getTotalCreated(): number {
    return this.totalCreated
  }

  /**
   * 收缩对象池（释放多余的对象）
   * 保留最小数量的对象以避免频繁创建
   */
  shrink(): void {
    const targetSize = Math.max(this.minSize, this.inUseCount)
    
    if (this.pool.length > targetSize) {
      const removeCount = this.pool.length - targetSize
      this.pool.splice(targetSize)
      console.log(`[对象池] 收缩对象池，移除 ${removeCount} 个对象，当前大小: ${this.pool.length}`)
    }
  }

  /**
   * 获取对象池统计信息
   */
  getStats(): {
    available: number
    inUse: number
    totalCreated: number
    maxSize: number
    minSize: number
  } {
    return {
      available: this.pool.length,
      inUse: this.inUseCount,
      totalCreated: this.totalCreated,
      maxSize: this.maxSize,
      minSize: this.minSize
    }
  }

  /**
   * 清空对象池
   */
  clear(): void {
    this.pool = []
    this.inUseCount = 0
    console.log('[对象池] 清空对象池')
  }
}
