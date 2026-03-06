<template>
  <div v-if="isVisible" class="rules-window">
    <div class="rules-content">
      <!-- 标题 -->
      <div class="rules-title">
        <span class="title-text">{{ displayedTitle }}</span>
        <span v-if="showTitleCursor" class="cmd-cursor">_</span>
      </div>
      
      <!-- 规则内容 -->
      <div v-if="showContent" class="rules-body">
        <div v-for="(section, index) in displayedSections" :key="index" class="rules-section">
          <div class="section-title">{{ section.title }}</div>
          <div v-for="(line, lineIndex) in section.lines" :key="lineIndex" class="section-line">
            {{ line }}
          </div>
        </div>
        
        <!-- 显示光标在当前行 -->
        <span v-if="showContentCursor && !isComplete" class="cmd-cursor">_</span>
      </div>
      
      <!-- 继续提示 -->
      <div v-if="isComplete" class="continue-prompt">
        <span class="prompt-text">{{ displayedPrompt }}</span>
        <span v-if="showPromptCursor" class="cmd-cursor">_</span>
      </div>
      
      <!-- 跳过提示 -->
      <div v-if="!isComplete" class="skip-hint">
        按任意键跳过...
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useEasterEggStore } from '@/stores/easterEgg'

const easterEggStore = useEasterEggStore()

// 组件状态
const isVisible = ref(false)
const showTitleCursor = ref(true)
const showContent = ref(false)
const showContentCursor = ref(true)
const showPromptCursor = ref(true)
const isComplete = ref(false)

// 显示内容
const displayedTitle = ref('')
const displayedSections = ref<Array<{ title: string; lines: string[] }>>([])
const displayedPrompt = ref('')

// 游戏规则内容
const fullTitle = '=== 游戏规则说明 ==='

const ruleSections = [
  {
    title: '【操作方式】',
    lines: [
      'W A S D - 移动飞船',
      'J - 发射机炮',
      'K - 发射导弹',
      '空格 - 发射核弹（清屏）'
    ]
  },
  {
    title: '【武器系统】',
    lines: [
      '机炮：无限弹药，射速快',
      '导弹：数量有限，威力大',
      '核弹：击败敌人积累进度，满格可发射'
    ]
  },
  {
    title: '【生命值系统】',
    lines: [
      '左上角显示当前生命值',
      '被敌人或敌方子弹击中会扣血',
      '生命值归零则游戏结束'
    ]
  },
  {
    title: '【掉落物系统】',
    lines: [
      '红色 - 机炮升级（子弹数/轨迹/射速/伤害/速度）',
      '蓝色 - 导弹升级（数量/伤害/速度）',
      '绿色 - 维修包（恢复1点生命值）',
      '黄色 - 引擎升级（提升移动速度）'
    ]
  },
  {
    title: '【游戏技巧】',
    lines: [
      '1. 优先击败精英怪和BOSS获取更多掉落',
      '2. 合理使用导弹和核弹应对危机',
      '3. 注意躲避敌方子弹和导弹',
      '4. 收集掉落物提升战斗力',
      '5. 保持移动，不要停在原地'
    ]
  }
]

const continuePrompt = '按任意键开始游戏...'

// 打字机效果相关
let typingTimer: number | null = null
let cursorTimer: number | null = null
let currentSectionIndex = 0
let currentLineIndex = 0
let currentCharIndex = 0
let typingStage: 'title' | 'content' | 'prompt' = 'title'

/**
 * 显示规则界面
 */
const show = (): void => {
  console.log('[游戏规则] 显示规则界面')
  isVisible.value = true
  startTypingEffect()
}

/**
 * 隐藏规则界面
 */
const hide = (): void => {
  console.log('[游戏规则] 隐藏规则界面')
  isVisible.value = false
  cleanup()
}

/**
 * 开始打字机效果
 */
const startTypingEffect = (): void => {
  // 重置状态
  displayedTitle.value = ''
  displayedSections.value = []
  displayedPrompt.value = ''
  currentSectionIndex = 0
  currentLineIndex = 0
  currentCharIndex = 0
  typingStage = 'title'
  isComplete.value = false
  showContent.value = false
  
  // 开始打字
  typeNextChar()
  
  // 开始光标闪烁
  startCursorBlink()
}

/**
 * 打字下一个字符
 */
const typeNextChar = (): void => {
  if (typingStage === 'title') {
    // 打标题
    if (currentCharIndex < fullTitle.length) {
      displayedTitle.value += fullTitle[currentCharIndex]
      currentCharIndex++
      typingTimer = window.setTimeout(typeNextChar, 50)
    } else {
      // 标题打完，开始打内容
      typingStage = 'content'
      currentCharIndex = 0
      showContent.value = true
      typingTimer = window.setTimeout(typeNextChar, 300)
    }
  } else if (typingStage === 'content') {
    // 打内容
    if (currentSectionIndex < ruleSections.length) {
      const section = ruleSections[currentSectionIndex]
      
      // 确保当前 section 已添加到显示列表
      if (displayedSections.value.length <= currentSectionIndex) {
        displayedSections.value.push({
          title: section.title,
          lines: []
        })
      }
      
      // 打当前行
      if (currentLineIndex < section.lines.length) {
        const line = section.lines[currentLineIndex]
        const displayedSection = displayedSections.value[currentSectionIndex]
        
        // 确保当前行已添加
        if (displayedSection.lines.length <= currentLineIndex) {
          displayedSection.lines.push('')
        }
        
        // 打字符
        if (currentCharIndex < line.length) {
          displayedSection.lines[currentLineIndex] += line[currentCharIndex]
          currentCharIndex++
          typingTimer = window.setTimeout(typeNextChar, 30)
        } else {
          // 当前行打完，下一行
          currentLineIndex++
          currentCharIndex = 0
          typingTimer = window.setTimeout(typeNextChar, 100)
        }
      } else {
        // 当前 section 打完，下一个 section
        currentSectionIndex++
        currentLineIndex = 0
        currentCharIndex = 0
        typingTimer = window.setTimeout(typeNextChar, 300)
      }
    } else {
      // 内容打完，打提示
      typingStage = 'prompt'
      currentCharIndex = 0
      typingTimer = window.setTimeout(typeNextChar, 500)
    }
  } else if (typingStage === 'prompt') {
    // 打提示
    if (currentCharIndex < continuePrompt.length) {
      displayedPrompt.value += continuePrompt[currentCharIndex]
      currentCharIndex++
      typingTimer = window.setTimeout(typeNextChar, 50)
    } else {
      // 全部打完
      isComplete.value = true
    }
  }
}

/**
 * 跳过打字动画
 */
const skip = (): void => {
  console.log('[游戏规则] 跳过动画')
  
  // 停止打字
  if (typingTimer !== null) {
    clearTimeout(typingTimer)
    typingTimer = null
  }
  
  // 显示完整内容
  displayedTitle.value = fullTitle
  displayedSections.value = ruleSections.map(section => ({
    title: section.title,
    lines: [...section.lines]
  }))
  displayedPrompt.value = continuePrompt
  showContent.value = true
  isComplete.value = true
}

/**
 * 开始光标闪烁
 */
const startCursorBlink = (): void => {
  cursorTimer = window.setInterval(() => {
    showTitleCursor.value = !showTitleCursor.value
    showContentCursor.value = !showContentCursor.value
    showPromptCursor.value = !showPromptCursor.value
  }, 500)
}

/**
 * 处理键盘输入
 */
const handleKeyPress = (_event: KeyboardEvent): void => {
  if (!isVisible.value) return
  
  // 如果还在打字，跳过动画
  if (!isComplete.value) {
    skip()
    return
  }
  
  // 如果已完成，按任意键继续
  if (isComplete.value) {
    console.log('[游戏规则] 用户按键继续游戏')
    hide()
    easterEggStore.enterGame()
  }
}

/**
 * 清理定时器
 */
const cleanup = (): void => {
  if (typingTimer !== null) {
    clearTimeout(typingTimer)
    typingTimer = null
  }
  if (cursorTimer !== null) {
    clearInterval(cursorTimer)
    cursorTimer = null
  }
}

// 监听游戏阶段变化
import { watch } from 'vue'
watch(() => easterEggStore.phase, (newPhase) => {
  if (newPhase === 'rules') {
    show()
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeyPress)
  
  // 如果已经处于规则阶段，立即显示
  if (easterEggStore.phase === 'rules') {
    show()
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
  cleanup()
})

// 暴露方法供外部调用
defineExpose({
  show,
  hide,
  skip
})
</script>

<style scoped>
.rules-window {
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
  font-family: 'Courier New', 'Consolas', monospace;
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

.rules-content {
  max-width: 900px;
  max-height: 90vh;
  padding: 40px;
  overflow-y: auto;
}

/* 自定义滚动条 */
.rules-content::-webkit-scrollbar {
  width: 10px;
}

.rules-content::-webkit-scrollbar-track {
  background: #000;
  border: 1px solid #00ff00;
}

.rules-content::-webkit-scrollbar-thumb {
  background: #00ff00;
  border-radius: 5px;
}

.rules-content::-webkit-scrollbar-thumb:hover {
  background: #00cc00;
}

.rules-title {
  color: #ffff00;
  font-size: 20px;
  line-height: 1.8;
  margin-bottom: 30px;
  text-align: center;
  font-weight: bold;
}

.title-text {
  display: inline;
}

.rules-body {
  color: #00ff00;
  font-size: 14px;
  line-height: 1.8;
}

.rules-section {
  margin-bottom: 25px;
}

.section-title {
  color: #00ffff;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 10px;
}

.section-line {
  color: #00ff00;
  margin-left: 20px;
  margin-bottom: 5px;
}

.cmd-cursor {
  display: inline-block;
  color: #00ff00;
  animation: blink 1s infinite;
  margin-left: 2px;
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

.continue-prompt {
  color: #ffff00;
  font-size: 16px;
  line-height: 1.8;
  margin-top: 30px;
  text-align: center;
  font-weight: bold;
}

.prompt-text {
  display: inline;
}

.skip-hint {
  color: #888888;
  font-size: 12px;
  line-height: 1.8;
  margin-top: 20px;
  text-align: center;
  font-style: italic;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .rules-content {
    padding: 20px;
    max-width: 95%;
  }
  
  .rules-title {
    font-size: 16px;
  }
  
  .rules-body {
    font-size: 12px;
  }
  
  .section-title {
    font-size: 14px;
  }
  
  .continue-prompt {
    font-size: 14px;
  }
  
  .skip-hint {
    font-size: 10px;
  }
}

@media (max-width: 480px) {
  .rules-content {
    padding: 15px;
  }
  
  .rules-title {
    font-size: 14px;
  }
  
  .rules-body {
    font-size: 10px;
  }
  
  .section-title {
    font-size: 12px;
  }
  
  .section-line {
    margin-left: 10px;
  }
  
  .continue-prompt {
    font-size: 12px;
  }
  
  .skip-hint {
    font-size: 9px;
  }
}
</style>
