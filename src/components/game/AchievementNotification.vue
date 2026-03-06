<template>
  <Teleport to="body">
    <Transition name="notification">
      <div 
        v-if="visible && currentAchievement" 
        class="achievement-notification"
        @click="handleClick"
      >
        <!-- 背景光效 -->
        <div class="notification-glow"></div>
        
        <!-- 内容区域 -->
        <div class="notification-content">
          <!-- 图标 -->
          <div class="notification-icon">
            <span class="icon-emoji">{{ currentAchievement.icon }}</span>
            <div class="icon-ring"></div>
          </div>

          <!-- 文字信息 -->
          <div class="notification-info">
            <span class="notification-label">🎉 成就解锁</span>
            <h3 class="notification-title">{{ currentAchievement.name }}</h3>
            <p class="notification-description">{{ currentAchievement.description }}</p>
          </div>
        </div>

        <!-- 进度条（自动消失倒计时） -->
        <div class="notification-progress">
          <div 
            class="progress-bar" 
            :style="{ animationDuration: `${duration}ms` }"
          ></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 成就解锁通知组件
 * 
 * 功能：
 * - 显示新解锁的成就
 * - 带有动画效果
 * - 自动消失（3-5 秒后）
 * - 支持队列显示多个成就
 * 
 * 需求: 7.5
 * - 7.5: 当玩家满足成就条件时显示成就解锁通知
 */
import { ref, watch, onUnmounted } from 'vue'
import type { Achievement } from '@/game/AchievementSystem'

// Props 定义
interface Props {
  /** 显示持续时间（毫秒） */
  duration?: number
  /** 是否点击后关闭 */
  closeOnClick?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  duration: 4000,
  closeOnClick: true
})

// Emits 定义
const emit = defineEmits<{
  /** 通知关闭事件 */
  (e: 'close', achievement: Achievement): void
  /** 通知点击事件 */
  (e: 'click', achievement: Achievement): void
}>()

// 是否显示通知
const visible = ref(false)

// 当前显示的成就
const currentAchievement = ref<Achievement | null>(null)

// 成就队列
const achievementQueue = ref<Achievement[]>([])

// 自动关闭定时器
let autoCloseTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 显示成就通知
 * @param achievement 要显示的成就
 */
const show = (achievement: Achievement): void => {
  // 如果当前有通知在显示，加入队列
  if (visible.value) {
    achievementQueue.value.push(achievement)
    return
  }

  currentAchievement.value = achievement
  visible.value = true
  startAutoClose()
}

/**
 * 显示多个成就通知
 * @param achievements 成就数组
 */
const showMultiple = (achievements: Achievement[]): void => {
  if (achievements.length === 0) return

  // 第一个立即显示，其余加入队列
  const [first, ...rest] = achievements
  show(first)
  achievementQueue.value.push(...rest)
}

/**
 * 关闭当前通知
 */
const close = (): void => {
  if (!visible.value || !currentAchievement.value) return

  const closedAchievement = currentAchievement.value
  visible.value = false
  clearAutoCloseTimer()

  emit('close', closedAchievement)

  // 延迟后显示队列中的下一个
  setTimeout(() => {
    currentAchievement.value = null
    showNextInQueue()
  }, 300) // 等待退出动画完成
}

/**
 * 显示队列中的下一个成就
 */
const showNextInQueue = (): void => {
  if (achievementQueue.value.length > 0) {
    const next = achievementQueue.value.shift()!
    show(next)
  }
}

/**
 * 开始自动关闭定时器
 */
const startAutoClose = (): void => {
  clearAutoCloseTimer()
  autoCloseTimer = setTimeout(() => {
    close()
  }, props.duration)
}

/**
 * 清除自动关闭定时器
 */
const clearAutoCloseTimer = (): void => {
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer)
    autoCloseTimer = null
  }
}

/**
 * 处理点击事件
 */
const handleClick = (): void => {
  if (currentAchievement.value) {
    emit('click', currentAchievement.value)
  }
  
  if (props.closeOnClick) {
    close()
  }
}

/**
 * 清空队列
 */
const clearQueue = (): void => {
  achievementQueue.value = []
}

// 监听 duration 变化，重置定时器
watch(() => props.duration, () => {
  if (visible.value) {
    startAutoClose()
  }
})

// 组件卸载时清理
onUnmounted(() => {
  clearAutoCloseTimer()
})

// 暴露方法供外部调用
defineExpose({
  show,
  showMultiple,
  close,
  clearQueue,
  visible,
  currentAchievement,
  queueLength: () => achievementQueue.value.length
})
</script>

<style scoped>
.achievement-notification {
  position: fixed;
  top: var(--spacing-lg, 24px);
  right: var(--spacing-lg, 24px);
  z-index: var(--z-tooltip, 70);
  
  min-width: 300px;
  max-width: 400px;
  
  background: linear-gradient(
    135deg,
    rgba(21, 25, 50, 0.95) 0%,
    rgba(123, 97, 255, 0.2) 100%
  );
  border: 2px solid var(--secondary, #7b61ff);
  border-radius: var(--radius-lg, 16px);
  
  box-shadow: 
    var(--shadow-glow-secondary, 0 0 20px rgba(123, 97, 255, 0.3)),
    var(--shadow-lg, 0 8px 32px rgba(0, 0, 0, 0.3));
  
  cursor: pointer;
  overflow: hidden;
  
  font-family: 'Press Start 2P', 'Courier New', monospace;
}

/* 背景光效 */
.notification-glow {
  position: absolute;
  inset: -50%;
  background: radial-gradient(
    circle at center,
    rgba(123, 97, 255, 0.3) 0%,
    transparent 70%
  );
  animation: glowPulse 2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes glowPulse {
  0%, 100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

/* 内容区域 */
.notification-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-md, 16px);
  padding: var(--spacing-md, 16px);
}

/* 图标 */
.notification-icon {
  position: relative;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--bg-tertiary, #1a1f3a);
  border-radius: var(--radius-md, 8px);
  border: 2px solid var(--secondary, #7b61ff);
  box-shadow: 0 0 15px rgba(123, 97, 255, 0.5);
}

.icon-emoji {
  font-size: 28px;
  line-height: 1;
  animation: iconBounce 0.6s ease-out;
}

@keyframes iconBounce {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

.icon-ring {
  position: absolute;
  inset: -4px;
  border: 2px solid var(--secondary-light, #9580ff);
  border-radius: var(--radius-lg, 16px);
  animation: ringExpand 1s ease-out forwards;
  opacity: 0;
}

@keyframes ringExpand {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(1.3);
    opacity: 0;
  }
}

/* 文字信息 */
.notification-info {
  flex: 1;
  min-width: 0;
}

.notification-label {
  display: block;
  font-size: 10px;
  color: var(--secondary-light, #9580ff);
  margin-bottom: var(--spacing-xs, 4px);
  text-transform: uppercase;
  letter-spacing: 1px;
  animation: labelSlide 0.4s ease-out;
}

@keyframes labelSlide {
  0% {
    transform: translateX(-10px);
    opacity: 0;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

.notification-title {
  font-size: var(--text-sm, 0.875rem);
  color: var(--text-primary, #ffffff);
  margin: 0 0 var(--spacing-xs, 4px) 0;
  line-height: var(--leading-tight, 1.25);
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
  animation: titleSlide 0.5s ease-out;
}

@keyframes titleSlide {
  0% {
    transform: translateX(-10px);
    opacity: 0;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

.notification-description {
  font-size: var(--text-xs, 0.75rem);
  color: var(--text-muted, #718096);
  margin: 0;
  line-height: var(--leading-normal, 1.5);
  animation: descSlide 0.6s ease-out;
}

@keyframes descSlide {
  0% {
    transform: translateX(-10px);
    opacity: 0;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 进度条 */
.notification-progress {
  height: 3px;
  background: var(--bg-secondary, #151932);
}

.progress-bar {
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--secondary, #7b61ff),
    var(--secondary-light, #9580ff)
  );
  animation: progressShrink linear forwards;
  transform-origin: left;
}

@keyframes progressShrink {
  0% {
    transform: scaleX(1);
  }
  100% {
    transform: scaleX(0);
  }
}

/* 入场/退场动画 */
.notification-enter-active {
  animation: notificationEnter 0.4s ease-out;
}

.notification-leave-active {
  animation: notificationLeave 0.3s ease-in;
}

@keyframes notificationEnter {
  0% {
    transform: translateX(100%) scale(0.8);
    opacity: 0;
  }
  100% {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
}

@keyframes notificationLeave {
  0% {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateX(100%) scale(0.8);
    opacity: 0;
  }
}

/* 悬停效果 */
.achievement-notification:hover {
  transform: scale(1.02);
  box-shadow: 
    0 0 30px rgba(123, 97, 255, 0.5),
    var(--shadow-xl, 0 12px 48px rgba(0, 0, 0, 0.4));
}

.achievement-notification:hover .notification-glow {
  animation-play-state: paused;
  opacity: 1;
}

/* 响应式适配 */
@media (max-width: 480px) {
  .achievement-notification {
    top: var(--spacing-md, 16px);
    right: var(--spacing-md, 16px);
    left: var(--spacing-md, 16px);
    min-width: auto;
    max-width: none;
  }

  .notification-content {
    padding: var(--spacing-sm, 8px);
    gap: var(--spacing-sm, 8px);
  }

  .notification-icon {
    width: 48px;
    height: 48px;
  }

  .icon-emoji {
    font-size: 24px;
  }

  .notification-title {
    font-size: var(--text-xs, 0.75rem);
  }

  .notification-description {
    font-size: 10px;
  }
}

/* 安全区域适配 */
@supports (padding-top: env(safe-area-inset-top)) {
  .achievement-notification {
    top: calc(var(--spacing-lg, 24px) + env(safe-area-inset-top));
    right: calc(var(--spacing-lg, 24px) + env(safe-area-inset-right));
  }

  @media (max-width: 480px) {
    .achievement-notification {
      top: calc(var(--spacing-md, 16px) + env(safe-area-inset-top));
      right: calc(var(--spacing-md, 16px) + env(safe-area-inset-right));
      left: calc(var(--spacing-md, 16px) + env(safe-area-inset-left));
    }
  }
}
</style>
