<template>
  <aside class="experience-settings" :class="{ 'experience-settings--open': open }" aria-label="体验设置">
    <button class="experience-settings__toggle" type="button" :aria-expanded="open" @click="open = !open">
      SETTINGS
    </button>
    <div class="experience-settings__panel">
      <h2>EXPERIENCE CONTROL</h2>
      <label>
        <span>视觉等级</span>
        <select v-model="quality" @change="applySettings">
          <option value="ultra">Ultra</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="static">Static</option>
        </select>
      </label>
      <label>
        <span>展厅主题</span>
        <select v-model="themeMode" @change="applySettings">
          <option value="museum">Museum</option>
          <option value="terminal">Terminal</option>
          <option value="legacy">Legacy</option>
          <option value="minimal">Minimal</option>
        </select>
      </label>
      <label class="experience-settings__check">
        <input v-model="reducedMotion" type="checkbox" @change="applySettings" />
        <span>降低动态效果</span>
      </label>
      <label class="experience-settings__check">
        <input v-model="disableScanlines" type="checkbox" @change="applySettings" />
        <span>关闭扫描线</span>
      </label>
      <button type="button" @click="reboot">重新启动系统动画</button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { playAudioCue } from '@/audio/feedback'

const open = ref(false)
const quality = ref('high')
const themeMode = ref('museum')
const reducedMotion = ref(false)
const disableScanlines = ref(false)

const applySettings = () => {
  playAudioCue('click')
  document.documentElement.dataset.quality = quality.value
  document.documentElement.dataset.themeMode = themeMode.value
  document.documentElement.classList.toggle('is-reduced-motion', reducedMotion.value)
  document.documentElement.classList.toggle('is-scanlines-disabled', disableScanlines.value)
  localStorage.setItem('hyj-experience-settings', JSON.stringify({
    quality: quality.value,
    themeMode: themeMode.value,
    reducedMotion: reducedMotion.value,
    disableScanlines: disableScanlines.value,
  }))
}

const reboot = () => {
  playAudioCue('boot')
  sessionStorage.removeItem('hyj-boot-complete')
  window.location.reload()
}

onMounted(() => {
  const raw = localStorage.getItem('hyj-experience-settings')
  if (raw) {
    const saved = JSON.parse(raw) as { quality?: string; themeMode?: string; reducedMotion?: boolean; disableScanlines?: boolean }
    quality.value = saved.quality || 'high'
    themeMode.value = saved.themeMode || 'museum'
    reducedMotion.value = Boolean(saved.reducedMotion)
    disableScanlines.value = Boolean(saved.disableScanlines)
  }
  applySettings()
})
</script>
