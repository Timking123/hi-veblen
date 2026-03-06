/**
 * 内存管理器
 * 负责监控内存使用、自动清理和优化内存占用
 * 确保游戏在服务器环境（2 CPU 2G 内存）中高效运行
 * 
 * 需求: 20.2, 20.5
 */

import { PERFORMANCE_CONFIG } from './constants'
import { ResourceManager } from './ResourceManager'
import { PoolManager } from './PoolManager'

/**
 * 扩展 Performance 接口以支持 memory 属性（Chrome/Edge）
 */
interface PerformanceMemory {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

declare global {
  interface Performance {
    memory?: PerformanceMemory
  }
}

/**
 * 内存使用信息
 */
export interface MemoryInfo {
  used: number // 已使用内存（MB）
  total: number // 总内存限制（MB）
  percentage: number // 使用百分比
  jsHeapSize?: number // JS 堆大小（MB，如果可用）
  jsHeapSizeLimit?: number // JS 堆大小限制（MB，如果可用）
}

/**
 * 内存警告级别
 */
export enum MemoryWarningLevel {
  NORMAL = 'NORMAL', // 正常
  WARNING = 'WARNING', // 警告（70-90%）
  CRITICAL = 'CRITICAL' // 严重（>90%）
}

/**
 * 内存管理器类
 */
export class MemoryManager {
  private static instance: MemoryManager | null = null

  // 内存限制
  private readonly maxMemoryMB: number = PERFORMANCE_CONFIG.MAX_MEMORY_MB

  // 监控配置
  private readonly checkInterval: number = PERFORMANCE_CONFIG.MEMORY_CHECK_INTERVAL
  private readonly warningThreshold: number = 0.7 // 70%
  private readonly criticalThreshold: number = 0.9 // 90%

  // 监控状态
  private monitoringIntervalId: number | null = null
  private isMonitoring: boolean = false
  private checkCount: number = 0

  // 内存历史记录（用于检测内存泄漏）
  private memoryHistory: number[] = []
  private readonly maxHistoryLength: number = 20 // 保留最近 20 次检查

  // 清理回调
  private cleanupCallbacks: Array<() => void> = []

  // 资源管理器引用
  private resourceManager: ResourceManager | null = null
  private poolManager: PoolManager | null = null

  private constructor() {
    console.log('[内存管理器] 初始化，内存限制: 100MB')
    this.resourceManager = ResourceManager.getInstance()
    this.poolManager = PoolManager.getInstance()
  }

  /**
   * 获取单例实例
   */
  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager()
    }
    return MemoryManager.instance
  }

  /**
   * 开始内存监控
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('[内存管理器] 监控已在运行中')
      return
    }

    console.log(`[内存管理器] 开始内存监控，检查间隔: ${this.checkInterval}ms`)
    this.isMonitoring = true

    // 立即执行一次检查
    this.checkMemory()

    // 设置定期检查
    this.monitoringIntervalId = window.setInterval(() => {
      this.checkMemory()
    }, this.checkInterval)
  }

  /**
   * 停止内存监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return
    }

    console.log('[内存管理器] 停止内存监控')
    this.isMonitoring = false

    if (this.monitoringIntervalId !== null) {
      clearInterval(this.monitoringIntervalId)
      this.monitoringIntervalId = null
    }
  }

  /**
   * 检查内存使用
   */
  private checkMemory(): void {
    this.checkCount++
    const memoryInfo = this.getMemoryInfo()

    // 记录内存使用历史
    this.memoryHistory.push(memoryInfo.used)
    if (this.memoryHistory.length > this.maxHistoryLength) {
      this.memoryHistory.shift()
    }

    // 获取警告级别
    const warningLevel = this.getWarningLevel(memoryInfo.percentage)

    // 记录日志
    this.logMemoryStatus(memoryInfo, warningLevel)

    // 根据警告级别采取行动
    this.handleWarningLevel(warningLevel, memoryInfo)

    // 检测内存泄漏
    if (this.checkCount % 10 === 0) {
      // 每 10 次检查一次内存泄漏
      this.detectMemoryLeak()
    }
  }

  /**
   * 获取内存使用信息
   */
  getMemoryInfo(): MemoryInfo {
    const info: MemoryInfo = {
      used: 0,
      total: this.maxMemoryMB,
      percentage: 0
    }

    // 尝试获取真实的 JS 堆内存使用（Chrome/Edge）
    if (performance.memory) {
      const jsHeapSize = performance.memory.usedJSHeapSize / (1024 * 1024)
      const jsHeapSizeLimit = performance.memory.jsHeapSizeLimit / (1024 * 1024)

      info.jsHeapSize = jsHeapSize
      info.jsHeapSizeLimit = jsHeapSizeLimit
      info.used = jsHeapSize
    } else {
      // 如果无法获取真实内存，使用资源管理器的估算值
      if (this.resourceManager) {
        const resourceMemory = this.resourceManager.getMemoryUsage()
        info.used = resourceMemory.used
      }
    }

    info.percentage = (info.used / info.total) * 100

    return info
  }

  /**
   * 获取警告级别
   */
  private getWarningLevel(percentage: number): MemoryWarningLevel {
    if (percentage >= this.criticalThreshold * 100) {
      return MemoryWarningLevel.CRITICAL
    } else if (percentage >= this.warningThreshold * 100) {
      return MemoryWarningLevel.WARNING
    }
    return MemoryWarningLevel.NORMAL
  }

  /**
   * 记录内存状态
   */
  private logMemoryStatus(memoryInfo: MemoryInfo, warningLevel: MemoryWarningLevel): void {
    const prefix = '[内存管理器]'
    const status = `内存使用: ${memoryInfo.used.toFixed(2)} MB / ${memoryInfo.total} MB (${memoryInfo.percentage.toFixed(1)}%)`

    if (memoryInfo.jsHeapSize !== undefined) {
      const heapInfo = ` | JS 堆: ${memoryInfo.jsHeapSize.toFixed(2)} MB / ${memoryInfo.jsHeapSizeLimit?.toFixed(2)} MB`
      
      switch (warningLevel) {
        case MemoryWarningLevel.CRITICAL:
          console.error(`${prefix} [严重] ${status}${heapInfo}`)
          break
        case MemoryWarningLevel.WARNING:
          console.warn(`${prefix} [警告] ${status}${heapInfo}`)
          break
        default:
          console.log(`${prefix} ${status}${heapInfo}`)
      }
    } else {
      switch (warningLevel) {
        case MemoryWarningLevel.CRITICAL:
          console.error(`${prefix} [严重] ${status}`)
          break
        case MemoryWarningLevel.WARNING:
          console.warn(`${prefix} [警告] ${status}`)
          break
        default:
          console.log(`${prefix} ${status}`)
      }
    }
  }

  /**
   * 处理警告级别
   */
  private handleWarningLevel(warningLevel: MemoryWarningLevel, _memoryInfo: MemoryInfo): void {
    switch (warningLevel) {
      case MemoryWarningLevel.CRITICAL:
        console.error('[内存管理器] 内存使用严重，立即执行清理')
        this.cleanup(true) // 强制清理
        break

      case MemoryWarningLevel.WARNING:
        console.warn('[内存管理器] 内存使用警告，执行清理')
        this.cleanup(false) // 常规清理
        break

      case MemoryWarningLevel.NORMAL:
        // 正常状态，不需要清理
        break
    }
  }

  /**
   * 执行内存清理
   * @param aggressive 是否执行激进清理
   */
  cleanup(aggressive: boolean = false): void {
    console.log(`[内存管理器] 开始清理内存 (${aggressive ? '激进模式' : '常规模式'})`)

    const beforeMemory = this.getMemoryInfo()

    // 1. 清理资源管理器缓存
    if (this.resourceManager) {
      this.resourceManager.cleanup()
    }

    // 2. 收缩对象池
    if (this.poolManager) {
      console.log('[内存管理器] 收缩对象池')
      this.poolManager.shrink()
    }

    // 3. 执行自定义清理回调
    for (const callback of this.cleanupCallbacks) {
      try {
        callback()
      } catch (error) {
        console.error('[内存管理器] 清理回调执行失败:', error)
      }
    }

    // 4. 强制垃圾回收（如果可用）
    if (typeof (global as any).gc === 'function') {
      console.log('[内存管理器] 触发垃圾回收')
      ;(global as any).gc()
    }

    // 5. 清理内存历史记录（仅在激进模式下）
    if (aggressive) {
      this.memoryHistory = []
    }

    const afterMemory = this.getMemoryInfo()
    const freed = beforeMemory.used - afterMemory.used

    console.log(`[内存管理器] 清理完成，释放内存: ${freed.toFixed(2)} MB`)
  }

  /**
   * 检测内存泄漏
   */
  private detectMemoryLeak(): void {
    if (this.memoryHistory.length < 10) {
      return // 数据不足，无法检测
    }

    // 计算内存增长趋势
    const recentHistory = this.memoryHistory.slice(-10)
    const firstValue = recentHistory[0]
    const lastValue = recentHistory[recentHistory.length - 1]
    const growth = lastValue - firstValue
    const growthPercentage = (growth / firstValue) * 100

    // 如果内存持续增长超过 20%，可能存在内存泄漏
    if (growthPercentage > 20) {
      console.warn(
        `[内存管理器] 检测到可能的内存泄漏：内存从 ${firstValue.toFixed(2)} MB 增长到 ${lastValue.toFixed(2)} MB (${growthPercentage.toFixed(1)}%)`
      )

      // 执行清理
      this.cleanup(true)
    }
  }

  /**
   * 注册清理回调
   * @param callback 清理函数
   */
  registerCleanupCallback(callback: () => void): void {
    this.cleanupCallbacks.push(callback)
    console.log('[内存管理器] 注册清理回调')
  }

  /**
   * 取消注册清理回调
   * @param callback 清理函数
   */
  unregisterCleanupCallback(callback: () => void): void {
    const index = this.cleanupCallbacks.indexOf(callback)
    if (index !== -1) {
      this.cleanupCallbacks.splice(index, 1)
      console.log('[内存管理器] 取消注册清理回调')
    }
  }

  /**
   * 获取内存统计信息
   */
  getStats(): {
    memoryInfo: MemoryInfo
    warningLevel: MemoryWarningLevel
    checkCount: number
    isMonitoring: boolean
    memoryHistory: number[]
    cleanupCallbackCount: number
  } {
    const memoryInfo = this.getMemoryInfo()
    const warningLevel = this.getWarningLevel(memoryInfo.percentage)

    return {
      memoryInfo,
      warningLevel,
      checkCount: this.checkCount,
      isMonitoring: this.isMonitoring,
      memoryHistory: [...this.memoryHistory],
      cleanupCallbackCount: this.cleanupCallbacks.length
    }
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.checkCount = 0
    this.memoryHistory = []
    console.log('[内存管理器] 重置统计信息')
  }

  /**
   * 销毁内存管理器
   */
  destroy(): void {
    console.log('[内存管理器] 销毁')
    this.stopMonitoring()
    this.cleanupCallbacks = []
    this.memoryHistory = []
    this.resourceManager = null
    this.poolManager = null
    MemoryManager.instance = null
  }

  /**
   * 获取内存使用百分比
   */
  getMemoryPercentage(): number {
    return this.getMemoryInfo().percentage
  }

  /**
   * 检查内存是否超过限制
   */
  isMemoryExceeded(): boolean {
    return this.getMemoryPercentage() >= this.criticalThreshold * 100
  }

  /**
   * 获取可用内存（MB）
   */
  getAvailableMemory(): number {
    const info = this.getMemoryInfo()
    return Math.max(0, info.total - info.used)
  }
}
