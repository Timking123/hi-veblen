/**
 * ResponsiveDetector 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  ResponsiveDetector,
  getResponsiveDetector,
  type ScreenInfo,
  type DeviceType,
  type Orientation
} from '../responsiveDetector'

describe('ResponsiveDetector', () => {
  let detector: ResponsiveDetector

  beforeEach(() => {
    // 重置窗口尺寸为默认值
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768
    })

    // 重置 devicePixelRatio
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      configurable: true,
      value: 1
    })

    // 清理旧实例
    const oldDetector = ResponsiveDetector.getInstance()
    oldDetector.cleanup()
    
    // 重置单例实例（用于测试）
    // @ts-ignore - 访问私有静态属性用于测试
    ResponsiveDetector.instance = undefined

    detector = ResponsiveDetector.getInstance()
  })

  afterEach(() => {
    // 清理监听器
    detector.cleanup()
  })

  describe('单例模式', () => {
    it('应该返回同一个实例', () => {
      const instance1 = ResponsiveDetector.getInstance()
      const instance2 = ResponsiveDetector.getInstance()

      expect(instance1).toBe(instance2)
    })

    it('getResponsiveDetector 应该返回单例实例', () => {
      const instance1 = getResponsiveDetector()
      const instance2 = ResponsiveDetector.getInstance()

      expect(instance1).toBe(instance2)
    })
  })

  describe('设备类型检测', () => {
    it('应该检测移动设备（宽度 < 768px）', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })

      const deviceType = detector.detectDeviceType()
      expect(deviceType).toBe('mobile')
    })

    it('应该检测平板设备（768px <= 宽度 < 1024px）', () => {
      Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true })

      const deviceType = detector.detectDeviceType()
      expect(deviceType).toBe('tablet')
    })

    it('应该检测桌面设备（宽度 >= 1024px）', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true })

      const deviceType = detector.detectDeviceType()
      expect(deviceType).toBe('desktop')
    })

    it('应该正确处理边界值 768px（平板）', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768, configurable: true })

      const deviceType = detector.detectDeviceType()
      expect(deviceType).toBe('tablet')
    })

    it('应该正确处理边界值 1024px（桌面）', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })

      const deviceType = detector.detectDeviceType()
      expect(deviceType).toBe('desktop')
    })
  })

  describe('屏幕方向检测', () => {
    it('应该检测竖屏模式（高度 > 宽度）', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 667, configurable: true })

      const orientation = detector.detectOrientation()
      expect(orientation).toBe('portrait')
    })

    it('应该检测横屏模式（宽度 > 高度）', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 1080, configurable: true })

      const orientation = detector.detectOrientation()
      expect(orientation).toBe('landscape')
    })

    it('应该正确处理正方形屏幕（宽度 = 高度，视为横屏）', () => {
      Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })

      const orientation = detector.detectOrientation()
      expect(orientation).toBe('landscape')
    })
  })

  describe('触摸设备检测', () => {
    it('应该检测支持 ontouchstart 的设备', () => {
      // 模拟触摸设备
      Object.defineProperty(window, 'ontouchstart', {
        value: null,
        configurable: true
      })

      const isTouchDevice = detector.isTouchDevice()
      expect(isTouchDevice).toBe(true)
    })

    it('应该检测支持 maxTouchPoints 的设备', () => {
      // 移除 ontouchstart
      // @ts-ignore
      delete window.ontouchstart

      // 模拟 maxTouchPoints
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 5,
        configurable: true
      })

      const isTouchDevice = detector.isTouchDevice()
      expect(isTouchDevice).toBe(true)
    })

    it('应该检测非触摸设备', () => {
      // 移除所有触摸相关属性
      // @ts-ignore
      delete window.ontouchstart

      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        configurable: true
      })

      const isTouchDevice = detector.isTouchDevice()
      expect(isTouchDevice).toBe(false)
    })
  })

  describe('屏幕信息获取', () => {
    it('应该返回完整的屏幕信息', () => {
      // 先设置窗口属性
      Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 1080, configurable: true })
      Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true })

      // 重新创建实例以获取新的窗口尺寸
      detector.cleanup()
      // @ts-ignore
      ResponsiveDetector.instance = undefined
      detector = ResponsiveDetector.getInstance()

      const screenInfo = detector.getScreenInfo()

      expect(screenInfo).toMatchObject({
        width: 1920,
        height: 1080,
        deviceType: 'desktop',
        orientation: 'landscape',
        pixelRatio: 2
      })
    })

    it('应该返回屏幕信息的副本（不可变）', () => {
      const screenInfo1 = detector.getScreenInfo()
      const screenInfo2 = detector.getScreenInfo()

      expect(screenInfo1).not.toBe(screenInfo2)
      expect(screenInfo1).toEqual(screenInfo2)
    })
  })

  describe('监听器管理', () => {
    it('应该能够添加监听器', async () => {
      const callback = vi.fn()
      detector.addListener(callback)

      // 触发 resize 事件并改变窗口尺寸
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
      window.dispatchEvent(new Event('resize'))

      // 等待事件处理（使用 Promise 确保异步处理完成）
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(callback).toHaveBeenCalled()
    })

    it('应该能够移除监听器', () => {
      const callback = vi.fn()
      detector.addListener(callback)
      detector.removeListener(callback)

      // 触发 resize 事件
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
      window.dispatchEvent(new Event('resize'))

      // 监听器已移除，不应该被调用
      expect(callback).not.toHaveBeenCalled()
    })

    it('监听器应该接收到新的屏幕信息', async () => {
      const callback = vi.fn()
      detector.addListener(callback)

      // 改变窗口尺寸
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 667, configurable: true })
      window.dispatchEvent(new Event('resize'))

      // 等待事件处理
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 375,
          height: 667,
          deviceType: 'mobile',
          orientation: 'portrait'
        })
      )
    })

    it('应该支持多个监听器', async () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      detector.addListener(callback1)
      detector.addListener(callback2)

      // 触发 resize 事件
      Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true })
      window.dispatchEvent(new Event('resize'))

      // 等待事件处理
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(callback1).toHaveBeenCalled()
      expect(callback2).toHaveBeenCalled()
    })

    it('监听器回调异常不应该影响其他监听器', async () => {
      const errorCallback = vi.fn(() => {
        throw new Error('测试错误')
      })
      const normalCallback = vi.fn()

      detector.addListener(errorCallback)
      detector.addListener(normalCallback)

      // 触发 resize 事件
      Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true })
      window.dispatchEvent(new Event('resize'))

      // 等待事件处理
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(errorCallback).toHaveBeenCalled()
      expect(normalCallback).toHaveBeenCalled()
    })
  })

  describe('屏幕尺寸变化监听', () => {
    it('窗口大小变化时应该更新屏幕信息', async () => {
      const initialInfo = detector.getScreenInfo()
      expect(initialInfo.width).toBe(1024)

      // 改变窗口大小
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
      window.dispatchEvent(new Event('resize'))

      // 等待事件处理
      await new Promise(resolve => setTimeout(resolve, 10))

      const updatedInfo = detector.getScreenInfo()
      expect(updatedInfo.width).toBe(375)
    })

    it('设备类型变化时应该通知监听器', async () => {
      const callback = vi.fn()
      detector.addListener(callback)

      // 从桌面切换到移动设备
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
      window.dispatchEvent(new Event('resize'))

      // 等待事件处理
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceType: 'mobile'
        })
      )
    })

    it('屏幕方向变化时应该通知监听器', async () => {
      const callback = vi.fn()
      detector.addListener(callback)

      // 从横屏切换到竖屏
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 667, configurable: true })
      window.dispatchEvent(new Event('resize'))

      // 等待事件处理
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          orientation: 'portrait'
        })
      )
    })

    it('屏幕信息未变化时不应该通知监听器', () => {
      const callback = vi.fn()
      detector.addListener(callback)

      // 触发 resize 但尺寸未变化
      window.dispatchEvent(new Event('resize'))

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('断点配置', () => {
    it('应该返回默认断点配置', () => {
      const breakpoints = detector.getBreakpoints()

      expect(breakpoints).toEqual({
        mobile: 768,
        tablet: 1024,
        desktop: 1024
      })
    })

    it('应该返回断点配置的副本', () => {
      const breakpoints1 = detector.getBreakpoints()
      const breakpoints2 = detector.getBreakpoints()

      expect(breakpoints1).not.toBe(breakpoints2)
      expect(breakpoints1).toEqual(breakpoints2)
    })

    it('应该能够设置自定义断点', () => {
      detector.setBreakpoints({
        mobile: 640,
        tablet: 1280
      })

      const breakpoints = detector.getBreakpoints()
      expect(breakpoints.mobile).toBe(640)
      expect(breakpoints.tablet).toBe(1280)
      expect(breakpoints.desktop).toBe(1024) // 未修改的保持原值
    })

    it('设置断点后应该重新计算设备类型', () => {
      // 设置窗口宽度为 700，在默认断点下是 mobile
      Object.defineProperty(window, 'innerWidth', { value: 700, configurable: true })

      // 重新创建实例
      detector.cleanup()
      // @ts-ignore
      ResponsiveDetector.instance = undefined
      detector = ResponsiveDetector.getInstance()

      // 默认断点下是 mobile (< 768)
      let deviceType = detector.detectDeviceType()
      expect(deviceType).toBe('mobile')

      // 修改断点后应该是 tablet (700 < 800)
      detector.setBreakpoints({ mobile: 600, tablet: 800 })
      deviceType = detector.detectDeviceType()
      expect(deviceType).toBe('tablet')
    })
  })

  describe('清理功能', () => {
    it('cleanup 应该移除所有事件监听器', () => {
      const callback = vi.fn()
      detector.addListener(callback)

      detector.cleanup()

      // 触发 resize 事件
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
      window.dispatchEvent(new Event('resize'))

      // 监听器已清理，不应该被调用
      expect(callback).not.toHaveBeenCalled()
    })

    it('cleanup 应该清空所有监听器', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      detector.addListener(callback1)
      detector.addListener(callback2)

      detector.cleanup()

      // 触发 resize 事件
      window.dispatchEvent(new Event('resize'))

      expect(callback1).not.toHaveBeenCalled()
      expect(callback2).not.toHaveBeenCalled()
    })
  })

  describe('边缘情况', () => {
    it('应该处理 devicePixelRatio 未定义的情况', () => {
      // @ts-ignore
      delete window.devicePixelRatio

      // 重新创建实例
      detector.cleanup()
      // @ts-ignore
      ResponsiveDetector.instance = undefined
      detector = ResponsiveDetector.getInstance()

      const screenInfo = detector.getScreenInfo()
      expect(screenInfo.pixelRatio).toBe(1)
    })

    it('应该处理极小的屏幕尺寸', () => {
      Object.defineProperty(window, 'innerWidth', { value: 320, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 240, configurable: true })

      // 重新创建实例
      detector.cleanup()
      // @ts-ignore
      ResponsiveDetector.instance = undefined
      detector = ResponsiveDetector.getInstance()

      const screenInfo = detector.getScreenInfo()
      expect(screenInfo.deviceType).toBe('mobile')
      expect(screenInfo.width).toBe(320)
      expect(screenInfo.height).toBe(240)
    })

    it('应该处理超大的屏幕尺寸', () => {
      Object.defineProperty(window, 'innerWidth', { value: 3840, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 2160, configurable: true })

      // 重新创建实例
      detector.cleanup()
      // @ts-ignore
      ResponsiveDetector.instance = undefined
      detector = ResponsiveDetector.getInstance()

      const screenInfo = detector.getScreenInfo()
      expect(screenInfo.deviceType).toBe('desktop')
      expect(screenInfo.width).toBe(3840)
      expect(screenInfo.height).toBe(2160)
    })

    it('应该处理高 DPI 屏幕', () => {
      Object.defineProperty(window, 'devicePixelRatio', { value: 3, configurable: true })

      // 重新创建实例
      detector.cleanup()
      // @ts-ignore
      ResponsiveDetector.instance = undefined
      detector = ResponsiveDetector.getInstance()

      const screenInfo = detector.getScreenInfo()
      expect(screenInfo.pixelRatio).toBe(3)
    })
  })
})
