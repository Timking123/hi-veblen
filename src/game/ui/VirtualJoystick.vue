<template>
  <div
    v-if="visible"
    ref="joystickContainer"
    class="virtual-joystick"
    :style="containerStyle"
    @touchstart.prevent="handleTouchStart"
    @touchmove.prevent="handleTouchMove"
    @touchend.prevent="handleTouchEnd"
    @touchcancel.prevent="handleTouchEnd"
  >
    <!-- 摇杆底座 -->
    <div class="joystick-base" :style="baseStyle">
      <!-- 摇杆手柄 -->
      <div class="joystick-stick" :style="stickStyle"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

/**
 * 虚拟摇杆组件
 * 用于移动端触摸控制玩家飞机移动
 * 
 * 验证需求: 6.1, 6.2, 6.11
 */

interface Props {
  x?: number          // 摇杆中心 X 坐标（像素）
  y?: number          // 摇杆中心 Y 坐标（像素）
  radius?: number     // 摇杆半径（像素）
  visible?: boolean   // 是否可见
  deadZone?: number   // 死区半径（0-1）
}

interface Emits {
  (e: 'move', direction: { x: number; y: number; angle: number; distance: number }): void
  (e: 'release'): void
}

const props = withDefaults(defineProps<Props>(), {
  x: 100,
  y: 500,
  radius: 60,
  visible: true,
  deadZone: 0.1
})

const emit = defineEmits<Emits>()

// 响应式状态
const joystickContainer = ref<HTMLElement | null>(null)
const isActive = ref(false)
const stickX = ref(0) // 相对于中心的偏移量（-1 到 1）
const stickY = ref(0)
const touchId = ref<number | null>(null)

// 计算样式
const containerStyle = computed(() => ({
  position: 'fixed' as const,
  left: `${props.x - props.radius}px`,
  bottom: `${props.y - props.radius}px`,
  width: `${props.radius * 2}px`,
  height: `${props.radius * 2}px`,
  zIndex: 1000,
  pointerEvents: 'auto' as const
}))

const baseStyle = computed(() => ({
  width: '100%',
  height: '100%',
  borderRadius: '50%',
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  border: '2px solid rgba(255, 255, 255, 0.4)',
  position: 'relative' as const,
  transition: isActive.value ? 'none' : 'opacity 0.2s',
  opacity: isActive.value ? 1 : 0.6
}))

const stickStyle = computed(() => {
  const stickRadius = props.radius * 0.4
  const maxOffset = props.radius - stickRadius
  
  // 计算手柄位置（像素）
  const offsetX = stickX.value * maxOffset
  const offsetY = stickY.value * maxOffset
  
  // 手柄中心位置
  const centerX = props.radius - stickRadius + offsetX
  const centerY = props.radius - stickRadius + offsetY
  
  return {
    position: 'absolute' as const,
    width: `${stickRadius * 2}px`,
    height: `${stickRadius * 2}px`,
    borderRadius: '50%',
    backgroundColor: isActive.value ? 'rgba(0, 217, 255, 0.8)' : 'rgba(0, 217, 255, 0.6)',
    border: '2px solid rgba(0, 217, 255, 1)',
    left: `${centerX}px`,
    top: `${centerY}px`,
    transition: isActive.value ? 'none' : 'all 0.2s',
    boxShadow: isActive.value ? '0 0 10px rgba(0, 217, 255, 0.6)' : 'none'
  }
})

/**
 * 处理触摸开始事件
 */
function handleTouchStart(event: TouchEvent): void {
  if (!joystickContainer.value || touchId.value !== null) return
  
  const touch = event.touches[0]
  touchId.value = touch.identifier
  isActive.value = true
  
  updateStickPosition(touch.clientX, touch.clientY)
}

/**
 * 处理触摸移动事件
 */
function handleTouchMove(event: TouchEvent): void {
  if (touchId.value === null) return
  
  // 找到对应的触摸点
  const touch = Array.from(event.touches).find(t => t.identifier === touchId.value)
  if (!touch) return
  
  updateStickPosition(touch.clientX, touch.clientY)
}

/**
 * 处理触摸结束事件
 */
function handleTouchEnd(event: TouchEvent): void {
  if (touchId.value === null) return
  
  // 检查是否是当前跟踪的触摸点结束
  const touch = Array.from(event.changedTouches).find(t => t.identifier === touchId.value)
  if (!touch) return
  
  // 重置摇杆
  touchId.value = null
  isActive.value = false
  stickX.value = 0
  stickY.value = 0
  
  emit('release')
}

/**
 * 更新摇杆手柄位置
 */
function updateStickPosition(touchX: number, touchY: number): void {
  if (!joystickContainer.value) return
  
  const rect = joystickContainer.value.getBoundingClientRect()
  const centerX = rect.left + props.radius
  const centerY = rect.top + props.radius
  
  // 计算触摸点相对于摇杆中心的偏移量
  const deltaX = touchX - centerX
  const deltaY = touchY - centerY
  
  // 计算距离和角度
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  const angle = Math.atan2(deltaY, deltaX)
  
  // 限制在摇杆半径内
  const maxDistance = props.radius * 0.6 // 手柄最大移动距离
  const clampedDistance = Math.min(distance, maxDistance)
  
  // 归一化距离（0-1）
  const normalizedDistance = clampedDistance / maxDistance
  
  // 应用死区
  let effectiveDistance = normalizedDistance
  if (normalizedDistance < props.deadZone) {
    effectiveDistance = 0
  } else {
    // 重新映射死区外的距离到 0-1
    effectiveDistance = (normalizedDistance - props.deadZone) / (1 - props.deadZone)
  }
  
  // 计算归一化的 x, y（-1 到 1）
  if (effectiveDistance === 0) {
    stickX.value = 0
    stickY.value = 0
  } else {
    stickX.value = Math.cos(angle) * normalizedDistance
    stickY.value = Math.sin(angle) * normalizedDistance
  }
  
  // 发射移动事件
  emit('move', {
    x: Math.cos(angle) * effectiveDistance,
    y: Math.sin(angle) * effectiveDistance,
    angle,
    distance: effectiveDistance
  })
}

/**
 * 阻止上下文菜单
 */
function preventContextMenu(event: Event): void {
  event.preventDefault()
}

onMounted(() => {
  if (joystickContainer.value) {
    joystickContainer.value.addEventListener('contextmenu', preventContextMenu)
  }
})

onUnmounted(() => {
  if (joystickContainer.value) {
    joystickContainer.value.removeEventListener('contextmenu', preventContextMenu)
  }
})
</script>

<style scoped>
.virtual-joystick {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  touch-action: none;
}

.joystick-base {
  display: flex;
  align-items: center;
  justify-content: center;
}

.joystick-stick {
  transform: translate(-50%, -50%);
}
</style>
