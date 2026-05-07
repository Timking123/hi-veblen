/**
 * 彩蛋游戏状态管理
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { GamePhase } from '@/game/types'

interface SavedPageState {
  scrollPosition: number
  timestamp: number
}

const restorePageShell = (): void => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
}

export const useEasterEggStore = defineStore('easterEgg', () => {
  // 状态
  const phase = ref<GamePhase>(GamePhase.IDLE)
  const savedPageState = ref<SavedPageState | null>(null)

  /**
   * 进入页面崩塌动画阶段
   */
  function enterCollapseAnimation() {
    console.log('[彩蛋] 进入崩塌动画阶段')
    phase.value = GamePhase.COLLAPSE_ANIMATION

    // 保存当前页面状态
    savedPageState.value = {
      scrollPosition: window.scrollY,
      timestamp: Date.now(),
    }

    // 阻止页面滚动
    document.body.style.overflow = 'hidden'
  }

  /**
   * 进入CMD窗口阶段
   */
  function enterCMDWindow() {
    console.log('[彩蛋] 进入CMD窗口阶段')
    phase.value = GamePhase.CMD_WINDOW
  }

  /**
   * 进入游戏规则阶段
   */
  function enterRules() {
    console.log('[彩蛋] 进入游戏规则阶段')
    phase.value = GamePhase.RULES
  }

  /**
   * 进入游戏阶段
   */
  function enterGame() {
    console.log('[彩蛋] 进入游戏阶段')
    phase.value = GamePhase.PLAYING
  }

  /**
   * 进入庆祝页面阶段
   */
  function enterCelebration() {
    console.log('[彩蛋] 进入庆祝页面阶段')
    phase.value = GamePhase.CELEBRATION
  }

  /**
   * 恢复正常页面
   */
  function restoreNormalPage(options: { reload?: boolean } = {}) {
    console.log('[彩蛋] 恢复正常页面')
    phase.value = GamePhase.IDLE
    restorePageShell()

    const scrollPosition = savedPageState.value?.scrollPosition ?? 0
    savedPageState.value = null

    if (options.reload) {
      window.location.href = '/'
      return
    }

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: scrollPosition, behavior: 'instant' })
    })
  }

  /**
   * 重置状态
   */
  function reset(options: { reload?: boolean } = {}) {
    restoreNormalPage(options)
  }

  return {
    phase,
    savedPageState,
    enterCollapseAnimation,
    enterCMDWindow,
    enterRules,
    enterGame,
    enterCelebration,
    restoreNormalPage,
    reset,
  }
})
