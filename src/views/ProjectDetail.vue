<template>
  <div class="project-detail-page">
    <!-- 项目不存在时显示 404 -->
    <div v-if="!project" class="not-found-content">
      <div class="error-icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 class="error-code">404</h1>
      <h2 class="error-title">项目未找到</h2>
      <p class="error-description">抱歉，您访问的项目不存在或已被移除。</p>
      <div class="actions">
        <router-link to="/experience" class="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          查看工作经历
        </router-link>
        <button @click="goBack" class="btn btn-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回上一页
        </button>
      </div>
    </div>

    <!-- 项目详情内容 -->
    <div v-else class="project-container">
      <!-- 返回按钮 -->
      <div class="back-nav">
        <button @click="goBack" class="back-btn">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="back-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回
        </button>
      </div>

      <!-- 页面头部 -->
      <div class="page-header">
        <div class="header-content">
          <span class="category-badge" :class="project.category">
            {{ categoryLabel }}
          </span>
          <h1 class="project-title">{{ project.name }}</h1>
          <div class="project-meta">
            <span class="meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="meta-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {{ project.period }}
            </span>
            <span class="meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="meta-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {{ project.role }}
            </span>
          </div>
        </div>
      </div>

      <!-- 项目截图轮播 -->
      <div v-if="project.screenshots && project.screenshots.length > 0" class="screenshots-section">
        <ImageCarousel
          :images="project.screenshots"
          :auto-play="true"
          :interval="5000"
          :show-indicators="true"
          :show-arrows="true"
          @change="onCarouselChange"
        />
      </div>

      <!-- 项目描述 -->
      <div class="description-section">
        <h2 class="section-title">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="section-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          项目描述
        </h2>
        <p class="description-text">{{ project.description }}</p>
      </div>

      <!-- 技术栈 -->
      <div class="technologies-section">
        <h2 class="section-title">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="section-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          技术栈
        </h2>
        <div class="tech-tags">
          <router-link
            v-for="tech in project.technologies"
            :key="tech"
            :to="{ path: '/experience', query: { tech } }"
            class="tech-tag"
          >
            {{ tech }}
          </router-link>
        </div>
      </div>

      <!-- 项目亮点 -->
      <div class="highlights-section">
        <h2 class="section-title">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="section-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          项目亮点
        </h2>
        <ul class="highlights-list">
          <li v-for="(highlight, index) in project.highlights" :key="index" class="highlight-item">
            <span class="highlight-marker">▹</span>
            {{ highlight }}
          </li>
        </ul>
      </div>

      <!-- 项目链接 -->
      <div v-if="project.demoUrl || project.sourceUrl" class="links-section">
        <h2 class="section-title">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="section-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          项目链接
        </h2>
        <div class="project-links">
          <a v-if="project.demoUrl" :href="project.demoUrl" target="_blank" rel="noopener noreferrer" class="project-link demo-link">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="link-icon">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            在线演示
          </a>
          <a v-if="project.sourceUrl" :href="project.sourceUrl" target="_blank" rel="noopener noreferrer" class="project-link source-link">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="link-icon">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            源代码
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ProjectDetail 视图组件
 * 
 * 项目详情页，展示单个项目的完整信息。
 * 
 * 功能：
 * - 从路由参数获取项目 ID
 * - 从 projectsData 中查找对应项目
 * - 展示项目的所有信息：名称、描述、时间段、角色、技术栈、亮点
 * - 使用 ImageCarousel 组件展示项目截图
 * - 提供返回按钮和导航链接
 * - 处理项目不存在的情况（显示 404）
 * 
 * 验证需求：
 * - 需求 5.1: 用户点击项目卡片时导航到 Project_Detail_Page
 * - 需求 5.2: Project_Detail_Page 展示项目名称、时间段、角色、描述、技术栈和亮点
 * - 需求 5.6: Project_Detail_Page 支持返回项目列表页的导航
 */

import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { projectsData } from '@/data/profile'
import { PROJECT_CATEGORY_LABELS } from '@/types/project'
import ImageCarousel from '@/components/common/ImageCarousel.vue'

// 获取路由实例
const route = useRoute()
const router = useRouter()

/**
 * 从路由参数获取项目 ID
 */
const projectId = computed(() => route.params.id as string)

/**
 * 根据 ID 查找项目数据
 * 如果找不到则返回 undefined
 */
const project = computed(() => {
  return projectsData.find(p => p.id === projectId.value)
})

/**
 * 获取项目分类的中文标签
 */
const categoryLabel = computed(() => {
  if (!project.value) return ''
  return PROJECT_CATEGORY_LABELS[project.value.category]
})

/**
 * 返回上一页
 * 如果没有历史记录则返回工作经历页
 */
const goBack = (): void => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/experience')
  }
}

/**
 * 轮播图切换事件处理
 * @param index - 当前图片索引
 */
const onCarouselChange = (index: number): void => {
  console.log('轮播图切换到:', index)
}
</script>

<style scoped>
.project-detail-page {
  min-height: 100vh;
  padding: 6rem 2rem 4rem;
  background: var(--bg-primary, #0a0e27);
  position: relative;
  overflow: hidden;
}

.project-container {
  max-width: 900px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

/* 返回导航 */
.back-nav {
  margin-bottom: 2rem;
  animation: fadeInLeft 0.5s ease-out;
}

@keyframes fadeInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: rgba(21, 25, 50, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text-secondary, #a0aec0);
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: rgba(0, 217, 255, 0.1);
  border-color: var(--primary, #00d9ff);
  color: var(--primary, #00d9ff);
  transform: translateX(-4px);
}

.back-icon {
  width: 18px;
  height: 18px;
}

/* 页面头部 */
.page-header {
  margin-bottom: 2rem;
  animation: fadeInDown 0.6s ease-out;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.header-content {
  text-align: center;
}

.category-badge {
  display: inline-block;
  padding: 0.375rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 1rem;
}

.category-badge.work {
  background: rgba(0, 217, 255, 0.15);
  color: var(--primary, #00d9ff);
  border: 1px solid rgba(0, 217, 255, 0.3);
}

.category-badge.personal {
  background: rgba(123, 97, 255, 0.15);
  color: var(--secondary, #7b61ff);
  border: 1px solid rgba(123, 97, 255, 0.3);
}

.category-badge.open-source {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.project-title {
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary, #00d9ff), var(--secondary, #7b61ff));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 1rem 0;
  line-height: 1.2;
}

.project-meta {
  display: flex;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary, #a0aec0);
  font-size: 1rem;
}

.meta-icon {
  width: 18px;
  height: 18px;
  color: var(--primary, #00d9ff);
}

/* 截图轮播区域 */
.screenshots-section {
  margin-bottom: 2.5rem;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  animation: fadeInUp 0.7s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 通用区块样式 */
.description-section,
.technologies-section,
.highlights-section,
.links-section {
  background: rgba(21, 25, 50, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 1.5rem;
  animation: fadeInUp 0.7s ease-out;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #ffffff);
  margin: 0 0 1.25rem 0;
}

.section-icon {
  width: 24px;
  height: 24px;
  color: var(--primary, #00d9ff);
}

/* 项目描述 */
.description-text {
  font-size: 1rem;
  color: var(--text-secondary, #a0aec0);
  line-height: 1.8;
  margin: 0;
}

/* 技术栈标签 */
.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.tech-tag {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: rgba(0, 217, 255, 0.1);
  border: 1px solid rgba(0, 217, 255, 0.3);
  border-radius: 20px;
  color: var(--primary, #00d9ff);
  font-size: 0.9rem;
  text-decoration: none;
  transition: all 0.3s ease;
}

.tech-tag:hover {
  background: rgba(0, 217, 255, 0.2);
  border-color: var(--primary, #00d9ff);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 217, 255, 0.2);
}

/* 项目亮点列表 */
.highlights-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.highlight-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  font-size: 0.95rem;
  color: var(--text-secondary, #a0aec0);
  line-height: 1.6;
}

.highlight-marker {
  color: var(--primary, #00d9ff);
  font-weight: bold;
  font-size: 1.1rem;
  flex-shrink: 0;
}

/* 项目链接 */
.project-links {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.project-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.3s ease;
}

.link-icon {
  width: 18px;
  height: 18px;
}

.demo-link {
  background: linear-gradient(135deg, var(--primary, #00d9ff), var(--secondary, #7b61ff));
  color: white;
  box-shadow: 0 4px 16px rgba(0, 217, 255, 0.3);
}

.demo-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(0, 217, 255, 0.4);
}

.source-link {
  background: rgba(21, 25, 50, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--text-primary, #ffffff);
}

.source-link:hover {
  background: rgba(0, 217, 255, 0.1);
  border-color: var(--primary, #00d9ff);
  transform: translateY(-2px);
}

/* 404 未找到样式 */
.not-found-content {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
  padding-top: 4rem;
  animation: fadeInUp 0.6s ease-out;
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

.error-icon .icon {
  width: 100px;
  height: 100px;
  color: var(--primary, #00d9ff);
  filter: drop-shadow(0 0 20px rgba(0, 217, 255, 0.3));
}

.error-code {
  font-size: 5rem;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(135deg, var(--primary, #00d9ff), var(--secondary, #7b61ff));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  margin-bottom: 1rem;
}

.error-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary, #ffffff);
  margin: 0 0 1rem 0;
}

.error-description {
  font-size: 1rem;
  color: var(--text-secondary, #a0aec0);
  margin: 0 0 2.5rem 0;
  line-height: 1.6;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
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
  background: linear-gradient(135deg, var(--primary, #00d9ff), var(--secondary, #7b61ff));
  color: white;
  box-shadow: 0 4px 16px rgba(0, 217, 255, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(0, 217, 255, 0.4);
}

.btn-secondary {
  background: var(--bg-card, #151932);
  color: var(--text-primary, #ffffff);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
}

.btn-secondary:hover {
  background: var(--bg-secondary, #1a1f3e);
  border-color: var(--primary, #00d9ff);
  transform: translateY(-2px);
}

/* 响应式适配 */
@media (max-width: 768px) {
  .project-detail-page {
    padding: 5rem 1rem 2rem;
  }

  .project-title {
    font-size: 1.75rem;
  }

  .project-meta {
    flex-direction: column;
    gap: 0.75rem;
  }

  .meta-item {
    justify-content: center;
  }

  .description-section,
  .technologies-section,
  .highlights-section,
  .links-section {
    padding: 1.5rem;
  }

  .section-title {
    font-size: 1.1rem;
  }

  .tech-tags {
    gap: 0.5rem;
  }

  .tech-tag {
    padding: 0.375rem 0.75rem;
    font-size: 0.85rem;
  }

  .project-links {
    flex-direction: column;
  }

  .project-link {
    justify-content: center;
  }

  .error-code {
    font-size: 4rem;
  }

  .error-title {
    font-size: 1.5rem;
  }

  .actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }
}

/* 支持 prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .back-nav,
  .page-header,
  .screenshots-section,
  .description-section,
  .technologies-section,
  .highlights-section,
  .links-section,
  .not-found-content {
    animation: none;
  }

  .error-icon {
    animation: none;
  }

  .back-btn,
  .tech-tag,
  .project-link,
  .btn {
    transition: none;
  }
}
</style>
