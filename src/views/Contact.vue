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
        <button class="sci-card transmission-card" @click="downloadResume">
          <p class="sci-eyebrow">RESUME</p>
          <h2>PDF DOSSIER</h2>
          <span>{{ isDownloading ? 'OPENING...' : 'DOWNLOAD →' }}</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { profileData } from '@/data/profile'

const profile = profileData
const wechatId = 'hyj1243222867'
const showCopySuccess = ref(false)
const isDownloading = ref(false)

const copyWechat = async () => {
  await navigator.clipboard?.writeText(wechatId)
  showCopySuccess.value = true
  window.setTimeout(() => (showCopySuccess.value = false), 1800)
}

const downloadResume = () => {
  isDownloading.value = true
  const link = document.createElement('a')
  link.href = '/resume.pdf'
  link.download = '黄彦杰-个人简历.pdf'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => (isDownloading.value = false), 600)
}
</script>
