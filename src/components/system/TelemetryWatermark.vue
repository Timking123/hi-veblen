<template>
  <aside class="telemetry-watermark" aria-hidden="true">
    <span>ROOM {{ roomName }}</span>
    <span>X {{ x.toFixed(3) }} / Y {{ y.toFixed(3) }}</span>
    <span>{{ timestamp }}</span>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const x = ref(0)
const y = ref(0)
const timestamp = ref('00:00:00')
let timer = 0

const roomName = computed(() => String(route.name || 'UNKNOWN').toUpperCase())

const handlePointer = (event: PointerEvent) => {
  x.value = event.clientX / window.innerWidth
  y.value = event.clientY / window.innerHeight
}

const updateTime = () => {
  timestamp.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
}

onMounted(() => {
  updateTime()
  timer = window.setInterval(updateTime, 1000)
  window.addEventListener('pointermove', handlePointer, { passive: true })
})

onUnmounted(() => {
  window.clearInterval(timer)
  window.removeEventListener('pointermove', handlePointer)
})
</script>
