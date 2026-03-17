/**
 * 移动端控制器类
 * 负责检测设备类型、管理虚拟摇杆和触摸按钮、处理触摸事件
 * 
 * 验证需求: 6.1, 6.2, 6.8, 6.9, 6.10, 8.1
 */

import { ResponsiveDetector } from '@/utils/responsiveDetector'

/**
 * 触摸点信息
 */
export interface TouchPoint {
  id: number
  x: number
  y: number
  startX: number
  startY: number
  startTime: number
}

/**
 * 摇杆状态
 */
export interface JoystickState {
  active: boolean
  x: number // -1 到 1
  y: number // -1 到 1
  angle: number // 弧度
  distance: number // 0 到 1
}

/**
 * 按钮状态
 */
export interface ButtonState {
  fire: boolean // 开火键
  missile: boolean // 导弹键
  nuke: boolean // 核弹键
}

/**
 * 移动端控制器配置
 */
export interface MobileControllerConfig {
  joystick: {
    x: number
    y: number
    radius: number
    deadZone: number
  }
  buttons: {
    fire: { x: number; y: number; size: number }
    missile: { x: number; y: number; size: number }
    nuke: { x: number; y: number; size: number }
  }
}

/**
 * MobileController 类
 * 提供移动端触摸控制功能
 */
export class MobileController {
  private canvas: HTMLCanvasElement
  private isMobile: boolean
  private joystickState: JoystickState
  private buttonState: ButtonState
  private touchPoints: Map<number, TouchPoint>
  private config: MobileControllerConfig
  private responsiveDetector: ResponsiveDetector
  private isInitialized: boolean = false

  // 触摸区域定义
  private joystickArea: { x: number; y: number; radius: number } | null = null
  private buttonAreas: Map<string, { x: number; y: number; radius: number }> = new Map()

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.responsiveDetector = ResponsiveDetector.getInstance()
    this.isMobile = this.detectMobile()
    this.touchPoints = new Map()

    // 初始化状态
    this.joystickState = {
      active: false,
      x: 0,
      y: 0,
      angle: 0,
      distance: 0
    }

    this.buttonState = {
      fire: false,
      missile: false,
      nuke: false
    }

    // 初始化配置
    this.config = this.createDefaultConfig()
  }

  /**
   * 创建默认配置
   */
  private createDefaultConfig(): MobileControllerConfig {
    const canvasWidth = this.canvas.width
    const canvasHeight = this.canvas.height

    return {
      joystick: {
        x: 100,
        y: canvasHeight - 100,
        radius: 60,
        deadZone: 0.1
      },
      buttons: {
        fire: {
          x: canvasWidth - 80,
          y: canvasHeight - 80,
          size: 60
        },
        missile: {
          x: canvasWidth - 80,
          y: canvasHeight - 160,
          size: 55
        },
        nuke: {
          x: canvasWidth - 80,
          y: canvasHeight - 240,
          size: 55
        }
      }
    }
  }

  /**
   * 检测是否为移动设备
   * 使用 ResponsiveDetector 进行检测
   */
  public detectMobile(): boolean {
    const screenInfo = this.responsiveDetector.getScreenInfo()
    
    // 移动设备或平板设备，且支持触摸
    return (
      (screenInfo.deviceType === 'mobile' || screenInfo.deviceType === 'tablet') &&
      screenInfo.isTouchDevice
    )
  }

  /**
   * 初始化触摸事件监听
   */
  public initialize(): void {
    if (this.isInitialized) {
      console.warn('[MobileController] 已经初始化，跳过重复初始化')
      return
    }

    if (!this.isMobile) {
      console.debug('[MobileController] 非移动设备，不初始化触摸控制')
      return
    }

    // 绑定触摸事件
    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false })
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false })
    this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false })
    this.canvas.addEventListener('touchcancel', this.handleTouchEnd, { passive: false })

    // 阻止上下文菜单
    this.canvas.addEventListener('contextmenu', this.preventContextMenu)

    // 更新触摸区域
    this.updateTouchAreas()

    this.isInitialized = true
    console.debug('[MobileController] 初始化完成')
  }

  /**
   * 更新触摸区域（响应画布尺寸变化）
   */
  private updateTouchAreas(): void {
    // 更新摇杆区域
    this.joystickArea = {
      x: this.config.joystick.x,
      y: this.config.joystick.y,
      radius: this.config.joystick.radius
    }

    // 更新按钮区域
    this.buttonAreas.set('fire', {
      x: this.config.buttons.fire.x,
      y: this.config.buttons.fire.y,
      radius: this.config.buttons.fire.size / 2
    })

    this.buttonAreas.set('missile', {
      x: this.config.buttons.missile.x,
      y: this.config.buttons.missile.y,
      radius: this.config.buttons.missile.size / 2
    })

    this.buttonAreas.set('nuke', {
      x: this.config.buttons.nuke.x,
      y: this.config.buttons.nuke.y,
      radius: this.config.buttons.nuke.size / 2
    })
  }

  /**
   * 处理触摸开始事件
   */
  private handleTouchStart = (event: TouchEvent): void => {
    event.preventDefault()

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i]
      const rect = this.canvas.getBoundingClientRect()
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top

      // 创建触摸点记录
      const touchPoint: TouchPoint = {
        id: touch.identifier,
        x,
        y,
        startX: x,
        startY: y,
        startTime: Date.now()
      }

      this.touchPoints.set(touch.identifier, touchPoint)

      // 判断触摸位置
      if (this.isInJoystickArea(x, y)) {
        this.handleJoystickTouchStart(touchPoint)
      } else if (this.isInButtonArea(x, y)) {
        this.handleButtonTouchStart(touchPoint, x, y)
      }
    }
  }

  /**
   * 处理触摸移动事件
   */
  private handleTouchMove = (event: TouchEvent): void => {
    event.preventDefault()

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i]
      const touchPoint = this.touchPoints.get(touch.identifier)

      if (!touchPoint) continue

      const rect = this.canvas.getBoundingClientRect()
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top

      // 更新触摸点位置
      touchPoint.x = x
      touchPoint.y = y

      // 如果是摇杆区域的触摸，更新摇杆状态
      if (this.isInJoystickArea(touchPoint.startX, touchPoint.startY)) {
        this.handleJoystickTouchMove(touchPoint)
      }
    }
  }

  /**
   * 处理触摸结束事件
   */
  private handleTouchEnd = (event: TouchEvent): void => {
    event.preventDefault()

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i]
      const touchPoint = this.touchPoints.get(touch.identifier)

      if (!touchPoint) continue

      // 判断是摇杆还是按钮
      if (this.isInJoystickArea(touchPoint.startX, touchPoint.startY)) {
        this.handleJoystickTouchEnd(touchPoint)
      } else {
        this.handleButtonTouchEnd(touchPoint)
      }

      // 移除触摸点记录
      this.touchPoints.delete(touch.identifier)
    }
  }

  /**
   * 判断坐标是否在摇杆区域内
   */
  private isInJoystickArea(x: number, y: number): boolean {
    if (!this.joystickArea) return false

    const dx = x - this.joystickArea.x
    const dy = y - this.joystickArea.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    return distance <= this.joystickArea.radius * 2 // 扩大触摸区域
  }

  /**
   * 判断坐标是否在按钮区域内
   */
  private isInButtonArea(x: number, y: number): boolean {
    for (const [, area] of this.buttonAreas) {
      const dx = x - area.x
      const dy = y - area.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance <= area.radius * 1.5) {
        // 扩大触摸区域
        return true
      }
    }

    return false
  }

  /**
   * 获取触摸点所在的按钮
   */
  private getButtonAtPosition(x: number, y: number): string | null {
    for (const [buttonName, area] of this.buttonAreas) {
      const dx = x - area.x
      const dy = y - area.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance <= area.radius * 1.5) {
        return buttonName
      }
    }

    return null
  }

  /**
   * 处理摇杆触摸开始
   */
  private handleJoystickTouchStart(touchPoint: TouchPoint): void {
    this.joystickState.active = true
    this.updateJoystickState(touchPoint)
  }

  /**
   * 处理摇杆触摸移动
   */
  private handleJoystickTouchMove(touchPoint: TouchPoint): void {
    this.updateJoystickState(touchPoint)
  }

  /**
   * 处理摇杆触摸结束
   */
  private handleJoystickTouchEnd(_touchPoint: TouchPoint): void {
    this.joystickState = {
      active: false,
      x: 0,
      y: 0,
      angle: 0,
      distance: 0
    }
  }

  /**
   * 更新摇杆状态
   */
  private updateJoystickState(touchPoint: TouchPoint): void {
    if (!this.joystickArea) return

    const centerX = this.joystickArea.x
    const centerY = this.joystickArea.y

    // 计算触摸点相对于摇杆中心的偏移量
    const deltaX = touchPoint.x - centerX
    const deltaY = touchPoint.y - centerY

    // 计算距离和角度
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const angle = Math.atan2(deltaY, deltaX)

    // 限制在摇杆半径内
    const maxDistance = this.joystickArea.radius * 0.8
    const clampedDistance = Math.min(distance, maxDistance)

    // 归一化距离（0-1）
    const normalizedDistance = clampedDistance / maxDistance

    // 应用死区
    let effectiveDistance = normalizedDistance
    if (normalizedDistance < this.config.joystick.deadZone) {
      effectiveDistance = 0
    } else {
      // 重新映射死区外的距离到 0-1
      effectiveDistance =
        (normalizedDistance - this.config.joystick.deadZone) /
        (1 - this.config.joystick.deadZone)
    }

    // 更新摇杆状态
    if (effectiveDistance === 0) {
      this.joystickState.x = 0
      this.joystickState.y = 0
      this.joystickState.distance = 0
    } else {
      this.joystickState.x = Math.cos(angle) * effectiveDistance
      this.joystickState.y = Math.sin(angle) * effectiveDistance
      this.joystickState.distance = effectiveDistance
    }

    this.joystickState.angle = angle
  }

  /**
   * 处理按钮触摸开始
   */
  private handleButtonTouchStart(_touchPoint: TouchPoint, x: number, y: number): void {
    const buttonName = this.getButtonAtPosition(x, y)

    if (buttonName === 'fire') {
      this.buttonState.fire = true
    } else if (buttonName === 'missile') {
      this.buttonState.missile = true
    } else if (buttonName === 'nuke') {
      this.buttonState.nuke = true
    }
  }

  /**
   * 处理按钮触摸结束
   */
  private handleButtonTouchEnd(touchPoint: TouchPoint): void {
    const buttonName = this.getButtonAtPosition(touchPoint.startX, touchPoint.startY)

    if (buttonName === 'fire') {
      this.buttonState.fire = false
    } else if (buttonName === 'missile') {
      this.buttonState.missile = false
    } else if (buttonName === 'nuke') {
      this.buttonState.nuke = false
    }
  }

  /**
   * 阻止上下文菜单
   */
  private preventContextMenu = (event: Event): void => {
    event.preventDefault()
  }

  /**
   * 获取摇杆状态
   */
  public getJoystickState(): JoystickState {
    return { ...this.joystickState }
  }

  /**
   * 获取按钮状态
   */
  public getButtonState(): ButtonState {
    return { ...this.buttonState }
  }

  /**
   * 渲染虚拟控制器
   * 注意：这个方法用于在 Canvas 上绘制控制器
   * 实际项目中使用 Vue 组件（VirtualJoystick 和 TouchButton）
   */
  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.isMobile) return

    // 保存当前绘图状态
    ctx.save()

    // 渲染摇杆
    this.renderJoystick(ctx)

    // 渲染按钮
    this.renderButtons(ctx)

    // 恢复绘图状态
    ctx.restore()
  }

  /**
   * 渲染虚拟摇杆
   */
  private renderJoystick(ctx: CanvasRenderingContext2D): void {
    if (!this.joystickArea) return

    const centerX = this.joystickArea.x
    const centerY = this.joystickArea.y
    const radius = this.joystickArea.radius

    // 绘制摇杆底座
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // 绘制摇杆手柄
    if (this.joystickState.active || this.joystickState.distance > 0) {
      const stickRadius = radius * 0.4
      const maxOffset = radius * 0.6

      const offsetX = this.joystickState.x * maxOffset
      const offsetY = this.joystickState.y * maxOffset

      const stickX = centerX + offsetX
      const stickY = centerY + offsetY

      // 绘制手柄
      ctx.fillStyle = this.joystickState.active
        ? 'rgba(0, 217, 255, 0.8)'
        : 'rgba(0, 217, 255, 0.6)'
      ctx.strokeStyle = 'rgba(0, 217, 255, 1)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(stickX, stickY, stickRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // 绘制发光效果
      if (this.joystickState.active) {
        ctx.shadowColor = 'rgba(0, 217, 255, 0.6)'
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.arc(stickX, stickY, stickRadius, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }
    } else {
      // 绘制中心手柄（未激活状态）
      const stickRadius = radius * 0.4
      ctx.fillStyle = 'rgba(0, 217, 255, 0.6)'
      ctx.strokeStyle = 'rgba(0, 217, 255, 1)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(centerX, centerY, stickRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }

  /**
   * 渲染触摸按钮
   */
  private renderButtons(ctx: CanvasRenderingContext2D): void {
    // 渲染开火键
    this.renderButton(
      ctx,
      this.config.buttons.fire.x,
      this.config.buttons.fire.y,
      this.config.buttons.fire.size / 2,
      'FIRE',
      '#00D9FF',
      this.buttonState.fire
    )

    // 渲染导弹键
    this.renderButton(
      ctx,
      this.config.buttons.missile.x,
      this.config.buttons.missile.y,
      this.config.buttons.missile.size / 2,
      'MSL',
      '#7B61FF',
      this.buttonState.missile
    )

    // 渲染核弹键
    this.renderButton(
      ctx,
      this.config.buttons.nuke.x,
      this.config.buttons.nuke.y,
      this.config.buttons.nuke.size / 2,
      'NUKE',
      '#FF6B9D',
      this.buttonState.nuke
    )
  }

  /**
   * 渲染单个按钮
   */
  private renderButton(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    label: string,
    color: string,
    isPressed: boolean
  ): void {
    // 绘制按钮背景
    ctx.fillStyle = isPressed ? `${color}CC` : `${color}66`
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // 绘制发光效果
    if (isPressed) {
      ctx.shadowColor = `${color}AA`
      ctx.shadowBlur = 15
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }

    // 绘制按钮标签
    ctx.fillStyle = '#FFFFFF'
    ctx.font = `bold ${radius * 0.5}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    ctx.shadowBlur = 4
    ctx.fillText(label, x, y)
    ctx.shadowBlur = 0
  }

  /**
   * 清理资源
   */
  public destroy(): void {
    if (!this.isInitialized) return

    // 移除事件监听
    this.canvas.removeEventListener('touchstart', this.handleTouchStart)
    this.canvas.removeEventListener('touchmove', this.handleTouchMove)
    this.canvas.removeEventListener('touchend', this.handleTouchEnd)
    this.canvas.removeEventListener('touchcancel', this.handleTouchEnd)
    this.canvas.removeEventListener('contextmenu', this.preventContextMenu)

    // 清空状态
    this.touchPoints.clear()
    this.joystickState = {
      active: false,
      x: 0,
      y: 0,
      angle: 0,
      distance: 0
    }
    this.buttonState = {
      fire: false,
      missile: false,
      nuke: false
    }

    this.isInitialized = false
    console.debug('[MobileController] 清理完成')
  }

  /**
   * 检查是否为移动设备
   */
  public get isMobileDevice(): boolean {
    return this.isMobile
  }

  /**
   * 更新配置（响应画布尺寸变化）
   */
  public updateConfig(canvasWidth: number, canvasHeight: number): void {
    this.config = {
      joystick: {
        x: 100,
        y: canvasHeight - 100,
        radius: 60,
        deadZone: 0.1
      },
      buttons: {
        fire: {
          x: canvasWidth - 80,
          y: canvasHeight - 80,
          size: 60
        },
        missile: {
          x: canvasWidth - 80,
          y: canvasHeight - 160,
          size: 55
        },
        nuke: {
          x: canvasWidth - 80,
          y: canvasHeight - 240,
          size: 55
        }
      }
    }

    this.updateTouchAreas()
  }
}
