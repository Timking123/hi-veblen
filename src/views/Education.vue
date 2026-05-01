<template>
  <section class="education-page sci-section" aria-labelledby="education-title">
    <div class="sci-section-heading sci-section-heading--center">
      <p class="sci-eyebrow">ACADEMIC RECORD</p>
      <h1 id="education-title">学术数据库</h1>
      <p>以数据库记录方式展示教育背景、荣誉、课程成绩与知识结构。</p>
    </div>

    <div class="education-records">
      <article v-for="edu in profileData.education" :key="edu.id" class="sci-panel academic-card">
        <div class="academic-card__header">
          <p class="sci-eyebrow">{{ edu.period }}</p>
          <h2>{{ edu.school }}</h2>
          <p>{{ edu.college }} / {{ edu.major }}</p>
          <strong>{{ edu.rank }}</strong>
        </div>

        <div v-if="edu.honors.length" class="academic-card__section">
          <p class="sci-eyebrow">HONORS</p>
          <div class="identity-card__tags">
            <span v-for="honor in edu.honors" :key="honor" class="sci-chip">{{ honor }}</span>
          </div>
        </div>

        <div v-if="edu.courses.length" class="academic-card__section">
          <div class="matrix-projects__header">
            <p class="sci-eyebrow">COURSE MATRIX</p>
            <div class="chart-type-selector compact">
              <button :class="['sci-chip', { active: chartType === 'bar' }]" @click="chartType = 'bar'">BAR</button>
              <button :class="['sci-chip', { active: chartType === 'radar' }]" @click="chartType = 'radar'">RADAR</button>
            </div>
          </div>
          <div class="academic-chart sci-card">
            <CourseChart :courses="edu.courses" :type="chartType" />
          </div>
          <div class="course-matrix">
            <button
              v-for="course in edu.courses"
              :key="course.name"
              class="matrix-node"
              :style="{ '--level': `${course.score}%` }"
              @mouseenter="hoveredCourse = course"
              @mouseleave="hoveredCourse = null"
            >
              <span>{{ course.name }}</span>
              <strong>{{ course.score }} / {{ getGrade(course.score) }}</strong>
            </button>
          </div>
          <div v-if="hoveredCourse" class="sci-panel course-inspector">
            <span>{{ hoveredCourse.name }}</span>
            <strong>{{ hoveredCourse.score }} · {{ getGrade(hoveredCourse.score) }}</strong>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'
import { profileData } from '@/data/profile'
import type { Course } from '@/types'
import { Skeleton } from '@/components/common'

const CourseChart = defineAsyncComponent({
  loader: () => import('@/components/common/CourseChart.vue'),
  loadingComponent: Skeleton,
  delay: 200,
})

const chartType = ref<'bar' | 'radar'>('bar')
const hoveredCourse = ref<Course | null>(null)

const getGrade = (score: number): string => {
  if (score >= 95) return 'A+'
  if (score >= 90) return 'A'
  if (score >= 85) return 'B+'
  if (score >= 80) return 'B'
  if (score >= 75) return 'C+'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}
</script>
