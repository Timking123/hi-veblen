<template>
  <div class="skills-page">
    <div class="skills-container">
      <!-- Page Header -->
      <div class="page-header">
        <h1 class="page-title">技能展示</h1>
        <p class="page-subtitle">Technical Skills</p>
      </div>

      <!-- Chart Type Selector -->
      <div class="chart-type-selector">
        <button
          :class="['chart-btn', { active: chartType === 'bar' }]"
          @click="chartType = 'bar'"
        >
          柱状图
        </button>
        <button
          :class="['chart-btn', { active: chartType === 'radar' }]"
          @click="chartType = 'radar'"
        >
          雷达图
        </button>
      </div>

      <!-- Skills by Category -->
      <div class="skills-categories">
        <div
          v-for="(category, index) in categories"
          :key="category.key"
          class="category-section"
          :style="{ animationDelay: `${index * 0.1}s` }"
        >
          <h2 class="category-title">{{ category.name }}</h2>

          <!-- Chart for this category -->
          <div class="chart-wrapper">
            <SkillChart :skills="category.skills" :type="chartType" />
          </div>

          <!-- Skill Tags -->
          <div class="skill-tags">
            <div
              v-for="(skill, skillIndex) in category.skills"
              :key="skill.name"
              class="skill-tag"
              :class="{ active: selectedSkill === skill.name }"
              :style="{ animationDelay: `${skillIndex * 0.05}s` }"
              @mouseenter="hoveredSkill = skill"
              @mouseleave="hoveredSkill = null"
              @click="toggleSkillFilter(skill.name)"
            >
              <span class="skill-name">{{ skill.name }}</span>
              <span class="skill-level">{{ skill.level }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Hovered Skill Details -->
      <transition name="fade">
        <div v-if="hoveredSkill" class="skill-detail-card">
          <h3>{{ hoveredSkill.name }}</h3>
          <div class="detail-row">
            <span class="detail-label">熟练度:</span>
            <span class="detail-value">{{ hoveredSkill.level }}%</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">经验:</span>
            <span class="detail-value">{{ hoveredSkill.experience }}</span>
          </div>
          <div v-if="hoveredSkill.projects.length > 0" class="detail-row">
            <span class="detail-label">相关项目:</span>
            <div class="projects-list">
              <span
                v-for="project in hoveredSkill.projects"
                :key="project"
                class="project-tag"
              >
                {{ project }}
              </span>
            </div>
          </div>
        </div>
      </transition>

      <!-- Filtered Projects -->
      <transition name="slide-up">
        <div v-if="selectedSkill" class="filtered-projects">
          <div class="filter-header">
            <h3>使用 "{{ selectedSkill }}" 的项目</h3>
            <button class="clear-filter-btn" @click="clearFilter">
              清除筛选
            </button>
          </div>
          <div class="projects-grid">
            <div
              v-for="project in filteredProjects"
              :key="project"
              class="project-card"
            >
              <span class="project-icon">📁</span>
              <span class="project-name">{{ project }}</span>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue'
import { profileData } from '@/data/profile'
import type { Skill } from '@/types'
import { Skeleton } from '@/components/common'

// Lazy load heavy chart component
const SkillChart = defineAsyncComponent({
  loader: () => import('@/components/common/SkillChart.vue'),
  loadingComponent: Skeleton,
  delay: 200,
})

const chartType = ref<'bar' | 'radar'>('bar')
const hoveredSkill = ref<Skill | null>(null)
const selectedSkill = ref<string | null>(null)

// Group skills by category
const categories = computed(() => {
  const categoryMap: Record<
    string,
    { key: string; name: string; skills: Skill[] }
  > = {
    frontend: { key: 'frontend', name: '前端技能', skills: [] },
    backend: { key: 'backend', name: '后端技能', skills: [] },
    tools: { key: 'tools', name: '工具与其他', skills: [] },
    other: { key: 'other', name: '其他技能', skills: [] },
  }

  profileData.skills.forEach((skill) => {
    if (categoryMap[skill.category]) {
      categoryMap[skill.category].skills.push(skill)
    }
  })

  return Object.values(categoryMap).filter((cat) => cat.skills.length > 0)
})

// Get filtered projects based on selected skill
const filteredProjects = computed(() => {
  if (!selectedSkill.value) return []

  const skill = profileData.skills.find((s) => s.name === selectedSkill.value)
  return skill ? skill.projects : []
})

// Toggle skill filter
const toggleSkillFilter = (skillName: string) => {
  if (selectedSkill.value === skillName) {
    selectedSkill.value = null
  } else {
    selectedSkill.value = skillName
  }
}

// Clear filter
const clearFilter = () => {
  selectedSkill.value = null
}
</script>

<style scoped>
.skills-page {
  min-height: 100vh;
  padding: 6rem 2rem 4rem;
  position: relative;
  z-index: 1;
}

.skills-container {
  max-width: 1400px;
  margin: 0 auto;
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
  background: linear-gradient(
    135deg,
    var(--primary, #00d9ff),
    var(--secondary, #7b61ff)
  );
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

.chart-type-selector {
  display: flex;
  gap: 1rem;
  margin-bottom: 3rem;
  justify-content: center;
  animation: fadeIn 0.8s ease-out 0.2s both;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.chart-btn {
  padding: 0.75rem 2rem;
  background: rgba(21, 25, 50, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text-secondary, #a0aec0);
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.chart-btn:hover {
  border-color: var(--primary, #00d9ff);
  color: var(--text-primary, #ffffff);
}

.chart-btn.active {
  background: linear-gradient(
    135deg,
    rgba(0, 217, 255, 0.2),
    rgba(123, 97, 255, 0.2)
  );
  border-color: var(--primary, #00d9ff);
  color: var(--text-primary, #ffffff);
  box-shadow: 0 4px 16px rgba(0, 217, 255, 0.3);
}

.skills-categories {
  display: flex;
  flex-direction: column;
  gap: 4rem;
}

.category-section {
  opacity: 0;
  animation: fadeInUp 0.8s ease-out forwards;
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

.category-title {
  font-size: 2rem;
  font-weight: 600;
  color: var(--text-primary, #ffffff);
  margin: 0 0 2rem 0;
  position: relative;
  padding-left: 1.5rem;
}

.category-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 100%;
  background: linear-gradient(
    to bottom,
    var(--primary, #00d9ff),
    var(--secondary, #7b61ff)
  );
  border-radius: 2px;
}

.chart-wrapper {
  background: rgba(21, 25, 50, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  backdrop-filter: blur(10px);
}

.skill-tags {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.skill-tag {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: rgba(21, 25, 50, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0;
  animation: fadeInScale 0.5s ease-out forwards;
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.skill-tag:hover {
  background: rgba(21, 25, 50, 0.9);
  border-color: var(--primary, #00d9ff);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 217, 255, 0.3);
}

.skill-tag.active {
  background: linear-gradient(
    135deg,
    rgba(0, 217, 255, 0.2),
    rgba(123, 97, 255, 0.2)
  );
  border-color: var(--primary, #00d9ff);
  box-shadow: 0 4px 16px rgba(0, 217, 255, 0.3);
}

.skill-name {
  color: var(--text-primary, #ffffff);
  font-size: 1rem;
  font-weight: 500;
}

.skill-level {
  color: var(--primary, #00d9ff);
  font-weight: 600;
  font-size: 1rem;
}

.skill-detail-card {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  max-width: 400px;
  background: rgba(21, 25, 50, 0.95);
  border: 1px solid rgba(0, 217, 255, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 100;
}

.skill-detail-card h3 {
  margin: 0 0 1rem 0;
  color: var(--text-primary, #ffffff);
  font-size: 1.3rem;
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  color: var(--text-secondary, #a0aec0);
  font-size: 0.9rem;
  font-weight: 500;
}

.detail-value {
  color: var(--text-primary, #ffffff);
  font-size: 0.95rem;
}

.projects-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.project-tag {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: rgba(0, 217, 255, 0.1);
  border: 1px solid rgba(0, 217, 255, 0.3);
  border-radius: 4px;
  color: var(--primary, #00d9ff);
  font-size: 0.85rem;
}

.filtered-projects {
  margin-top: 3rem;
  padding: 2rem;
  background: rgba(21, 25, 50, 0.6);
  border: 1px solid rgba(0, 217, 255, 0.3);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.filter-header h3 {
  margin: 0;
  color: var(--text-primary, #ffffff);
  font-size: 1.5rem;
}

.clear-filter-btn {
  padding: 0.5rem 1.5rem;
  background: rgba(255, 107, 157, 0.2);
  border: 1px solid rgba(255, 107, 157, 0.3);
  border-radius: 6px;
  color: var(--accent, #ff6b9d);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.clear-filter-btn:hover {
  background: rgba(255, 107, 157, 0.3);
  border-color: var(--accent, #ff6b9d);
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.project-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: rgba(21, 25, 50, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.project-card:hover {
  background: rgba(21, 25, 50, 0.9);
  border-color: var(--primary, #00d9ff);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 217, 255, 0.2);
}

.project-icon {
  font-size: 1.5rem;
}

.project-name {
  color: var(--text-primary, #ffffff);
  font-size: 1rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

@media (max-width: 768px) {
  .skills-page {
    padding: 5rem 1rem 2rem;
  }

  .page-title {
    font-size: 2rem;
  }

  .page-subtitle {
    font-size: 1rem;
  }

  .chart-wrapper {
    padding: 1rem;
  }

  .skill-tags {
    grid-template-columns: 1fr;
  }

  .skill-detail-card {
    position: fixed;
    bottom: 1rem;
    left: 1rem;
    right: 1rem;
    max-width: none;
  }

  .filtered-projects {
    padding: 1rem;
  }

  .filter-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .projects-grid {
    grid-template-columns: 1fr;
  }
}
</style>
