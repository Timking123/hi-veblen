<template>
  <div class="contact">
    <!-- Header Section -->
    <section class="contact-header">
      <h1 class="page-title" :class="{ 'animate-fadeInUp': isVisible }">联系我</h1>
      <p class="page-subtitle" :class="{ 'animate-fadeInUp': isVisible }" style="animation-delay: 0.1s">
        期待与您的交流，让我们一起创造价值
      </p>
    </section>

    <!-- Contact Info Section -->
    <section class="contact-info" :class="{ 'animate-fadeInUp': isVisible }" style="animation-delay: 0.2s" aria-label="联系方式">
      <div class="info-grid">
        <!-- Email Card -->
        <a 
          :href="`mailto:${profile.email}`" 
          class="info-card" 
          data-testid="email-link"
          aria-label="发送邮件至黄彦杰"
        >
          <div class="icon-wrapper" aria-hidden="true">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div class="info-content">
            <h3 class="info-label">邮箱</h3>
            <p class="info-value">{{ profile.email }}</p>
          </div>
        </a>

        <!-- Phone Card -->
        <a 
          :href="`tel:${profile.phone}`" 
          class="info-card" 
          data-testid="phone-link"
          aria-label="拨打电话给黄彦杰"
        >
          <div class="icon-wrapper" aria-hidden="true">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </div>
          <div class="info-content">
            <h3 class="info-label">电话</h3>
            <p class="info-value">{{ profile.phone }}</p>
          </div>
        </a>

        <!-- WeChat Card -->
        <div 
          class="info-card wechat-card" 
          data-testid="wechat-card"
          role="button"
          tabindex="0"
          aria-label="点击复制微信号"
          @click="copyWechat"
          @keydown.enter="copyWechat"
          @keydown.space.prevent="copyWechat"
        >
          <div class="icon-wrapper wechat-icon" aria-hidden="true">
            <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.032zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
            </svg>
          </div>
          <div class="info-content">
            <h3 class="info-label">微信</h3>
            <p class="info-value">{{ wechatId }}</p>
          </div>
          <div class="copy-hint" aria-hidden="true">
            <svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>点击复制</span>
          </div>
        </div>

        <!-- Copy Success Toast -->
        <Transition name="toast">
          <div 
            v-if="showCopySuccess" 
            class="copy-toast" 
            role="alert" 
            aria-live="polite"
            data-testid="copy-success-toast"
          >
            <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>微信号已复制到剪贴板</span>
          </div>
        </Transition>
      </div>
    </section>

    <!-- Resume Download Section - 紧跟联系信息区域 -->
    <section class="resume-section" :class="{ 'animate-fadeInUp': isVisible }" style="animation-delay: 0.3s" aria-labelledby="resume-title">
      <div class="resume-card">
        <div class="resume-content">
          <h2 id="resume-title" class="resume-title">下载简历</h2>
          <p class="resume-description">获取完整的 PDF 格式简历，了解更多详细信息</p>
        </div>
        <div class="download-wrapper">
          <button 
            class="btn-download" 
            @click="downloadResume" 
            :disabled="isDownloading"
            :aria-label="isDownloading ? '正在下载简历' : '下载简历 PDF'"
            :aria-busy="isDownloading"
            data-testid="download-button"
          >
            <svg 
              v-if="!isDownloading && !downloadSuccess" 
              class="download-icon" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <svg 
              v-if="isDownloading" 
              class="download-icon spinner" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" stroke-width="2" stroke-dasharray="60" stroke-dashoffset="15" />
            </svg>
            <svg 
              v-if="downloadSuccess" 
              class="download-icon" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span v-if="!isDownloading && !downloadSuccess">下载简历 PDF</span>
            <span v-if="isDownloading">下载中...</span>
            <span v-if="downloadSuccess">下载成功！</span>
          </button>
          <p 
            v-if="downloadError" 
            class="error-message" 
            data-testid="download-error"
            role="alert"
            aria-live="polite"
          >
            下载失败，请稍后重试
          </p>
        </div>
      </div>
    </section>

    <!-- Contact Form Section - 页面底部 -->
    <section class="form-section" :class="{ 'animate-fadeInUp': isVisible }" style="animation-delay: 0.4s" aria-labelledby="form-title">
      <div class="form-container">
        <h2 id="form-title" class="form-title">发送消息</h2>
        <ContactForm />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { profileData } from '@/data/profile'
import ContactForm from '@/components/common/ContactForm.vue'
import { useSEO } from '@/composables/useSEO'

const profile = profileData

// 微信号
const wechatId = '14775378984'
const showCopySuccess = ref(false)

// 微信号复制功能
const copyWechat = async () => {
  try {
    await navigator.clipboard.writeText(wechatId)
    showCopySuccess.value = true
    setTimeout(() => {
      showCopySuccess.value = false
    }, 2000)
  } catch (error) {
    // 降级方案：使用 execCommand
    const textArea = document.createElement('textarea')
    textArea.value = wechatId
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    textArea.style.top = '-9999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      document.execCommand('copy')
      showCopySuccess.value = true
      setTimeout(() => {
        showCopySuccess.value = false
      }, 2000)
    } catch (execError) {
      console.error('复制失败:', execError)
    }
    document.body.removeChild(textArea)
  }
}

// SEO Meta Tags
useSEO({
  title: `联系我 - ${profile.name}`,
  description: `联系${profile.name}，获取简历或讨论合作机会。邮箱：${profile.email}，电话：${profile.phone}`,
  keywords: `联系方式,${profile.name},邮箱,电话,简历下载`,
  ogTitle: `联系${profile.name}`,
  ogDescription: '期待与您的交流，让我们一起创造价值',
})

const isVisible = ref(false)
const isDownloading = ref(false)
const downloadSuccess = ref(false)
const downloadError = ref(false)

// Scroll animation trigger
const handleScroll = () => {
  const scrollY = window.scrollY
  if (scrollY > 50) {
    isVisible.value = true
  }
}

// Download resume handler with status feedback
// 需求: 13.1 - 添加时间戳参数防止缓存
// 需求: 13.2 - 确保前端链接指向最新文件
// 需求: 13.5 - 下载失败时提供友好的错误提示
const downloadResume = async () => {
  // Reset states
  downloadSuccess.value = false
  downloadError.value = false
  isDownloading.value = true

  // 使用公共目录的简历文件（由后端同步的当前激活简历）
  // 添加时间戳参数防止浏览器缓存
  const timestamp = Date.now()
  const resumeUrl = `/resume.pdf?t=${timestamp}`
  const downloadFileName = '黄彦杰_简历.pdf'

  try {
    // 获取简历文件
    const response = await fetch(resumeUrl)
    
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status} ${response.statusText}`)
    }

    // 获取文件 Blob
    const blob = await response.blob()
    
    // 创建临时 URL
    const blobUrl = window.URL.createObjectURL(blob)
    
    // Create a link element and trigger download
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = downloadFileName
    
    // For mobile compatibility, handle differently
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      // On mobile, open in new tab instead of forcing download
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
    }
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // 清理临时 URL
    window.URL.revokeObjectURL(blobUrl)

    // Show success feedback
    isDownloading.value = false
    downloadSuccess.value = true
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      downloadSuccess.value = false
    }, 3000)
  } catch (error) {
    console.error('下载简历失败:', error)
    
    // Show error feedback
    isDownloading.value = false
    downloadError.value = true
    
    // Hide error message after 3 seconds
    setTimeout(() => {
      downloadError.value = false
    }, 3000)
  }
}

onMounted(() => {
  // Trigger animations on mount
  setTimeout(() => {
    isVisible.value = true
  }, 100)

  // Add scroll listener
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.contact {
  width: 100%;
  min-height: calc(100vh - 4rem);
  padding: var(--spacing-2xl) var(--spacing-lg);
}

/* Header Section */
.contact-header {
  text-align: center;
  margin-bottom: var(--spacing-3xl);
}

.page-title {
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 800;
  margin: 0 0 var(--spacing-md);
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  opacity: 0;
}

.page-subtitle {
  font-size: clamp(1rem, 2vw, 1.25rem);
  color: var(--text-secondary);
  opacity: 0;
}

/* Contact Info Section */
.contact-info {
  max-width: 1000px;
  margin: 0 auto var(--spacing-2xl);
  opacity: 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-lg);
}

.info-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-xl);
  background: var(--bg-card);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  text-decoration: none;
  transition: all var(--transition-base);
  cursor: pointer;
}

.info-card:hover {
  transform: translateY(-4px);
  border-color: var(--primary);
  box-shadow: 0 8px 32px rgba(0, 217, 255, 0.2);
  background: rgba(0, 217, 255, 0.05);
}

/* WeChat Card Specific Styles */
.wechat-card {
  position: relative;
}

.wechat-icon {
  background: linear-gradient(135deg, #07c160, #1aad19);
}

.copy-hint {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: 0.75rem;
  color: var(--text-muted);
  opacity: 0;
  transition: opacity var(--transition-base);
}

.wechat-card:hover .copy-hint,
.wechat-card:focus .copy-hint {
  opacity: 1;
}

.copy-icon {
  width: 14px;
  height: 14px;
}

/* Copy Success Toast */
.copy-toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background: linear-gradient(135deg, #07c160, #1aad19);
  color: white;
  border-radius: var(--radius-md);
  box-shadow: 0 4px 20px rgba(7, 193, 96, 0.4);
  z-index: 1000;
  font-weight: 500;
}

.toast-icon {
  width: 20px;
  height: 20px;
}

/* Toast Animation */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

.icon-wrapper {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border-radius: var(--radius-md);
}

.icon {
  width: 28px;
  height: 28px;
  color: var(--text-primary);
}

.info-content {
  flex: 1;
}

.info-label {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0 0 var(--spacing-xs);
  font-weight: 500;
}

.info-value {
  font-size: 1.125rem;
  color: var(--text-primary);
  margin: 0;
  font-weight: 600;
}

/* Form Section - 页面底部 */
.form-section {
  max-width: 600px;
  margin: var(--spacing-3xl) auto 0;
  opacity: 0;
}

.form-container {
  background: var(--bg-card);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-2xl);
}

.form-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--spacing-xl);
  text-align: center;
}

/* Resume Section - 与联系信息区域整合 */
.resume-section {
  max-width: 1000px;
  margin: 0 auto;
  opacity: 0;
}

.resume-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-xl);
  padding: var(--spacing-2xl);
  background: linear-gradient(135deg, rgba(0, 217, 255, 0.1), rgba(123, 97, 255, 0.1));
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.resume-content {
  flex: 1;
}

.resume-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--spacing-sm);
}

.resume-description {
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0;
}

.download-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--spacing-sm);
}

.btn-download {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-xl);
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: var(--text-primary);
  border: none;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: 0 4px 16px rgba(0, 217, 255, 0.3);
  white-space: nowrap;
}

.btn-download:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 217, 255, 0.4);
}

.btn-download:active:not(:disabled) {
  transform: translateY(0);
}

.btn-download:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.download-icon {
  width: 20px;
  height: 20px;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.error-message {
  font-size: 0.875rem;
  color: var(--accent);
  margin: 0;
  text-align: right;
}

/* Responsive Design */
@media (max-width: 768px) {
  .contact {
    padding: var(--spacing-xl) var(--spacing-md);
  }

  /* 768px 以下改为单列布局 */
  .info-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }

  .form-container {
    padding: var(--spacing-xl);
  }

  .resume-card {
    flex-direction: column;
    text-align: center;
  }

  .download-wrapper {
    width: 100%;
    align-items: center;
  }

  .btn-download {
    width: 100%;
    justify-content: center;
  }

  .error-message {
    text-align: center;
  }
}

@media (max-width: 480px) {
  .info-card {
    padding: var(--spacing-lg);
  }

  .icon-wrapper {
    width: 48px;
    height: 48px;
  }

  .icon {
    width: 24px;
    height: 24px;
  }

  .form-container {
    padding: var(--spacing-lg);
  }

  .resume-card {
    padding: var(--spacing-xl);
  }
}
</style>
