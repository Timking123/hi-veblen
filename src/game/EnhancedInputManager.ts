/**
 * 增强输入管理器
 * 负责改进的键盘输入处理，支持单次按键、长按重复和按键释放检测
 * 
 * 需求: 8.1, 8.2, 8.3, 11.1, 11.2, 11.3
 */

import { MOVEMENT_CONFIG, SHOOTING_CONFIG } from './constants'

/**
 * 按键状态接口
 */
interface KeyState {
  isDown: boolean           // 按键是否按下
  justPressed: boolean      // 是否刚刚按下（单帧）
  justReleased: boolean     // 是否刚刚释放（单帧）
  pressTime: number         // 按下的时间戳
  lastRepeatTime: number    // 上次重复触发的时间戳
}

/**
 * 增强输入管理器类
 */
export class EnhancedInputManager {
  private keyStates: Map<string, KeyState> = new Map()
  private lastGunFireTime: number = 0
  private missileKeyWasDown: boolean = false

  constructor() {
    this.setupEventListeners()
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
  }

  /**
   * 处理按键按下事件
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase()
    const state = this.getOrCreateKeyState(key)

    // 如果按键已经按下，不更新 justPressed（防止重复触发）
    if (state.isDown) {
      return
    }

    const now = Date.now()
    state.isDown = true
    state.justPressed = true
    state.pressTime = now
    state.lastRepeatTime = now
  }

  /**
   * 处理按键释放事件
   */
  private handleKeyUp = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase()
    const state = this.getOrCreateKeyState(key)

    state.isDown = false
    state.justReleased = true
  }

  /**
   * 获取或创建按键状态
   */
  private getOrCreateKeyState(key: string): KeyState {
    if (!this.keyStates.has(key)) {
      this.keyStates.set(key, {
        isDown: false,
        justPressed: false,
        justReleased: false,
        pressTime: 0,
        lastRepeatTime: 0
      })
    }
    return this.keyStates.get(key)!
  }

  /**
   * 更新输入状态（每帧调用）
   * @param deltaTime 帧间隔时间（毫秒）
   */
  update(_deltaTime: number): void {
    // 清除单帧状态
    for (const state of this.keyStates.values()) {
      state.justPressed = false
      state.justReleased = false
    }
  }

  /**
   * 检查按键是否刚按下（单帧）
   * @param key 按键名称
   * @returns 是否刚按下
   */
  isKeyJustPressed(key: string): boolean {
    const state = this.keyStates.get(key.toLowerCase())
    return state ? state.justPressed : false
  }

  /**
   * 检查按键是否正在按住
   * @param key 按键名称
   * @returns 是否按住
   */
  isKeyHeld(key: string): boolean {
    const state = this.keyStates.get(key.toLowerCase())
    return state ? state.isDown : false
  }

  /**
   * 检查按键是否刚释放（单帧）
   * @param key 按键名称
   * @returns 是否刚释放
   */
  isKeyJustReleased(key: string): boolean {
    const state = this.keyStates.get(key.toLowerCase())
    return state ? state.justReleased : false
  }

  /**
   * 获取移动输入（考虑长按延迟）
   * 单次按键移动 1 像素块，长按每 200ms 移动 1 像素块
   * @returns 移动向量 { x, y }，值为 -1, 0, 或 1
   */
  getMovementInput(): { x: number; y: number } {
    const now = Date.now()
    let x = 0
    let y = 0

    // 检查水平移动
    const leftState = this.keyStates.get('a')
    const rightState = this.keyStates.get('d')

    if (leftState && leftState.isDown) {
      // 检查是否刚按下或者已经过了重复间隔
      if (leftState.justPressed || now - leftState.lastRepeatTime >= MOVEMENT_CONFIG.PLAYER_MOVE_INTERVAL) {
        x = -1
        leftState.lastRepeatTime = now
        leftState.justPressed = false // 消耗 justPressed 标志
      }
    }

    if (rightState && rightState.isDown) {
      if (rightState.justPressed || now - rightState.lastRepeatTime >= MOVEMENT_CONFIG.PLAYER_MOVE_INTERVAL) {
        x = 1
        rightState.lastRepeatTime = now
        rightState.justPressed = false // 消耗 justPressed 标志
      }
    }

    // 检查垂直移动
    const upState = this.keyStates.get('w')
    const downState = this.keyStates.get('s')

    if (upState && upState.isDown) {
      if (upState.justPressed || now - upState.lastRepeatTime >= MOVEMENT_CONFIG.PLAYER_MOVE_INTERVAL) {
        y = -1
        upState.lastRepeatTime = now
        upState.justPressed = false // 消耗 justPressed 标志
      }
    }

    if (downState && downState.isDown) {
      if (downState.justPressed || now - downState.lastRepeatTime >= MOVEMENT_CONFIG.PLAYER_MOVE_INTERVAL) {
        y = 1
        downState.lastRepeatTime = now
        downState.justPressed = false // 消耗 justPressed 标志
      }
    }

    return { x, y }
  }

  /**
   * 检查是否应该发射机炮（考虑射速限制）
   * 最快间隔 200ms 发射一次
   * @returns 是否应该发射
   */
  shouldFireGun(): boolean {
    const gunKey = this.keyStates.get('j')
    if (!gunKey || !gunKey.isDown) {
      return false
    }

    const now = Date.now()
    if (now - this.lastGunFireTime >= SHOOTING_CONFIG.PLAYER_GUN_COOLDOWN) {
      this.lastGunFireTime = now
      return true
    }

    return false
  }

  /**
   * 检查是否应该发射导弹（单次发射）
   * 按一次 K 键发射一枚导弹，长按不连续发射
   * 释放后再按才能发射新的导弹
   * @returns 是否应该发射
   */
  shouldFireMissile(): boolean {
    const missileKey = this.keyStates.get('k')
    
    if (!missileKey || !missileKey.isDown) {
      // 按键未按下或已释放，重置状态
      if (this.missileKeyWasDown) {
        console.log('[输入管理器] K键释放，重置导弹发射状态')
      }
      this.missileKeyWasDown = false
      return false
    }

    // 如果按键按下但之前没有按下，返回true（首次按下）
    if (missileKey.isDown && !this.missileKeyWasDown) {
      console.log('[输入管理器] K键首次按下，允许发射导弹')
      this.missileKeyWasDown = true
      return true
    }

    // 按键持续按下，不允许连续发射
    return false
  }

  /**
   * 检查是否应该发射核弹
   * @returns 是否应该发射
   */
  shouldLaunchNuke(): boolean {
    return this.isKeyJustPressed(' ')
  }

  /**
   * 重置输入状态
   */
  reset(): void {
    this.keyStates.clear()
    this.lastGunFireTime = 0
    this.missileKeyWasDown = false
  }

  /**
   * 销毁输入管理器
   */
  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    this.reset()
  }
}
