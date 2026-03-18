<template>
  <div class="education-page">
    <div class="education-container">
      <!-- Page Header -->
      <div class="page-header">
        <h1 class="page-title">教育经历</h1>
        <p class="page-subtitle">Education Background</p>
      </div>

      <!-- Education Timeline -->
      <div v-if="timelineItems.length > 0" class="education-timeline">
        <Timeline :items="timelineItems" layout="vertical" />
      </div>

      <!-- Education Details -->
      <div
        v-for="edu in profileData.education"
        :key="edu.id"
        class="education-detail"
      >
        <!-- Honors Section -->
        <div v-if="edu.honors.length > 0" class="honors-section">
          <h3 class="section-title">荣誉与奖项</h3>
          <div class="honors-grid">
            <div
              v-for="(honor, index) in edu.honors"
              :key="index"
              class="honor-tag"
              :style="{ animationDelay: `${index * 0.1}s` }"
            >
              <span class="honor-icon">🏆</span>
              <span>{{ honor }}</span>
            </div>
          </div>
        </div>

        <!-- Courses Section -->
        <div v-if="edu.courses.length > 0" class="courses-section">
          <h3 class="section-title">主修课程成绩</h3>
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
          <div class="chart-wrapper">
            <CourseChart :courses="edu.courses" :type="chartType" />
          </div>

          <!-- Course List with Hover Details -->
          <div class="course-list">
            <div
              v-for="(course, index) in edu.courses"
              :key="index"
              class="course-item"
              :style="{ animationDelay: `${index * 0.05}s` }"
              @mouseenter="hoveredCourse = course"
              @mouseleave="hoveredCourse = null"
            >
              <span class="course-name">{{ course.name }}</span>
              <div class="course-score-bar">
                <div
                  class="course-score-fill"
                  :style="{ width: `${course.score}%` }"
                ></div>
              </div>
              <span class="course-score">{{ course.score }}</span>
            </div>
          </div>

          <!-- Hovered Course Details -->
          <transition name="fade">
            <div v-if="hoveredCourse" class="course-detail-card">
              <h4>{{ hoveredCourse.name }}</h4>
              <div class="detail-row">
                <span class="detail-label">成绩:</span>
                <span class="detail-value">{{ hoveredCourse.score }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">等级:</span>
                <span class="detail-value">{{ getGrade(hoveredCourse.score) }}</span>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue'
import Timeline from '@/components/common/Timeline.vue'
import { profileData } from '@/data/profile'
import type { TimelineItem, Course } from '@/types'
import { Skeleton } from '@/components/common'

// Lazy load heavy chart component
const CourseChart = defineAsyncComponent({
  loader: () => import('@/components/common/CourseChart.vue'),
  loadingComponent: Skeleton,
  delay: 200,
})

const chartType = ref<'bar' | 'radar'>('bar')
const hoveredCourse = ref<Course | null>(null)

// Convert education data to timeline items
const timelineItems = computed<TimelineItem[]>(() => {
  return profileData.education.map((edu) => ({
    id: edu.id,
    title: edu.school,
    subtitle: `${edu.college} - ${edu.major}`,
    period: edu.period,
    description: edu.rank,
    details: [],
  }))
})

// Get grade based on score
const getGrade = (score: number): string => {
  if (score >= 95) return '优秀 (A+)'
  if (score >= 90) return '优秀 (A)'
  if (score >= 85) return '良好 (B+)'
  if (score >= 80) return '良好 (B)'
  if (score >= 75) return '中等 (C+)'
  if (score >= 70) return '中等 (C)'
  if (score >= 60) return '及格 (D)'
  return '不及格 (F)'
}
</script>

<style scoped>
.education-page {
  min-height: 100vh;
  padding: 6rem 2rem 4rem;
  position: relative;
  z-index: 1;
}

.education-container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 4rem;
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

.education-timeline {
  margin-bottom: 4rem;
  animation: fadeIn 1s ease-out 0.3s both;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.education-detail {
  margin-bottom: 3rem;
}

.section-title {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--text-primary, #ffffff);
  margin: 0 0 2rem 0;
  position: relative;
  padding-left: 1.5rem;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 100%;
  background: linear-gradient(to bottom, var(--primary, #00d9ff), var(--secondary, #7b61ff));
  border-radius: 2px;
}

.honors-section {
  margin-bottom: 3rem;
  animation: fadeInUp 0.8s ease-out 0.5s both;
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

.honors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.honor-tag {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, rgba(0, 217, 255, 0.1), rgba(123, 97, 255, 0.1));
  border: 1px solid rgba(0, 217, 255, 0.2);
  border-radius: 8px;
  color: var(--text-primary, #ffffff);
  font-size: 0.95rem;
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

.honor-tag:hover {
  background: linear-gradient(135deg, rgba(0, 217, 255, 0.2), rgba(123, 97, 255, 0.2));
  border-color: var(--primary, #00d9ff);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 217, 255, 0.3);
}

.honor-icon {
  font-size: 1.2rem;
}

.courses-section {
  animation: fadeInUp 0.8s ease-out 0.7s both;
}

.chart-type-selector {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  justify-content: center;
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
  background: linear-gradient(135deg, rgba(0, 217, 255, 0.2), rgba(123, 97, 255, 0.2));
  border-color: var(--primary, #00d9ff);
  color: var(--text-primary, #ffffff);
  box-shadow: 0 4px 16px rgba(0, 217, 255, 0.3);
}

.chart-wrapper {
  background: linear-gradient(135deg, rgba(0, 217, 255, 0.05), rgba(123, 97, 255, 0.05));
  border: 1px solid rgba(0, 217, 255, 0.2);
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  backdrop-filter: blur(10px);
}

.course-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.course-item {
  display: grid;
  grid-template-columns: 2fr 3fr auto;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, rgba(0, 217, 255, 0.05), rgba(123, 97, 255, 0.05));
  border: 1px solid rgba(0, 217, 255, 0.1);
  border-radius: 8px;
  transition: all 0.3s ease;
  cursor: pointer;
  opacity: 0;
  animation: slideInRight 0.5s ease-out forwards;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.course-item:hover {
  background: linear-gradient(135deg, rgba(0, 217, 255, 0.15), rgba(123, 97, 255, 0.15));
  border-color: rgba(0, 217, 255, 0.3);
  transform: translateX(8px);
}

.course-name {
  color: var(--text-primary, #ffffff);
  font-size: 1rem;
}

.course-score-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.course-score-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary, #00d9ff), var(--secondary, #7b61ff));
  border-radius: 4px;
  transition: width 1s ease-out;
}

.course-score {
  color: var(--primary, #00d9ff);
  font-weight: 600;
  font-size: 1.1rem;
  min-width: 3rem;
  text-align: right;
}

.course-detail-card {
  position: sticky;
  bottom: 2rem;
  background: var(--bg-card);
  border: 1px solid rgba(0, 217, 255, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.course-detail-card h4 {
  margin: 0 0 1rem 0;
  color: var(--text-primary, #ffffff);
  font-size: 1.2rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  color: var(--text-secondary, #a0aec0);
  font-size: 0.95rem;
}

.detail-value {
  color: var(--primary, #00d9ff);
  font-weight: 600;
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

@media (max-width: 768px) {
  .education-page {
    padding: 5rem 1rem 2rem;
  }

  .page-title {
    font-size: 2rem;
  }

  .page-subtitle {
    font-size: 1rem;
  }

  .honors-grid {
    grid-template-columns: 1fr;
  }

  .chart-wrapper {
    padding: 1rem;
  }

  .course-item {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .course-score-bar {
    order: 3;
  }

  .course-score {
    text-align: left;
  }

  .course-detail-card {
    bottom: 1rem;
    padding: 1rem;
  }
}
</style>
