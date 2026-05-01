<template>
  <canvas ref="canvasRef" class="route-distortion-canvas" data-testid="route-distortion-canvas" aria-hidden="true"></canvas>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId = 0
let activeUntil = 0
let previousPath = route.fullPath

const resize = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.floor(window.innerWidth * ratio)
  canvas.height = Math.floor(window.innerHeight * ratio)
  canvas.style.width = `${window.innerWidth}px`
  canvas.style.height = `${window.innerHeight}px`
}

const draw = (time: number) => {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (time < activeUntil) {
    const progress = 1 - (activeUntil - time) / 720
    const bands = 18
    for (let i = 0; i < bands; i += 1) {
      const y = (canvas.height / bands) * i
      const height = canvas.height / bands * 0.55
      const offset = Math.sin(i * 2.4 + progress * 10) * 60 * (1 - progress)
      ctx.fillStyle = i % 2 === 0 ? 'rgba(0, 229, 255, 0.16)' : 'rgba(255, 61, 242, 0.12)'
      ctx.fillRect(offset, y, canvas.width, height)
    }
    ctx.fillStyle = `rgba(2, 3, 10, ${0.36 * (1 - progress)})`
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  animationId = requestAnimationFrame(draw)
}

watch(
  () => route.fullPath,
  (path) => {
    if (path !== previousPath) {
      previousPath = path
      activeUntil = performance.now() + 720
    }
  },
)

onMounted(() => {
  resize()
  animationId = requestAnimationFrame(draw)
  window.addEventListener('resize', resize)
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', resize)
})
</script>
