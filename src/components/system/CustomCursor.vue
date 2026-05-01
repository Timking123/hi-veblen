<template>
  <div v-if="enabled" class="custom-cursor" :class="cursorClass" aria-hidden="true">
    <span class="custom-cursor__label" :style="labelStyle">{{ label }}</span>
    <span class="custom-cursor__dot" :style="dotStyle"></span>
    <span class="custom-cursor__ring" :style="ringStyle"></span>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const enabled = ref(false)
const x = ref(0)
const y = ref(0)
const ringX = ref(0)
const ringY = ref(0)
const hoveringInteractive = ref(false)
const dragging = ref(false)
const label = ref('')
let animationId = 0

const dotStyle = computed(() => ({ transform: `translate3d(${x.value}px, ${y.value}px, 0)` }))
const ringStyle = computed(() => ({ transform: `translate3d(${ringX.value}px, ${ringY.value}px, 0)` }))
const labelStyle = computed(() => ({ transform: `translate3d(${x.value + 18}px, ${y.value + 18}px, 0)` }))
const cursorClass = computed(() => ({
  'custom-cursor--interactive': hoveringInteractive.value,
  'custom-cursor--dragging': dragging.value,
}))

const animate = () => {
  ringX.value += (x.value - ringX.value) * 0.16
  ringY.value += (y.value - ringY.value) * 0.16
  animationId = requestAnimationFrame(animate)
}

const updateTargetState = (target: EventTarget | null) => {
  const element = target instanceof Element ? target : null
  const interactive = Boolean(element?.closest('a, button, input, textarea, select, [role="button"], .retro-window__titlebar'))
  hoveringInteractive.value = interactive
  label.value = element?.closest('.retro-window__titlebar') ? 'DRAG' : interactive ? 'OPEN' : ''
}

const handleMove = (event: PointerEvent) => {
  x.value = event.clientX
  y.value = event.clientY
  updateTargetState(event.target)
}

const handleDown = () => {
  dragging.value = true
}

const handleUp = () => {
  dragging.value = false
}

onMounted(() => {
  enabled.value = window.matchMedia('(pointer: fine)').matches
  if (!enabled.value) return
  window.addEventListener('pointermove', handleMove)
  window.addEventListener('pointerdown', handleDown)
  window.addEventListener('pointerup', handleUp)
  animate()
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('pointermove', handleMove)
  window.removeEventListener('pointerdown', handleDown)
  window.removeEventListener('pointerup', handleUp)
})
</script>
