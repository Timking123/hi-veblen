/**
 * 键盘快捷键工具
 * 提供全局键盘快捷键支持
 * 
 * 需求: 用户体验优化 - 43.3
 */
import { onMounted, onUnmounted } from 'vue'

// 快捷键配置类型
export interface ShortcutConfig {
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  handler: () => void
  description: string
}

// 已注册的快捷键
const registeredShortcuts: ShortcutConfig[] = []

/**
 * 检查按键是否匹配快捷键配置
 */
function matchShortcut(event: KeyboardEvent, config: ShortcutConfig): boolean {
  const keyMatch = event.key.toLowerCase() === config.key.toLowerCase()
  const ctrlMatch = !!config.ctrl === (event.ctrlKey || event.metaKey)
  const altMatch = !!config.alt === event.altKey
  const shiftMatch = !!config.shift === event.shiftKey
  
  return keyMatch && ctrlMatch && altMatch && shiftMatch
}

/**
 * 全局键盘事件处理器
 */
function handleKeyDown(event: KeyboardEvent) {
  // 忽略输入框中的快捷键（除了 Escape）
  const target = event.target as HTMLElement
  const isInput = target.tagName === 'INPUT' || 
                  target.tagName === 'TEXTAREA' || 
                  target.isContentEditable
  
  for (const config of registeredShortcuts) {
    if (matchShortcut(event, config)) {
      // 如果在输入框中，只允许 Escape 键
      if (isInput && config.key.toLowerCase() !== 'escape') {
        continue
      }
      
      event.preventDefault()
      event.stopPropagation()
      config.handler()
      return
    }
  }
}

/**
 * 注册快捷键
 */
export function registerShortcut(config: ShortcutConfig): () => void {
  registeredShortcuts.push(config)
  
  // 返回取消注册函数
  return () => {
    const index = registeredShortcuts.indexOf(config)
    if (index > -1) {
      registeredShortcuts.splice(index, 1)
    }
  }
}

/**
 * 初始化键盘快捷键系统
 */
export function initKeyboardShortcuts(): void {
  document.addEventListener('keydown', handleKeyDown)
}

/**
 * 销毁键盘快捷键系统
 */
export function destroyKeyboardShortcuts(): void {
  document.removeEventListener('keydown', handleKeyDown)
  registeredShortcuts.length = 0
}

/**
 * 获取所有已注册的快捷键
 */
export function getRegisteredShortcuts(): ShortcutConfig[] {
  return [...registeredShortcuts]
}

/**
 * 格式化快捷键显示文本
 */
export function formatShortcut(config: ShortcutConfig): string {
  const parts: string[] = []
  
  if (config.ctrl) parts.push('Ctrl')
  if (config.alt) parts.push('Alt')
  if (config.shift) parts.push('Shift')
  parts.push(config.key.toUpperCase())
  
  return parts.join(' + ')
}

/**
 * Vue Composable: 使用键盘快捷键
 */
export function useKeyboardShortcut(config: ShortcutConfig) {
  let unregister: (() => void) | null = null
  
  onMounted(() => {
    unregister = registerShortcut(config)
  })
  
  onUnmounted(() => {
    if (unregister) {
      unregister()
    }
  })
}

/**
 * Vue Composable: 使用多个键盘快捷键
 */
export function useKeyboardShortcuts(configs: ShortcutConfig[]) {
  const unregisters: (() => void)[] = []
  
  onMounted(() => {
    configs.forEach(config => {
      unregisters.push(registerShortcut(config))
    })
  })
  
  onUnmounted(() => {
    unregisters.forEach(unregister => unregister())
  })
}
