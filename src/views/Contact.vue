<template>
  <section class="transmission-page sci-section" aria-labelledby="contact-title">
    <div class="sci-section-heading sci-section-heading--center">
      <p class="sci-eyebrow">TRANSMISSION CONSOLE</p>
      <h1 id="contact-title">建立通讯</h1>
      <p>发送邮件、拨打电话、复制微信或下载简历，所有通道均已开放。</p>
    </div>

    <div class="transmission-layout">
      <aside class="sci-panel transmission-status">
        <span class="transmission-status__light"></span>
        <h2>CHANNEL OPEN</h2>
        <p>ENCRYPTION: TLS READY</p>
        <p>SIGNAL: STABLE</p>
        <p>RESPONSE MODE: HUMAN</p>
      </aside>

      <div class="transmission-grid">
        <a :href="`mailto:${profile.email}`" class="sci-card transmission-card">
          <p class="sci-eyebrow">MAIL</p>
          <h2>{{ profile.email }}</h2>
          <span>SEND MESSAGE →</span>
        </a>
        <a :href="`tel:${profile.phone}`" class="sci-card transmission-card">
          <p class="sci-eyebrow">PHONE</p>
          <h2>{{ profile.phone }}</h2>
          <span>CALL CHANNEL →</span>
        </a>
        <button class="sci-card transmission-card" @click="copyWechat">
          <p class="sci-eyebrow">WECHAT</p>
          <h2>{{ wechatId }}</h2>
          <span>{{ showCopySuccess ? 'COPIED' : 'COPY ID →' }}</span>
        </button>
        <button
          class="sci-card transmission-card"
          :disabled="isDownloading"
          aria-label="下载简历 PDF"
          @click="downloadResume"
        >
          <p class="sci-eyebrow">RESUME</p>
          <h2>PDF DOSSIER</h2>
          <span>{{ isDownloading ? 'OPENING...' : 'DOWNLOAD →' }}</span>
          <span v-if="downloadSuccess" role="status">已发起 PDF 下载</span>
          <span v-if="downloadError" role="alert">{{ downloadError }}</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { profileData } from '@/data/profile'

const profile = profileData
const wechatId = 'hyj1243222867'
const showCopySuccess = ref(false)
const isDownloading = ref(false)
const downloadSuccess = ref(false)
const downloadError = ref('')
let downloadFeedbackTimer: number | undefined
let downloadController: AbortController | undefined
let downloadTimeout: number | undefined
let isUnmounted = false
onUnmounted(() => {
  isUnmounted = true
  downloadController?.abort()
  window.clearTimeout(downloadTimeout)
  window.clearTimeout(downloadFeedbackTimer)
})

const copyWechat = async () => {
  await navigator.clipboard?.writeText(wechatId)
  showCopySuccess.value = true
  window.setTimeout(() => (showCopySuccess.value = false), 1800)
}

const downloadResume = async () => {
  if (isDownloading.value || isUnmounted) return
  isDownloading.value = true
  downloadSuccess.value = false
  downloadError.value = ''
  window.clearTimeout(downloadFeedbackTimer)
  downloadController = new AbortController()
  // 预检查最多等待十秒，网络悬挂也必须恢复可重试状态。
  downloadTimeout = window.setTimeout(() => downloadController?.abort(), 10000)

  try {
    // 使用同一无缓存地址检查并下载当前公共简历。
    const resumeUrl = `/resume.pdf?t=${Date.now()}`
    const response = await fetch(resumeUrl, {
      method: 'HEAD',
      cache: 'no-store',
      signal: downloadController.signal,
    })
    if (isUnmounted) return
    if (!response.ok) throw new Error('简历文件不可用')

    const link = document.createElement('a')
    link.href = resumeUrl
    link.download = `${profile.name}-个人简历.pdf`
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
    }
    document.body.appendChild(link)
    try {
      link.click()
    } finally {
      link.remove()
    }
    downloadSuccess.value = true
  } catch {
    if (!isUnmounted) downloadError.value = '下载失败，请稍后重试'
  } finally {
    window.clearTimeout(downloadTimeout)
    downloadTimeout = undefined
    downloadController = undefined
    isDownloading.value = false
    if (!isUnmounted) {
      downloadFeedbackTimer = window.setTimeout(() => {
        downloadSuccess.value = false
        downloadError.value = ''
      }, 3000)
    }
  }
}
</script>
