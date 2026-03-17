<template>
  <div
    v-if="visible"
    ref="buttonContainer"
    class="touch-button"
    :style="containerStyle"
    @touchstart.prevent="handleTouchStart"
    @touchend.prevent="handleTouchEnd"
    @touchcancel.prevent="handleTouchEnd"
  >
    <!-- 按钮主体 -->
    <div class="button-body" :style="buttonStyle">
      <!-- 按钮标签 -->
      <span class="button-label" :style="labelStyle">{{ label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

/**
 * 触摸按钮组件
 * 用于移动端触摸控制游戏操作（开火、导弹、核弹等）
 * 
 * 验证需求: 6.3, 6.4, 6.5, 6.6, 6.7, 8.3
 */

interface Props {
  x?: number          // 按钮中心 X 坐标（像素）
  y?: number          // 按钮中心 Y 坐标（像素）
  size?: number       // 按钮尺寸（像素）
  label?: string      // 按钮标签
  color?: string      // 按钮颜色
  visible?: boolean   // 是否可见
}

interface Emits {
  (e: 'press'): void
  (e: 'release'): void
}

const props = withDefaults(defineProps<Props>(), {
  x: 100,
  y: 100,
  size: 60,
  label: '',
  color: '#00D9FF',
  visible: true
})

const emit = defineEmits<Emits>()

// 响应式状态
const buttonContainer = ref<HTMLElement | null>(null)
const isPressed = ref(false)
const touchId = ref<number | null>(null)

// 计算样式
const containerStyle = computed(() => ({
  position: 'fixed' as const,
  right: `${props.x}px`,
  bottom: `${props.y}px`,
  width: `${props.size}px`,
  height: `${props.size}px`,
  zIndex: 1000,
  pointerEvents: 'auto' as const
}))

const buttonStyle = computed(() => ({
  width: '100%',
  height: '100%',
  borderRadius: '50%',
  backgroundColor: isPressed.value 
    ? `${props.color}CC` // 按下时更不透明 (80%)
    : `${props.color}66`, // 正常时半透明 (40%)
  border: `2px solid ${props.color}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: isPressed.value ? 'none' : 'all 0.15s ease',
  transform: isPressed.value ? 'scale(0.9)' : 'scale(1)',
  boxShadow: isPressed.value 
    ? `0 0 15px ${props.color}AA, inset 0 0 10px ${props.color}66`
    : `0 0 8px ${props.color}66`,
  cursor: 'pointer'
}))

const labelStyle = computed(() => ({
  color: '#FFFFFF',
  fontSize: `${props.size * 0.4}px`,
  fontWeight: 'bold' as const,
  textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
  userSelect: 'none' as const,
  pointerEvents: 'none' as const
}))

/**
 * 处理触摸开始事件
 */
function handleTouchStart(event: TouchEvent): void {
  if (!buttonContainer.value || touchId.value !== null) return
  
  const touch = event.touches[0]
  touchId.value = touch.identifier
  isPressed.value = true
  
  // 触发触觉反馈（振动）
  triggerHapticFeedback()
  
  emit('press')
}

/**
 * 处理触摸结束事件
 */
function handleTouchEnd(event: TouchEvent): void {
  if (touchId.value === null) return
  
  // 检查是否是当前跟踪的触摸点结束
  const touch = Array.from(event.changedTouches).find(t => t.identifier === touchId.value)
  if (!touch) return
  
  // 重置按钮状态
  touchId.value = null
  isPressed.value = false
  
  emit('release')
}

/**
 * 触发触觉反馈（振动）
 */
function triggerHapticFeedback(): void {
  // 检查设备是否支持振动 API
  if ('vibrate' in navigator) {
    try {
      // 短促振动 50ms
      navigator.vibrate(50)
    } catch (error) {
      // 静默失败，不影响功能
      console.debug('[TouchButton] 振动 API 调用失败:', error)
    }
  }
}

/**
 * 阻止上下文菜单
 */
function preventContextMenu(event: Event): void {
  event.preventDefault()
}

onMounted(() => {
  if (buttonContainer.value) {
    buttonContainer.value.addEventListener('contextmenu', preventContextMenu)
  }
})

onUnmounted(() => {
  if (buttonContainer.value) {
    buttonContainer.value.removeEventListener('contextmenu', preventContextMenu)
  }
})
</script>

<style scoped>
.touch-button {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  touch-action: none;
}

.button-body {
  position: relative;
  overflow: hidden;
}

.button-label {
  display: block;
  line-height: 1;
}
</style>
