<template>
  <div class="not-found">
    <div class="not-found-content">
      <!-- 404 Icon -->
      <div class="error-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          class="icon"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <!-- Error Code -->
      <h1 class="error-code">404</h1>

      <!-- Error Message -->
      <h2 class="error-title">页面未找到</h2>
      <p class="error-description">
        抱歉，您访问的页面不存在或已被移除。
      </p>

      <!-- Action Buttons -->
      <div class="actions">
        <router-link to="/" class="btn btn-primary">
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
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          返回首页
        </router-link>
        <button @click="goBack" class="btn btn-secondary">
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
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          返回上一页
        </button>
      </div>

      <!-- Helpful Links -->
      <div class="helpful-links">
        <p class="links-title">您可能想访问：</p>
        <div class="links">
          <router-link to="/about" class="link">关于我</router-link>
          <router-link to="/experience" class="link">工作经历</router-link>
          <router-link to="/skills" class="link">技能展示</router-link>
          <router-link to="/contact" class="link">联系方式</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
}

.not-found-content {
  max-width: 600px;
  text-align: center;
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-icon {
  margin-bottom: 2rem;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.icon {
  width: 120px;
  height: 120px;
  color: var(--primary);
  filter: drop-shadow(0 0 20px rgba(0, 217, 255, 0.3));
}

.error-code {
  font-size: clamp(4rem, 15vw, 8rem);
  font-weight: 800;
  margin: 0;
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  margin-bottom: 1rem;
}

.error-title {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
}

.error-description {
  font-size: 1.125rem;
  color: var(--text-secondary);
  margin: 0 0 3rem 0;
  line-height: 1.6;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 3rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.75rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  cursor: pointer;
  border: none;
  font-family: inherit;
}

.btn-icon {
  width: 20px;
  height: 20px;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  color: white;
  box-shadow: 0 4px 16px rgba(0, 217, 255, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(0, 217, 255, 0.4);
}

.btn-secondary {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: var(--bg-secondary);
  border-color: var(--primary);
  transform: translateY(-2px);
}

.helpful-links {
  padding-top: 2rem;
  border-top: 1px solid var(--border);
}

.links-title {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0 0 1rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.links {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.link {
  color: var(--primary);
  text-decoration: none;
  font-size: 0.9375rem;
  transition: all 0.3s ease;
  position: relative;
}

.link::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--primary);
  transition: width 0.3s ease;
}

.link:hover {
  color: var(--secondary);
}

.link:hover::after {
  width: 100%;
}

@media (max-width: 640px) {
  .not-found {
    padding: 1rem;
  }

  .actions {
    flex-direction: column;
    width: 100%;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }

  .links {
    flex-direction: column;
    gap: 0.75rem;
  }
}
</style>
