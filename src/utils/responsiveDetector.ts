/**
 * 响应式检测工具类
 * 用于检测设备类型、屏幕方向、触摸设备等信息
 */

// 设备类型
export type DeviceType = 'mobile' | 'tablet' | 'desktop'

// 屏幕方向
export type Orientation = 'portrait' | 'landscape'

// 屏幕信息
export interface ScreenInfo {
  width: number
  height: number
  deviceType: DeviceType
  orientation: Orientation
  isTouchDevice: boolean
  pixelRatio: number
}

// 响应式断点
export interface ResponsiveBreakpoints {
  mobile: number // < 768px
  tablet: number // 768px - 1024px
  desktop: number // > 1024px
}

/**
 * ResponsiveDetector 单例类
 * 提供设备类型检测、屏幕方向检测、触摸设备检测等功能
 */
export class ResponsiveDetector {
  private static instance: ResponsiveDetector
  private screenInfo: ScreenInfo
  private listeners: Set<(info: ScreenInfo) => void>
  private breakpoints: ResponsiveBreakpoints

  private constructor() {
    this.breakpoints = {
      mobile: 768,
      tablet: 1024,
      desktop: 1024
    }

    this.listeners = new Set()
    this.screenInfo = this.createScreenInfo()

    // 监听窗口大小变化
    this.initializeListeners()
  }

  /**
   * 获取 ResponsiveDetector 单例实例
   */
  public static getInstance(): ResponsiveDetector {
    if (!ResponsiveDetector.instance) {
      ResponsiveDetector.instance = new ResponsiveDetector()
    }
    return ResponsiveDetector.instance
  }

  /**
   * 初始化事件监听器
   */
  private initializeListeners(): void {
    // 监听窗口大小变化
    window.addEventListener('resize', this.handleResize)

    // 监听屏幕方向变化
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', this.handleOrientationChange)
    } else {
      // 降级方案：使用 orientationchange 事件
      window.addEventListener('orientationchange', this.handleOrientationChange)
    }
  }

  /**
   * 处理窗口大小变化
   */
  private handleResize = (): void => {
    this.updateScreenInfo()
  }

  /**
   * 处理屏幕方向变化
   */
  private handleOrientationChange = (): void => {
    this.updateScreenInfo()
  }

  /**
   * 更新屏幕信息并通知监听器
   */
  private updateScreenInfo(): void {
    const oldInfo = this.screenInfo
    this.screenInfo = this.createScreenInfo()

    // 如果信息发生变化，通知所有监听器
    if (this.hasScreenInfoChanged(oldInfo, this.screenInfo)) {
      this.notifyListeners()
    }
  }

  /**
   * 检查屏幕信息是否发生变化
   */
  private hasScreenInfoChanged(oldInfo: ScreenInfo, newInfo: ScreenInfo): boolean {
    return (
      oldInfo.width !== newInfo.width ||
      oldInfo.height !== newInfo.height ||
      oldInfo.deviceType !== newInfo.deviceType ||
      oldInfo.orientation !== newInfo.orientation
    )
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    this.listeners.forEach((callback) => {
      try {
        callback(this.screenInfo)
      } catch (error) {
        console.error('[ResponsiveDetector] 监听器回调执行失败:', error)
      }
    })
  }

  /**
   * 创建屏幕信息对象
   */
  private createScreenInfo(): ScreenInfo {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      deviceType: this.detectDeviceType(),
      orientation: this.detectOrientation(),
      isTouchDevice: this.isTouchDevice(),
      pixelRatio: window.devicePixelRatio || 1
    }
  }

  /**
   * 获取当前屏幕信息
   */
  public getScreenInfo(): ScreenInfo {
    return { ...this.screenInfo }
  }

  /**
   * 检测设备类型
   * mobile: < 768px
   * tablet: 768px - 1024px
   * desktop: > 1024px
   */
  public detectDeviceType(): DeviceType {
    const width = window.innerWidth

    if (width < this.breakpoints.mobile) {
      return 'mobile'
    } else if (width < this.breakpoints.tablet) {
      return 'tablet'
    } else {
      return 'desktop'
    }
  }

  /**
   * 检测屏幕方向
   * portrait: 竖屏（高度大于宽度）
   * landscape: 横屏（宽度大于高度）
   */
  public detectOrientation(): Orientation {
    const width = window.innerWidth
    const height = window.innerHeight

    return height > width ? 'portrait' : 'landscape'
  }

  /**
   * 检测是否为触摸设备
   */
  public isTouchDevice(): boolean {
    // 检查多个触摸相关的 API
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore - 兼容旧版浏览器
      navigator.msMaxTouchPoints > 0
    )
  }

  /**
   * 添加屏幕信息变化监听器
   * @param callback 回调函数，接收新的屏幕信息
   */
  public addListener(callback: (info: ScreenInfo) => void): void {
    this.listeners.add(callback)
  }

  /**
   * 移除屏幕信息变化监听器
   * @param callback 要移除的回调函数
   */
  public removeListener(callback: (info: ScreenInfo) => void): void {
    this.listeners.delete(callback)
  }

  /**
   * 清理所有监听器（用于测试或组件卸载）
   */
  public cleanup(): void {
    window.removeEventListener('resize', this.handleResize)

    if (window.screen?.orientation) {
      window.screen.orientation.removeEventListener('change', this.handleOrientationChange)
    } else {
      window.removeEventListener('orientationchange', this.handleOrientationChange)
    }

    this.listeners.clear()
  }

  /**
   * 获取当前断点配置
   */
  public getBreakpoints(): ResponsiveBreakpoints {
    return { ...this.breakpoints }
  }

  /**
   * 设置自定义断点（可选功能）
   */
  public setBreakpoints(breakpoints: Partial<ResponsiveBreakpoints>): void {
    this.breakpoints = {
      ...this.breakpoints,
      ...breakpoints
    }
    this.updateScreenInfo()
  }
}

// 导出便捷函数
export const getResponsiveDetector = (): ResponsiveDetector => {
  return ResponsiveDetector.getInstance()
}
