<template>
  <Transition name="slide-down">
    <div v-if="showWarning" class="compat-warning" :class="severityClass">
      <div class="warning-content">
        <div class="warning-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div class="warning-text">
          <h4 class="warning-title">{{ title }}</h4>
          <p class="warning-message">{{ message }}</p>
          <ul v-if="warnings.length > 0" class="warning-list">
            <li v-for="(warning, index) in warnings" :key="index">
              {{ warning }}
            </li>
          </ul>
        </div>
        <button @click="dismiss" class="close-button" aria-label="关闭">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { checkBrowserCompatibility } from '@/utils/browserCompat'

interface Props {
  autoCheck?: boolean
  dismissible?: boolean
  storageKey?: string
}

const props = withDefaults(defineProps<Props>(), {
  autoCheck: true,
  dismissible: true,
  storageKey: 'browser-compat-warning-dismissed',
})

const showWarning = ref(false)
const compatResult = ref<ReturnType<typeof checkBrowserCompatibility> | null>(null)

const title = computed(() => {
  if (!compatResult.value) return ''
  
  if (!compatResult.value.isCompatible) {
    return '浏览器不兼容'
  }
  
  if (compatResult.value.warnings.length > 0) {
    return '浏览器兼容性提示'
  }
  
  return ''
})

const message = computed(() => {
  if (!compatResult.value) return ''
  
  if (!compatResult.value.isCompatible) {
    return `您的浏览器 (${compatResult.value.browser.name} ${compatResult.value.browser.version}) 可能无法正常运行本网站。`
  }
  
  return `您正在使用 ${compatResult.value.browser.name} ${compatResult.value.browser.version}。`
})

const warnings = computed(() => {
  return compatResult.value?.warnings || []
})

const severityClass = computed(() => {
  if (!compatResult.value) return ''
  
  if (!compatResult.value.isCompatible) {
    return 'severity-error'
  }
  
  if (compatResult.value.warnings.length > 0) {
    return 'severity-warning'
  }
  
  return ''
})

const checkCompatibility = () => {
  compatResult.value = checkBrowserCompatibility()
  
  // Check if user has dismissed the warning before
  const dismissed = localStorage.getItem(props.storageKey)
  
  if (dismissed === 'true') {
    showWarning.value = false
    return
  }
  
  // Show warning if there are compatibility issues
  if (!compatResult.value.isCompatible || compatResult.value.warnings.length > 0) {
    showWarning.value = true
  }
}

const dismiss = () => {
  showWarning.value = false
  
  // Remember dismissal
  try {
    localStorage.setItem(props.storageKey, 'true')
  } catch {
    // Ignore localStorage errors
  }
}

onMounted(() => {
  if (props.autoCheck) {
    checkCompatibility()
  }
})

defineExpose({
  checkCompatibility,
  dismiss,
})
</script>

<style scoped>
.compat-warning {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  background: var(--bg-card);
  border-bottom: 2px solid var(--border);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
}

.severity-error {
  background: rgba(255, 107, 157, 0.1);
  border-bottom-color: var(--accent);
}

.severity-warning {
  background: rgba(255, 193, 7, 0.1);
  border-bottom-color: #ffc107;
}

.warning-content {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 1.5rem;
}

.warning-icon {
  flex-shrink: 0;
}

.warning-icon svg {
  width: 24px;
  height: 24px;
  color: var(--accent);
}

.severity-warning .warning-icon svg {
  color: #ffc107;
}

.warning-text {
  flex: 1;
  min-width: 0;
}

.warning-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
}

.warning-message {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.warning-list {
  margin: 0.5rem 0 0 0;
  padding-left: 1.25rem;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.warning-list li {
  margin-bottom: 0.25rem;
}

.close-button {
  flex-shrink: 0;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.close-button svg {
  width: 20px;
  height: 20px;
}

/* Transitions */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

@media (max-width: 640px) {
  .warning-content {
    padding: 0.875rem 1rem;
    gap: 0.75rem;
  }

  .warning-icon svg {
    width: 20px;
    height: 20px;
  }

  .warning-title {
    font-size: 0.9375rem;
  }

  .warning-message {
    font-size: 0.8125rem;
  }

  .warning-list {
    font-size: 0.75rem;
  }
}
</style>
