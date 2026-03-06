/**
 * 输入管理器
 * 负责键盘输入的监听和状态管理
 */

export class InputManager {
  private keyStates: Map<string, boolean> = new Map()
  private keyDownHandlers: Map<string, Function[]> = new Map()
  private keyUpHandlers: Map<string, Function[]> = new Map()

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

    // 防止重复触发
    if (this.keyStates.get(key)) {
      return
    }

    this.keyStates.set(key, true)

    // 触发注册的处理函数
    const handlers = this.keyDownHandlers.get(key)
    if (handlers) {
      handlers.forEach(handler => handler(event))
    }
  }

  /**
   * 处理按键释放事件
   */
  private handleKeyUp = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase()
    this.keyStates.set(key, false)

    // 触发注册的处理函数
    const handlers = this.keyUpHandlers.get(key)
    if (handlers) {
      handlers.forEach((handler) => handler(event))
    }
  }

  /**
   * 检查按键是否被按下
   */
  isKeyPressed(key: string): boolean {
    return this.keyStates.get(key.toLowerCase()) || false
  }

  /**
   * 注册按键按下事件处理函数
   */
  onKeyDown(key: string, handler: Function): void {
    const normalizedKey = key.toLowerCase()
    if (!this.keyDownHandlers.has(normalizedKey)) {
      this.keyDownHandlers.set(normalizedKey, [])
    }
    this.keyDownHandlers.get(normalizedKey)!.push(handler)
  }

  /**
   * 注册按键释放事件处理函数
   */
  onKeyUp(key: string, handler: Function): void {
    const normalizedKey = key.toLowerCase()
    if (!this.keyUpHandlers.has(normalizedKey)) {
      this.keyUpHandlers.set(normalizedKey, [])
    }
    this.keyUpHandlers.get(normalizedKey)!.push(handler)
  }

  /**
   * 移除按键按下事件处理函数
   */
  offKeyDown(key: string, handler: Function): void {
    const normalizedKey = key.toLowerCase()
    const handlers = this.keyDownHandlers.get(normalizedKey)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index !== -1) {
        handlers.splice(index, 1)
      }
    }
  }

  /**
   * 移除按键释放事件处理函数
   */
  offKeyUp(key: string, handler: Function): void {
    const normalizedKey = key.toLowerCase()
    const handlers = this.keyUpHandlers.get(normalizedKey)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index !== -1) {
        handlers.splice(index, 1)
      }
    }
  }

  /**
   * 清空所有按键状态
   */
  clearKeyStates(): void {
    this.keyStates.clear()
  }

  /**
   * 销毁输入管理器
   */
  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    this.keyStates.clear()
    this.keyDownHandlers.clear()
    this.keyUpHandlers.clear()
  }
}
