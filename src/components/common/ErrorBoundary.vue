<template>
  <div v-if="error" class="error-boundary">
    <div class="error-content">
      <div class="error-icon">
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
      <h3 class="error-title">{{ title }}</h3>
      <p class="error-message">{{ message }}</p>
      <div class="error-actions">
        <button @click="retry" class="btn btn-primary">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            class="btn-icon"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          重试
        </button>
        <button v-if="showReportButton" @click="reportError" class="btn btn-secondary">
          报告问题
        </button>
      </div>
      <details v-if="showDetails && errorDetails" class="error-details">
        <summary>错误详情</summary>
        <pre>{{ errorDetails }}</pre>
      </details>
    </div>
  </div>
  <slot v-else></slot>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'

interface Props {
  title?: string
  message?: string
  showDetails?: boolean
  showReportButton?: boolean
  onRetry?: () => void
  onReport?: (error: Error) => void
}

const props = withDefaults(defineProps<Props>(), {
  title: '组件加载失败',
  message: '抱歉，该组件无法正常加载。请尝试刷新页面或稍后再试。',
  showDetails: import.meta.env.DEV,
  showReportButton: false,
})

const error = ref<Error | null>(null)
const errorDetails = ref<string>('')

onErrorCaptured((err: Error) => {
  error.value = err
  errorDetails.value = `${err.name}: ${err.message}\n\nStack:\n${err.stack || 'No stack trace available'}`
  
  // Log error in development
  if (import.meta.env.DEV) {
    console.error('ErrorBoundary caught error:', err)
  }
  
  // Prevent error from propagating
  return false
})

const retry = () => {
  error.value = null
  errorDetails.value = ''
  
  if (props.onRetry) {
    props.onRetry()
  } else {
    // Default retry: reload the page
    window.location.reload()
  }
}

const reportError = () => {
  if (props.onReport && error.value) {
    props.onReport(error.value)
  } else {
    // Default report: log to console
    console.error('Error reported:', error.value)
  }
}
</script>

<style scoped>
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: 2rem;
}

.error-content {
  max-width: 500px;
  text-align: center;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 2rem;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.error-icon {
  margin-bottom: 1rem;
}

.error-icon svg {
  width: 64px;
  height: 64px;
  color: var(--accent);
}

.error-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.error-message {
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0 0 1.5rem 0;
  line-height: 1.6;
}

.error-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  cursor: pointer;
  border: none;
  font-family: inherit;
}

.btn-icon {
  width: 18px;
  height: 18px;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 217, 255, 0.3);
}

.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: var(--bg-secondary);
  border-color: var(--primary);
}

.error-details {
  margin-top: 1.5rem;
  text-align: left;
  border-top: 1px solid var(--border);
  padding-top: 1rem;
}

.error-details summary {
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
  user-select: none;
}

.error-details summary:hover {
  color: var(--primary);
}

.error-details pre {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1rem;
  overflow-x: auto;
  font-size: 0.75rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

@media (max-width: 640px) {
  .error-boundary {
    padding: 1rem;
  }

  .error-content {
    padding: 1.5rem;
  }

  .error-actions {
    flex-direction: column;
    width: 100%;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
