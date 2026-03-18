<template>
  <div v-if="isVisible" class="cmd-window">
    <div class="cmd-content">
      <!-- 提示文本 -->
      <div class="cmd-prompt">
        <span class="cmd-text">{{ displayedText }}</span>
        <span v-if="showCursor" class="cmd-cursor">_</span>
      </div>
      
      <!-- 移动端按钮界面 -->
      <div v-if="showInput && isMobile" class="mobile-buttons">
        <button
          class="choice-button yes-button"
          :class="{ pressed: yesButtonPressed }"
          @touchstart.prevent="handleYesPress"
          @touchend.prevent="handleYesRelease"
          @click.prevent="handleYesClick"
        >
          <span class="button-label">Y</span>
        </button>
        <button
          class="choice-button no-button"
          :class="{ pressed: noButtonPressed }"
          @touchstart.prevent="handleNoPress"
          @touchend.prevent="handleNoRelease"
          @click.prevent="handleNoClick"
        >
          <span class="button-label">N</span>
        </button>
      </div>
      
      <!-- 桌面端键盘输入 -->
      <div v-if="showInput && !isMobile" class="cmd-input-line">
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
import { ResponsiveDetector } from '@/utils/responsiveDetector'

const easterEggStore = useEasterEggStore()
const responsiveDetector = ResponsiveDetector.getInstance()

const isVisible = ref(false)
const displayedText = ref('')
const showCursor = ref(true)
const showInput = ref(false)
const showInputCursor = ref(true)
const userInput = ref('')
const errorMessage = ref('')

// 移动端相关状态
const isMobile = ref(false)
const yesButtonPressed = ref(false)
const noButtonPressed = ref(false)

const fullText = '是否来玩个游戏？是y/否n'
let typingIndex = 0
let typingTimer: number | null = null
let cursorTimer: number | null = null

/**
 * 检测设备类型
 */
function detectDevice() {
  const screenInfo = responsiveDetector.getScreenInfo()
  isMobile.value = (
    (screenInfo.deviceType === 'mobile' || screenInfo.deviceType === 'tablet') &&
    screenInfo.isTouchDevice
  )
  console.log('[CMD] 设备类型检测:', isMobile.value ? '移动设备' : '桌面设备')
}

// 监听游戏阶段变化
watch(() => easterEggStore.phase, (newPhase) => {
  if (newPhase === GamePhase.CMD_WINDOW) {
    console.log('[CMD] 显示CMD窗口')
    detectDevice()
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
  if (!isVisible.value || !showInput.value || isMobile.value) return
  
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
 * 处理 Y 按钮按下
 */
function handleYesPress() {
  yesButtonPressed.value = true
  // 触觉反馈
  if ('vibrate' in navigator) {
    navigator.vibrate(50)
  }
}

/**
 * 处理 Y 按钮释放
 */
function handleYesRelease() {
  yesButtonPressed.value = false
}

/**
 * 处理 Y 按钮点击
 */
function handleYesClick() {
  console.log('[CMD] 用户点击 Y 按钮')
  closeWindow()
  easterEggStore.enterRules()
}

/**
 * 处理 N 按钮按下
 */
function handleNoPress() {
  noButtonPressed.value = true
  // 触觉反馈
  if ('vibrate' in navigator) {
    navigator.vibrate(50)
  }
}

/**
 * 处理 N 按钮释放
 */
function handleNoRelease() {
  noButtonPressed.value = false
}

/**
 * 处理 N 按钮点击
 */
function handleNoClick() {
  console.log('[CMD] 用户点击 N 按钮')
  closeWindow()
  easterEggStore.restoreNormalPage()
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
  
  // 检测设备类型
  detectDevice()
  
  // 如果已经处于 CMD 窗口阶段，立即显示
  if (easterEggStore.phase === GamePhase.CMD_WINDOW) {
    isVisible.value = true
    startTypingEffect()
  }
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

/* 移动端按钮样式 */
.mobile-buttons {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-top: 40px;
}

.choice-button {
  position: relative;
  width: 100px;
  height: 100px;
  border: none;
  cursor: pointer;
  font-family: 'Consolas', 'Courier New', 'Monaco', 'Menlo', monospace;
  font-size: 48px;
  font-weight: bold;
  color: #ffffff;
  text-shadow: 0 0 10px currentColor, 0 0 20px currentColor;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  
  /* 复古方形条纹样式 */
  background-size: 10px 10px;
  box-shadow: 
    0 0 20px currentColor,
    inset 0 0 20px rgba(0, 0, 0, 0.3);
}

/* Y 按钮 - 红色 */
.yes-button {
  background-color: #ff3333;
  background-image: 
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 5px,
      rgba(0, 0, 0, 0.2) 5px,
      rgba(0, 0, 0, 0.2) 10px
    );
  border: 3px solid #ff6666;
}

.yes-button:hover {
  background-color: #ff4444;
  box-shadow: 
    0 0 30px #ff3333,
    inset 0 0 20px rgba(0, 0, 0, 0.3);
}

/* N 按钮 - 蓝色 */
.no-button {
  background-color: #3333ff;
  background-image: 
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 5px,
      rgba(0, 0, 0, 0.2) 5px,
      rgba(0, 0, 0, 0.2) 10px
    );
  border: 3px solid #6666ff;
}

.no-button:hover {
  background-color: #4444ff;
  box-shadow: 
    0 0 30px #3333ff,
    inset 0 0 20px rgba(0, 0, 0, 0.3);
}

/* 按钮按下状态 */
.choice-button.pressed {
  transform: scale(0.95);
  box-shadow: 
    0 0 40px currentColor,
    inset 0 0 30px rgba(0, 0, 0, 0.5);
}

.yes-button.pressed {
  background-color: #ff5555;
}

.no-button.pressed {
  background-color: #5555ff;
}

/* 按钮标签 */
.button-label {
  display: block;
  position: relative;
  z-index: 1;
}

/* 按钮动画效果 */
@keyframes buttonPulse {
  0%, 100% {
    box-shadow: 
      0 0 20px currentColor,
      inset 0 0 20px rgba(0, 0, 0, 0.3);
  }
  50% {
    box-shadow: 
      0 0 30px currentColor,
      inset 0 0 20px rgba(0, 0, 0, 0.3);
  }
}

.choice-button {
  animation: buttonPulse 2s ease-in-out infinite;
}

/* 移动端响应式调整 */
@media (max-width: 768px) {
  .mobile-buttons {
    gap: 30px;
    margin-top: 30px;
  }
  
  .choice-button {
    width: 80px;
    height: 80px;
    font-size: 40px;
  }
}

@media (max-width: 480px) {
  .mobile-buttons {
    gap: 20px;
    margin-top: 20px;
  }
  
  .choice-button {
    width: 70px;
    height: 70px;
    font-size: 36px;
  }
}

/* 确保触摸目标足够大（可访问性） */
@media (max-width: 480px) {
  .choice-button {
    min-width: 44px;
    min-height: 44px;
  }
}
</style>
