<template>
  <header class="system-hud" :class="{ 'system-hud--scrolled': isScrolled }" aria-label="系统状态栏">
    <RouterLink to="/" class="system-hud__brand" aria-label="返回首页">
      <span class="system-hud__brand-mark"></span>
      <span class="system-hud__brand-text">HYJ.ARCHIVE</span>
    </RouterLink>

    <button
      class="system-hud__toggle"
      type="button"
      :aria-expanded="menuOpen"
      aria-controls="system-hud-nav"
      @click="menuOpen = !menuOpen"
    >
      MENU
    </button>

    <nav id="system-hud-nav" class="system-hud__nav" :class="{ 'system-hud__nav--open': menuOpen }" aria-label="主导航">
      <RouterLink
        v-for="item in items"
        :key="item.path"
        :to="item.path"
        class="system-hud__link"
        :data-label="item.label"
        @click="menuOpen = false"
      >
        <span>{{ item.code }}</span>{{ item.label }}
      </RouterLink>
    </nav>

    <div class="system-hud__status" aria-label="站点状态">
      <span class="system-hud__pulse"></span>
      <span>{{ clock }}</span>
      <span>SIGNAL {{ signal }}%</span>
      <button class="system-hud__audio" type="button" :aria-pressed="audioArmed" @click="toggleAudio">
        {{ audioArmed ? 'AUDIO ON' : 'AUDIO OFF' }}
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { playAudioCue, setAudioFeedbackEnabled } from '@/audio/feedback'

const items = [
  { path: '/', label: 'SIGNAL', code: '00' },
  { path: '/about', label: 'IDENTITY', code: '01' },
  { path: '/skills', label: 'MATRIX', code: '02' },
  { path: '/projects', label: 'ARCHIVE', code: '03' },
  { path: '/gallery', label: 'GALLERY', code: '04' },
  { path: '/contact', label: 'CONTACT', code: '05' },
  { path: '/os', label: 'LEGACY OS', code: '99' },
]

const clock = ref('00:00:00')
const signal = ref(97)
const isScrolled = ref(false)
const menuOpen = ref(false)
const audioArmed = ref(false)
let timer = 0

const updateClock = () => {
  const now = new Date()
  clock.value = now.toLocaleTimeString('zh-CN', { hour12: false })
  signal.value = 92 + Math.floor(Math.random() * 8)
}

const updateScrollState = () => {
  isScrolled.value = window.scrollY > 24
}

const toggleAudio = () => {
  audioArmed.value = !audioArmed.value
  setAudioFeedbackEnabled(audioArmed.value)
  playAudioCue(audioArmed.value ? 'boot' : 'click')
}

onMounted(() => {
  updateClock()
  updateScrollState()
  timer = window.setInterval(updateClock, 1000)
  window.addEventListener('scroll', updateScrollState, { passive: true })
})

onUnmounted(() => {
  window.clearInterval(timer)
  window.removeEventListener('scroll', updateScrollState)
})
</script>
