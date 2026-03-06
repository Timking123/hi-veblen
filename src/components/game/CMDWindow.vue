<template>
  <div v-if="isVisible" class="cmd-window">
    <div class="cmd-content">
      <!-- 提示文本 -->
      <div class="cmd-prompt">
        <span class="cmd-text">{{ displayedText }}</span>
        <span v-if="showCursor" class="cmd-cursor">_</span>
      </div>
      
      <!-- 用户输入 -->
      <div v-if="showInput" class="cmd-input-line">
        <span class="cmd-prompt-symbol">&gt;</span>
        <span class="cmd-user-input">{{ userInput }}</span>
        <span v-if="showInputCursor" class="cmd-cursor">_</span>
      </div>
      
      <!-- 错误提示 -->
      <div v-if="errorMessage" class="cmd-error">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useEasterEggStore } from '@/stores/easterEgg'
import { GamePhase } from '@/game/types'

const easterEggStore = useEasterEggStore()

const isVisible = ref(false)
const displayedText = ref('')
const showCursor = ref(true)
const showInput = ref(false)
const showInputCursor = ref(true)
const userInput = ref('')
const errorMessage = ref('')

const fullText = '是否来玩个游戏？是y/否n'
let typingIndex = 0
let typingTimer: number | null = null
let cursorTimer: number | null = null

// 监听游戏阶段变化
watch(() => easterEggStore.phase, (newPhase) => {
  if (newPhase === GamePhase.CMD_WINDOW) {
    console.log('[CMD] 显示CMD窗口')
    isVisible.value = true
    startTypingEffect()
  }
})

/**
 * 开始打字机效果
 */
function startTypingEffect() {
  typingIndex = 0
  displayedText.value = ''
  showCursor.value = true
  
  const typeNextChar = () => {
    if (typingIndex < fullText.length) {
      displayedText.value += fullText[typingIndex]
      typingIndex++
      typingTimer = window.setTimeout(typeNextChar, 80)
    } else {
      // 打字完成，显示输入区域
      showInput.value = true
      startCursorBlink()
    }
  }
  
  typeNextChar()
}

/**
 * 开始光标闪烁
 */
function startCursorBlink() {
  cursorTimer = window.setInterval(() => {
    showInputCursor.value = !showInputCursor.value
  }, 500)
}

/**
 * 处理键盘输入
 */
function handleKeyPress(event: KeyboardEvent) {
  if (!isVisible.value || !showInput.value) return
  
  const key = event.key.toLowerCase()
  
  if (key === 'enter') {
    handleCommand()
  } else if (key === 'backspace') {
    userInput.value = userInput.value.slice(0, -1)
    errorMessage.value = ''
  } else if (key.length === 1 && /[a-z0-9]/.test(key)) {
    userInput.value += key
    errorMessage.value = ''
  }
}

/**
 * 处理命令
 */
function handleCommand() {
  const command = userInput.value.trim().toLowerCase()
  
  console.log(`[CMD] 用户输入命令: "${command}"`)
  
  if (command === 'y') {
    console.log('[CMD] 用户选择进入游戏')
    closeWindow()
    easterEggStore.enterRules()
  } else if (command === 'n') {
    console.log('[CMD] 用户选择退出')
    closeWindow()
    easterEggStore.restoreNormalPage()
  } else {
    console.log('[CMD] 无效命令')
    errorMessage.value = '无效输入！请输入 y 或 n'
    userInput.value = ''
  }
}

/**
 * 关闭窗口
 */
function closeWindow() {
  isVisible.value = false
  cleanup()
}

/**
 * 清理定时器
 */
function cleanup() {
  if (typingTimer) {
    clearTimeout(typingTimer)
    typingTimer = null
  }
  if (cursorTimer) {
    clearInterval(cursorTimer)
    cursorTimer = null
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
  cleanup()
})
</script>

<style scoped>
.cmd-window {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #000000;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 使用老式电脑等宽字体，中英文统一风格 */
  font-family: 'Consolas', 'Courier New', 'Monaco', 'Menlo', 'Ubuntu Mono', 'DejaVu Sans Mono', monospace;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.cmd-content {
  max-width: 800px;
  padding: 40px;
}

.cmd-prompt {
  color: #00ff00;
  font-size: 16px;
  line-height: 1.8;
  margin-bottom: 20px;
}

.cmd-text {
  display: inline;
}

.cmd-cursor {
  display: inline-block;
  color: #00ff00;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

.cmd-input-line {
  color: #00ff00;
  font-size: 16px;
  line-height: 1.8;
  margin-top: 20px;
}

.cmd-prompt-symbol {
  margin-right: 10px;
}

.cmd-user-input {
  display: inline;
}

.cmd-error {
  color: #ff0000;
  font-size: 14px;
  line-height: 1.8;
  margin-top: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .cmd-content {
    padding: 20px;
  }
  
  .cmd-prompt,
  .cmd-input-line {
    font-size: 12px;
  }
  
  .cmd-error {
    font-size: 10px;
  }
}

@media (max-width: 480px) {
  .cmd-prompt,
  .cmd-input-line {
    font-size: 10px;
  }
  
  .cmd-error {
    font-size: 8px;
  }
}
</style>
