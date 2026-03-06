<template>
  <div class="projects-page">
    <div class="projects-container">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">项目展示</h1>
        <p class="page-subtitle">Projects Portfolio</p>
      </div>

      <!-- 项目筛选组件 -->
      <ProjectFilter
        :filter="filter"
        :technologies="availableTechnologies"
        :categories="availableCategories"
        :filtered-count="filteredProjects.length"
        :has-active-filter="hasActiveFilter"
        @filter-technology="filterByTechnology"
        @filter-category="filterByCategory"
        @clear-filter="clearFilter"
      />

      <!-- 项目列表 -->
      <div class="projects-grid">
        <div
          v-for="(project, index) in filteredProjects"
          :key="project.id"
          class="project-card"
          :style="{ animationDelay: `${index * 0.1}s` }"
          @click="goToProject(project.id)"
        >
          <!-- 项目封面 -->
          <div class="project-cover">
            <img
              v-if="project.screenshots && project.screenshots.length > 0"
              :src="project.screenshots[0]"
              :alt="project.name"
              class="cover-image"
              @error="handleImageError"
            />
            <div v-else class="cover-placeholder">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="placeholder-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span class="category-badge" :class="project.category">
              {{ getCategoryLabel(project.category) }}
            </span>
          </div>

          <!-- 项目信息 -->
          <div class="project-info">
            <h3 class="project-name">{{ project.name }}</h3>
            <p class="project-period">{{ project.period }}</p>
            <p class="project-description">{{ project.description }}</p>
            
            <!-- 技术栈标签 -->
            <div class="tech-tags">
              <span
                v-for="tech in project.technologies.slice(0, 4)"
                :key="tech"
                class="tech-tag"
                @click.stop="filterByTechnology(tech)"
              >
                {{ tech }}
              </span>
              <span v-if="project.technologies.length > 4" class="tech-more">
                +{{ project.technologies.length - 4 }}
              </span>
            </div>
          </div>

          <!-- 查看详情按钮 -->
          <div class="project-footer">
            <span class="view-detail">
              查看详情
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="arrow-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredProjects.length === 0" class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="empty-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 class="empty-title">没有找到匹配的项目</h3>
        <p class="empty-description">尝试调整筛选条件或清除筛选</p>
        <button class="clear-filter-btn" @click="clearFilter">
          清除筛选条件
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Projects 视图组件
 * 
 * 项目列表页，展示所有项目并支持筛选功能。
 * 
 * 功能：
 * - 展示所有项目卡片
 * - 支持按技术栈筛选
 * - 支持按分类筛选
 * - 支持组合筛选
 * - 点击项目卡片跳转到详情页
 * - 支持从 URL 参数读取初始筛选条件
 * 
 * 验证需求：
 * - 需求 5.5: 点击技术栈标签时筛选显示使用该技术的所有项目
 */
import { onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { projectsData } from '@/data/profile'
import { PROJECT_CATEGORY_LABELS, type Project } from '@/types/project'
import { useProjectFilter } from '@/composables/useProjectFilter'
import ProjectFilter from '@/components/common/ProjectFilter.vue'

// 路由实例
const router = useRouter()
const route = useRoute()

// 使用项目筛选 Composable
const {
  filteredProjects,
  filter,
  filterByTechnology,
  filterByCategory,
  clearFilter,
  availableTechnologies,
  availableCategories,
  hasActiveFilter,
} = useProjectFilter(projectsData)

/**
 * 获取分类的中文标签
 */
const getCategoryLabel = (category: Project['category']): string => {
  return PROJECT_CATEGORY_LABELS[category]
}

/**
 * 跳转到项目详情页
 */
const goToProject = (projectId: string): void => {
  router.push(`/projects/${projectId}`)
}

/**
 * 处理图片加载错误
 */
const handleImageError = (event: Event): void => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}

/**
 * 从 URL 参数读取初始筛选条件
 */
onMounted(() => {
  const techParam = route.query.tech as string | undefined
  const categoryParam = route.query.category as Project['category'] | undefined

  if (techParam) {
    filterByTechnology(techParam)
  }
  if (categoryParam) {
    filterByCategory(categoryParam)
  }
})

/**
 * 监听筛选条件变化，更新 URL 参数
 */
watch(filter, (newFilter) => {
  const query: Record<string, string> = {}
  
  if (newFilter.technology) {
    query.tech = newFilter.technology
  }
  if (newFilter.category) {
    query.category = newFilter.category
  }

  // 更新 URL 参数（不触发导航）
  router.replace({ query })
}, { deep: true })
</script>

<style scoped>
.projects-page {
  min-height: 100vh;
  padding: 6rem 2rem 4rem;
  background: var(--bg-primary, #0a0e27);
  position: relative;
  overflow: hidden;
}

.projects-container {
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.page-header {
  text-align: center;
  margin-bottom: 3rem;
  animation: fadeInDown 0.8s ease-out;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-title {
  font-size: 3rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary, #00d9ff), var(--secondary, #7b61ff));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 1rem 0;
}

.page-subtitle {
  font-size: 1.2rem;
  color: var(--text-secondary, #a0aec0);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 2px;
}

/* 项目网格 */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2rem;
}

/* 项目卡片 */
.project-card {
  background: rgba(21, 25, 50, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
  animation: fadeInUp 0.6s ease-out forwards;
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

.project-card:hover {
  background: rgba(21, 25, 50, 0.8);
  border-color: rgba(0, 217, 255, 0.3);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
  transform: translateY(-8px);
}

/* 项目封面 */
.project-cover {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.project-card:hover .cover-image {
  transform: scale(1.05);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(0, 217, 255, 0.1), rgba(123, 97, 255, 0.1));
}

.placeholder-icon {
  width: 64px;
  height: 64px;
  color: var(--text-muted, #6b7280);
}

.category-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.375rem 0.875rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}

.category-badge.work {
  background: rgba(0, 217, 255, 0.9);
  color: #0a0e27;
}

.category-badge.personal {
  background: rgba(123, 97, 255, 0.9);
  color: white;
}

.category-badge.open-source {
  background: rgba(16, 185, 129, 0.9);
  color: white;
}

/* 项目信息 */
.project-info {
  padding: 1.5rem;
}

.project-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #ffffff);
  margin: 0 0 0.5rem 0;
}

.project-period {
  font-size: 0.85rem;
  color: var(--primary, #00d9ff);
  margin: 0 0 0.75rem 0;
}

.project-description {
  font-size: 0.9rem;
  color: var(--text-secondary, #a0aec0);
  line-height: 1.6;
  margin: 0 0 1rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 技术栈标签 */
.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tech-tag {
  padding: 0.25rem 0.625rem;
  background: rgba(0, 217, 255, 0.1);
  border: 1px solid rgba(0, 217, 255, 0.2);
  border-radius: 12px;
  color: var(--primary, #00d9ff);
  font-size: 0.75rem;
  font-family: 'Fira Code', 'Consolas', monospace;
  transition: all 0.3s ease;
}

.tech-tag:hover {
  background: rgba(0, 217, 255, 0.2);
  border-color: var(--primary, #00d9ff);
}

.tech-more {
  padding: 0.25rem 0.625rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  color: var(--text-muted, #6b7280);
  font-size: 0.75rem;
}

/* 项目底部 */
.project-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.view-detail {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--primary, #00d9ff);
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.project-card:hover .view-detail {
  gap: 0.75rem;
}

.arrow-icon {
  width: 16px;
  height: 16px;
  transition: transform 0.3s ease;
}

.project-card:hover .arrow-icon {
  transform: translateX(4px);
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.empty-icon {
  width: 80px;
  height: 80px;
  color: var(--text-muted, #6b7280);
  margin-bottom: 1.5rem;
}

.empty-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary, #ffffff);
  margin: 0 0 0.75rem 0;
}

.empty-description {
  font-size: 1rem;
  color: var(--text-secondary, #a0aec0);
  margin: 0 0 1.5rem 0;
}

.clear-filter-btn {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--primary, #00d9ff), var(--secondary, #7b61ff));
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.clear-filter-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 217, 255, 0.3);
}

/* 响应式适配 */
@media (max-width: 768px) {
  .projects-page {
    padding: 5rem 1rem 2rem;
  }

  .page-title {
    font-size: 2rem;
  }

  .page-subtitle {
    font-size: 1rem;
  }

  .projects-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .project-cover {
    height: 180px;
  }

  .project-info {
    padding: 1.25rem;
  }

  .project-name {
    font-size: 1.1rem;
  }

  .project-card:hover {
    transform: translateY(-4px);
  }
}

/* 支持 prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .page-header,
  .project-card,
  .empty-state {
    animation: none;
    opacity: 1;
  }

  .project-card,
  .cover-image,
  .tech-tag,
  .view-detail,
  .arrow-icon,
  .clear-filter-btn {
    transition: none;
  }

  .project-card:hover {
    transform: none;
  }

  .project-card:hover .cover-image {
    transform: none;
  }
}
</style>
