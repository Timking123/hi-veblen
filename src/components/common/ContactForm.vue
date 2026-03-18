<template>
  <div class="contact-form-wrapper" data-testid="contact-form-wrapper">
    <!-- 收起状态：仅显示"留言"按钮 -->
    <button
      v-if="!isExpanded"
      type="button"
      class="btn-expand"
      data-testid="expand-button"
      @click="toggleForm"
    >
      <span class="btn-expand-icon">✉</span>
      <span>留言</span>
    </button>

    <!-- 展开状态：显示完整表单 -->
    <Transition name="form-expand">
      <form
        v-if="isExpanded"
        class="contact-form"
        @submit.prevent="handleSubmit"
        data-testid="contact-form"
      >
        <!-- Nickname Field（称呼字段） -->
        <div class="form-group">
          <label for="nickname" class="form-label">称呼 *</label>
          <input
            id="nickname"
            v-model="formData.nickname"
            type="text"
            class="form-input"
            :class="{ 'input-error': errors.nickname }"
            placeholder="请输入您的称呼"
            data-testid="nickname-input"
            @blur="validateField('nickname')"
            @input="clearError('nickname')"
          />
          <span v-if="errors.nickname" class="error-message" data-testid="nickname-error">{{ errors.nickname }}</span>
        </div>

        <!-- Contact Field（联系方式字段） -->
        <div class="form-group">
          <label for="contact" class="form-label">联系方式 *</label>
          <input
            id="contact"
            v-model="formData.contact"
            type="text"
            class="form-input"
            :class="{ 'input-error': errors.contact }"
            placeholder="请输入您的联系方式（电话/邮箱/微信等）"
            data-testid="contact-input"
            @blur="validateField('contact')"
            @input="clearError('contact')"
          />
          <span v-if="errors.contact" class="error-message" data-testid="contact-error">{{ errors.contact }}</span>
        </div>

        <!-- Message Field（留言内容字段） -->
        <div class="form-group">
          <label for="message" class="form-label">留言内容 *</label>
          <textarea
            id="message"
            v-model="formData.message"
            class="form-textarea"
            :class="{ 'input-error': errors.message }"
            placeholder="请输入您的留言内容"
            rows="5"
            data-testid="message-input"
            @blur="validateField('message')"
            @input="clearError('message')"
          ></textarea>
          <span v-if="errors.message" class="error-message" data-testid="message-error">{{ errors.message }}</span>
        </div>

        <!-- Submit Button（提交按钮） -->
        <button type="submit" class="btn-submit" :disabled="isSubmitting" data-testid="submit-button">
          <span v-if="!isSubmitting">提交留言</span>
          <span v-else>提交中...</span>
        </button>

        <!-- Success Message -->
        <div v-if="submitSuccess" class="success-message" data-testid="success-message">
          留言提交成功！感谢您的留言。
        </div>

        <!-- Error Message with Retry（错误消息和重试按钮） -->
        <div v-if="submitError" class="error-message-box" data-testid="error-message">
          <span>{{ submitError }}</span>
          <button type="button" class="btn-retry" @click="handleSubmit" data-testid="retry-button">
            重试
          </button>
        </div>
      </form>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { MessageFormData } from '@/types'
import axios from 'axios'

// API 基础地址
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// Form expand state（表单展开状态）
const isExpanded = ref(false)

// Form data（表单数据）
const formData = reactive<MessageFormData>({
  nickname: '',
  contact: '',
  message: '',
})

// Form errors（表单错误）
const errors = reactive<Record<string, string>>({
  nickname: '',
  contact: '',
  message: '',
})

// Form state（表单状态）
const isSubmitting = ref(false)
const submitSuccess = ref(false)
const submitError = ref('')  // 保存失败时的错误信息

// Toggle form expand state（切换表单展开状态）
const toggleForm = () => {
  if (!isExpanded.value) {
    isExpanded.value = true
  }
}

// Validation rules（验证规则）
const validationRules = {
  nickname: {
    required: true,
    message: '请输入您的称呼',
  },
  contact: {
    required: true,
    message: '请输入您的联系方式',
  },
  message: {
    required: true,
    message: '请输入留言内容',
  },
}

// Validate a single field（验证单个字段）
const validateField = (field: keyof MessageFormData): boolean => {
  const value = formData[field]
  const rule = validationRules[field]

  // Check required（检查必填）
  if (rule.required && !value.trim()) {
    errors[field] = rule.message
    return false
  }

  errors[field] = ''
  return true
}

// Validate all fields（验证所有字段）
const validateForm = (): boolean => {
  let isValid = true

  // Validate each field（验证每个字段）
  Object.keys(formData).forEach((field) => {
    const fieldValid = validateField(field as keyof MessageFormData)
    if (!fieldValid) {
      isValid = false
    }
  })

  return isValid
}

// Clear error for a field（清除字段错误）
const clearError = (field: keyof MessageFormData) => {
  errors[field] = ''
}

// Handle form submission（处理表单提交）
const handleSubmit = async () => {
  // Reset success/error message（重置成功/错误消息）
  submitSuccess.value = false
  submitError.value = ''

  // Validate form（验证表单）
  if (!validateForm()) {
    return
  }

  // Set submitting state（设置提交状态）
  isSubmitting.value = true

  try {
    // 调用后端 API 提交留言
    // 需求 4.3.1: 将留言保存到数据库和文件
    const response = await axios.post<{ success: boolean; id?: number; errors?: string[] }>(
      `${API_BASE_URL}/messages/submit`,
      {
        nickname: formData.nickname.trim(),
        contact: formData.contact.trim(),
        message: formData.message.trim()
      },
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    if (response.data.success) {
      // Show success message（显示成功消息）
      submitSuccess.value = true

      // Reset form（重置表单）
      formData.nickname = ''
      formData.contact = ''
      formData.message = ''

      // 成功后收起表单（延迟收起以显示成功消息）
      setTimeout(() => {
        submitSuccess.value = false
        isExpanded.value = false
      }, 2000)
    } else {
      // 保存失败，显示错误信息
      submitError.value = response.data.errors?.[0] || '留言提交失败，请稍后重试'
    }
  } catch (error) {
    console.error('Form submission error:', error)
    
    // 处理不同类型的错误
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // 服务器返回错误响应
        const errorMessage = error.response.data?.message || error.response.data?.errors?.[0]
        submitError.value = errorMessage || `提交失败 (${error.response.status})`
      } else if (error.code === 'ECONNABORTED') {
        // 请求超时
        submitError.value = '请求超时，请检查网络连接后重试'
      } else if (error.request) {
        // 请求已发送但没有收到响应
        submitError.value = '网络错误，请检查网络连接后重试'
      } else {
        // 其他错误
        submitError.value = '留言提交失败，请稍后重试'
      }
    } else {
      submitError.value = '留言提交失败，请稍后重试'
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.contact-form-wrapper {
  width: 100%;
}

/* 展开按钮样式 */
.btn-expand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  width: 100%;
  padding: var(--spacing-lg) var(--spacing-xl);
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: #ffffff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: 0 4px 16px rgba(0, 217, 255, 0.3);
}

.btn-expand:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 217, 255, 0.4);
}

.btn-expand:active {
  transform: translateY(0);
}

.btn-expand-icon {
  font-size: 1.25rem;
}

/* 表单展开/收起动画 */
.form-expand-enter-active {
  animation: formExpandIn 0.4s ease-out;
}

.form-expand-leave-active {
  animation: formExpandOut 0.3s ease-in;
}

@keyframes formExpandIn {
  from {
    opacity: 0;
    max-height: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    max-height: 1000px;
    transform: translateY(0);
  }
}

@keyframes formExpandOut {
  from {
    opacity: 1;
    max-height: 1000px;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    max-height: 0;
    transform: translateY(-20px);
  }
}

.contact-form {
  width: 100%;
  overflow: hidden;
}

.form-group {
  margin-bottom: var(--spacing-xl);
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
}

.form-input,
.form-textarea {
  width: 100%;
  padding: var(--spacing-md);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 1rem;
  font-family: inherit;
  transition: all var(--transition-base);
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(0, 217, 255, 0.1);
  background: rgba(255, 255, 255, 0.08);
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: var(--text-muted);
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
}

.input-error {
  border-color: var(--accent);
}

.error-message {
  display: block;
  margin-top: var(--spacing-xs);
  font-size: 0.875rem;
  color: var(--accent);
}

.btn-submit {
  width: 100%;
  padding: var(--spacing-md) var(--spacing-xl);
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: #ffffff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: 0 4px 16px rgba(0, 217, 255, 0.3);
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 217, 255, 0.4);
}

.btn-submit:active:not(:disabled) {
  transform: translateY(0);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.success-message {
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md);
  background: rgba(0, 217, 255, 0.1);
  border: 1px solid var(--primary);
  border-radius: var(--radius-sm);
  color: var(--primary);
  text-align: center;
  font-size: 0.875rem;
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Error Message Box（错误消息框样式） */
.error-message-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md);
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  color: var(--accent);
  font-size: 0.875rem;
  animation: fadeIn 0.3s ease-in-out;
}

.btn-retry {
  padding: var(--spacing-xs) var(--spacing-md);
  background: transparent;
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  color: var(--accent);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all var(--transition-base);
  white-space: nowrap;
}

.btn-retry:hover {
  background: rgba(255, 107, 107, 0.2);
}

/* Responsive Design */
@media (max-width: 480px) {
  .form-input,
  .form-textarea {
    padding: var(--spacing-sm);
  }

  .btn-submit,
  .btn-expand {
    padding: var(--spacing-sm) var(--spacing-lg);
  }
}
</style>
