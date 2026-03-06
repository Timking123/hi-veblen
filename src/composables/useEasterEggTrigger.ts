/**
 * 彩蛋触发器 Composable
 * 检测5秒内点击头像3次来触发彩蛋
 */

import { ref } from 'vue'

const CLICK_THRESHOLD = 3
const TIME_WINDOW = 5000 // 5秒

export function useEasterEggTrigger() {
  const clickCount = ref(0)
  const lastClickTime = ref(0)
  const isTriggered = ref(false)
  const onTrigger = ref<(() => void) | null>(null)

  /**
   * 处理头像点击
   */
  const handleAvatarClick = () => {
    if (isTriggered.value) return

    const currentTime = Date.now()
    const timeSinceLastClick = currentTime - lastClickTime.value

    // 如果距离上次点击超过5秒，重置计数器
    if (timeSinceLastClick > TIME_WINDOW) {
      clickCount.value = 0
    }

    // 增加点击计数
    clickCount.value++
    lastClickTime.value = currentTime

    console.log(`[Easter Egg] Click ${clickCount.value}/${CLICK_THRESHOLD}`)

    // 检查是否达到触发条件
    if (clickCount.value >= CLICK_THRESHOLD) {
      triggerEasterEgg()
    }
  }

  /**
   * 重置点击计数器
   */
  const resetClickCounter = () => {
    clickCount.value = 0
    lastClickTime.value = 0
  }

  /**
   * 触发彩蛋
   */
  const triggerEasterEgg = () => {
    console.log('[Easter Egg] Triggered!')
    isTriggered.value = true
    
    // 调用回调函数
    if (onTrigger.value) {
      onTrigger.value()
    }
  }

  /**
   * 重置触发状态（用于返回正常页面）
   */
  const reset = () => {
    isTriggered.value = false
    resetClickCounter()
  }

  /**
   * 设置触发回调
   */
  const setTriggerCallback = (callback: () => void) => {
    onTrigger.value = callback
  }

  return {
    clickCount,
    isTriggered,
    handleAvatarClick,
    resetClickCounter,
    reset,
    setTriggerCallback
  }
}
