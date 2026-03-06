<template>
  <div class="project-filter">
    <!-- 筛选标题 -->
    <div class="filter-header">
      <h3 class="filter-title">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="filter-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        项目筛选
      </h3>
      <button 
        v-if="hasActiveFilter" 
        class="clear-btn"
        @click="handleClearFilter"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="clear-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        清除筛选
      </button>
    </div>

    <!-- 分类筛选 -->
    <div class="filter-section">
      <h4 class="section-label">项目分类</h4>
      <div class="filter-tags">
        <button
          v-for="category in availableCategories"
          :key="category"
          class="filter-tag"
          :class="{ active: currentFilter.category === category }"
          @click="handleCategoryClick(category)"
        >
          <span class="tag-dot" :class="category"></span>
          {{ getCategoryLabel(category) }}
        </button>
      </div>
    </div>

    <!-- 技术栈筛选 -->
    <div class="filter-section">
      <h4 class="section-label">技术栈</h4>
      <div class="filter-tags tech-tags">
        <button
          v-for="tech in availableTechnologies"
          :key="tech"
          class="filter-tag tech-tag"
          :class="{ active: currentFilter.technology === tech }"
          @click="handleTechnologyClick(tech)"
        >
          {{ tech }}
        </button>
      </div>
    </div>

    <!-- 当前筛选状态 -->
    <div v-if="hasActiveFilter" class="filter-status">
      <span class="status-label">当前筛选：</span>
      <span v-if="currentFilter.category" class="status-value">
        {{ getCategoryLabel(currentFilter.category) }}
      </span>
      <span v-if="currentFilter.category && currentFilter.technology" class="status-separator">+</span>
      <span v-if="currentFilter.technology" class="status-value tech">
        {{ currentFilter.technology }}
      </span>
      <span class="status-count">
        （{{ filteredCount }} 个项目）
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ProjectFilter 组件
 * 
 * 项目筛选 UI 组件，提供技术栈和分类筛选功能。
 * 
 * 功能：
 * - 显示所有可用的技术栈标签
 * - 显示所有可用的项目分类
 * - 支持点击标签进行筛选
 * - 支持清除筛选条件
 * - 高亮显示当前选中的筛选条件
 * 
 * 验证需求：
 * - 需求 5.5: 点击技术栈标签时筛选显示使用该技术的所有项目
 */
import { computed } from 'vue'
import type { Project, ProjectFilter } from '@/types/project'
import { PROJECT_CATEGORY_LABELS } from '@/types/project'

/**
 * 组件属性
 */
interface Props {
  /** 当前筛选条件 */
  filter: ProjectFilter
  /** 可用的技术栈列表 */
  technologies: string[]
  /** 可用的分类列表 */
  categories: Project['category'][]
  /** 筛选后的项目数量 */
  filteredCount: number
  /** 是否有激活的筛选条件 */
  hasActiveFilter: boolean
}

const props = defineProps<Props>()

/**
 * 组件事件
 */
const emit = defineEmits<{
  /** 技术栈筛选事件 */
  (e: 'filter-technology', technology: string): void
  /** 分类筛选事件 */
  (e: 'filter-category', category: Project['category']): void
  /** 清除筛选事件 */
  (e: 'clear-filter'): void
}>()

/**
 * 当前筛选条件
 */
const currentFilter = computed(() => props.filter)

/**
 * 可用的技术栈列表
 */
const availableTechnologies = computed(() => props.technologies)

/**
 * 可用的分类列表
 */
const availableCategories = computed(() => props.categories)

/**
 * 获取分类的中文标签
 */
const getCategoryLabel = (category: Project['category']): string => {
  return PROJECT_CATEGORY_LABELS[category]
}

/**
 * 处理技术栈点击
 */
const handleTechnologyClick = (technology: string): void => {
  // 如果点击的是当前选中的技术栈，则取消选中
  if (currentFilter.value.technology === technology) {
    emit('clear-filter')
  } else {
    emit('filter-technology', technology)
  }
}

/**
 * 处理分类点击
 */
const handleCategoryClick = (category: Project['category']): void => {
  // 如果点击的是当前选中的分类，则取消选中
  if (currentFilter.value.category === category) {
    emit('clear-filter')
  } else {
    emit('filter-category', category)
  }
}

/**
 * 处理清除筛选
 */
const handleClearFilter = (): void => {
  emit('clear-filter')
}
</script>

<style scoped>
.project-filter {
  background: rgba(21, 25, 50, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  animation: fadeInDown 0.5s ease-out;
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

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.filter-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #ffffff);
  margin: 0;
}

.filter-icon {
  width: 20px;
  height: 20px;
  color: var(--primary, #00d9ff);
}

.clear-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ef4444;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.clear-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
}

.clear-icon {
  width: 14px;
  height: 14px;
}

.filter-section {
  margin-bottom: 1rem;
}

.filter-section:last-of-type {
  margin-bottom: 0;
}

.section-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-secondary, #a0aec0);
  margin: 0 0 0.75rem 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  color: var(--text-secondary, #a0aec0);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-tag:hover {
  background: rgba(0, 217, 255, 0.1);
  border-color: rgba(0, 217, 255, 0.3);
  color: var(--primary, #00d9ff);
}

.filter-tag.active {
  background: rgba(0, 217, 255, 0.2);
  border-color: var(--primary, #00d9ff);
  color: var(--primary, #00d9ff);
  box-shadow: 0 0 12px rgba(0, 217, 255, 0.3);
}

.tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.tag-dot.work {
  background: var(--primary, #00d9ff);
}

.tag-dot.personal {
  background: var(--secondary, #7b61ff);
}

.tag-dot.open-source {
  background: #10b981;
}

.tech-tags {
  max-height: 150px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.tech-tags::-webkit-scrollbar {
  width: 4px;
}

.tech-tags::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
}

.tech-tags::-webkit-scrollbar-thumb {
  background: rgba(0, 217, 255, 0.3);
  border-radius: 2px;
}

.tech-tags::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 217, 255, 0.5);
}

.tech-tag {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.8rem;
}

.filter-status {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.status-label {
  font-size: 0.85rem;
  color: var(--text-secondary, #a0aec0);
}

.status-value {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  background: rgba(123, 97, 255, 0.2);
  border-radius: 12px;
  color: var(--secondary, #7b61ff);
  font-size: 0.85rem;
  font-weight: 500;
}

.status-value.tech {
  background: rgba(0, 217, 255, 0.2);
  color: var(--primary, #00d9ff);
  font-family: 'Fira Code', 'Consolas', monospace;
}

.status-separator {
  color: var(--text-secondary, #a0aec0);
  font-weight: 600;
}

.status-count {
  font-size: 0.85rem;
  color: var(--text-muted, #6b7280);
}

/* 响应式适配 */
@media (max-width: 768px) {
  .project-filter {
    padding: 1rem;
  }

  .filter-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .clear-btn {
    width: 100%;
    justify-content: center;
  }

  .filter-tags {
    gap: 0.375rem;
  }

  .filter-tag {
    padding: 0.375rem 0.75rem;
    font-size: 0.8rem;
  }

  .tech-tags {
    max-height: 120px;
  }

  .filter-status {
    flex-direction: column;
    align-items: flex-start;
  }
}

/* 支持 prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .project-filter {
    animation: none;
  }

  .filter-tag,
  .clear-btn {
    transition: none;
  }
}
</style>
