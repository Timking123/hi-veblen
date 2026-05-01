<template>
  <Transition name="boot-fade">
    <section v-if="visible" class="boot-sequence" aria-live="polite" aria-label="系统初始化">
      <div class="boot-sequence__core">
        <p class="boot-sequence__eyebrow">INITIALIZATION PROTOCOL</p>
        <h1 class="boot-sequence__title">{{ decodedTitle }}</h1>
        <div class="boot-sequence__terminal" role="status">
          <p v-for="line in visibleLines" :key="line" class="boot-sequence__line">
            <span class="boot-sequence__prompt">SYS</span>{{ line }}
          </p>
        </div>
        <div class="boot-sequence__progress" aria-hidden="true">
          <span :style="{ width: `${progress}%` }"></span>
        </div>
        <p class="boot-sequence__progress-text">{{ progress }}% / SIGNAL LOCKED</p>
      </div>
    </section>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const emit = defineEmits<{ finished: [] }>()

const visible = ref(true)
const progress = ref(0)
const lineCount = ref(0)
const decodedTitle = ref('██████ ███████')
const bootLines = [
  'checking visual engine ... ready',
  'mounting archive memory ... ready',
  'calibrating cinematic transition layer ... ready',
  'opening terminal interface ... ready',
  'legacy desktop signal detected ... standby',
]

const visibleLines = computed(() => bootLines.slice(0, lineCount.value))

const randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+-/>'
const finalTitle = 'HUANG YANJIE / DIGITAL ARCHIVE'

const decodeTitle = () => {
  let frame = 0
  const timer = window.setInterval(() => {
    decodedTitle.value = finalTitle
      .split('')
      .map((char, index) => {
        if (char === ' ') return ' '
        return index < frame ? char : randomChars[Math.floor(Math.random() * randomChars.length)]
      })
      .join('')
    frame += 1
    if (frame > finalTitle.length) window.clearInterval(timer)
  }, 34)
}

onMounted(() => {
  decodeTitle()
  const progressTimer = window.setInterval(() => {
    progress.value = Math.min(100, progress.value + Math.ceil(Math.random() * 9))
    lineCount.value = Math.min(bootLines.length, Math.floor(progress.value / 20) + 1)
    if (progress.value >= 100) {
      window.clearInterval(progressTimer)
      window.setTimeout(() => {
        visible.value = false
        emit('finished')
      }, 540)
    }
  }, 110)
})
</script>
