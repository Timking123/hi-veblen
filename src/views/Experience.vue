<template>
  <div class="experience-page">
    <div class="experience-container">
      <!-- Page Header -->
      <div class="page-header">
        <h1 class="page-title">工作经历</h1>
        <p class="page-subtitle">Work Experience</p>
      </div>

      <!-- Experience Cards Timeline -->
      <div class="experience-timeline">
        <div
          v-for="(exp, index) in experiences"
          :key="exp.id"
          class="experience-card"
          :style="{ animationDelay: `${index * 0.2}s` }"
          :class="{ expanded: exp.expanded }"
          @click="toggleExpand(exp.id)"
        >
          <!-- Timeline Marker -->
          <div class="timeline-marker">
            <div class="timeline-dot"></div>
            <div v-if="index < experiences.length - 1" class="timeline-line"></div>
          </div>

          <!-- Card Content -->
          <div class="card-content">
            <!-- Card Header -->
            <div class="card-header">
              <div class="header-left">
                <h3 class="company-name">{{ exp.company }}</h3>
                <p class="position">{{ exp.position }}</p>
              </div>
              <div class="header-right">
                <span class="period">{{ exp.period }}</span>
                <button class="expand-btn" :class="{ rotated: exp.expanded }">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5 7.5L10 12.5L15 7.5"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Card Body (Collapsible) -->
            <transition name="expand">
              <div v-if="exp.expanded" class="card-body">
                <!-- Responsibilities -->
                <div class="responsibilities-section">
                  <h4 class="section-title">工作职责</h4>
                  <ul class="responsibilities-list">
                    <li
                      v-for="(resp, idx) in exp.responsibilities"
                      :key="idx"
                      :style="{ animationDelay: `${idx * 0.05}s` }"
                    >
                      {{ resp }}
                    </li>
                  </ul>
                </div>

                <!-- Achievements (if available) -->
                <div
                  v-if="exp.achievements && exp.achievements.length > 0"
                  class="achievements-section"
                >
                  <h4 class="section-title">关键成就</h4>
                  <div class="achievements-grid">
                    <div
                      v-for="(achievement, idx) in exp.achievements"
                      :key="idx"
                      class="achievement-card"
                      :style="{ animationDelay: `${idx * 0.1}s` }"
                    >
                      <div class="achievement-value">{{ achievement.value }}</div>
                      <div class="achievement-metric">{{ achievement.metric }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { profileData } from '@/data/profile'
import type { Experience } from '@/types'

// Add expanded property to experiences
interface ExpandableExperience extends Experience {
  expanded: boolean
}

const experiences = ref<ExpandableExperience[]>(
  profileData.experience.map((exp) => ({
    ...exp,
    expanded: false,
  }))
)

const toggleExpand = (id: string) => {
  const exp = experiences.value.find((e) => e.id === id)
  if (exp) {
    exp.expanded = !exp.expanded
  }
}
</script>

<style scoped>
.experience-page {
  min-height: 100vh;
  padding: 6rem 2rem 4rem;
  position: relative;
  overflow: hidden;
  z-index: 1;
}

.experience-container {
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
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

.experience-timeline {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.experience-card {
  display: flex;
  gap: 2rem;
  opacity: 0;
  animation: fadeInUp 0.6s ease-out forwards;
  cursor: pointer;
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

.timeline-marker {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  padding-top: 0.5rem;
}

.timeline-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary, #00d9ff), var(--secondary, #7b61ff));
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.5);
  transition: all 0.3s ease;
  z-index: 2;
}

.experience-card:hover .timeline-dot {
  transform: scale(1.3);
  box-shadow: 0 0 30px rgba(0, 217, 255, 0.8);
}

.timeline-line {
  width: 2px;
  flex: 1;
  min-height: 80px;
  background: linear-gradient(to bottom, rgba(0, 217, 255, 0.5), rgba(123, 97, 255, 0.3));
  margin-top: 0.5rem;
}

.card-content {
  flex: 1;
  background: linear-gradient(135deg, rgba(0, 217, 255, 0.08), rgba(123, 97, 255, 0.08));
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 217, 255, 0.2);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.experience-card:hover .card-content {
  background: linear-gradient(135deg, rgba(0, 217, 255, 0.15), rgba(123, 97, 255, 0.15));
  border-color: rgba(0, 217, 255, 0.4);
  box-shadow: 0 12px 40px rgba(0, 217, 255, 0.2);
  transform: translateY(-4px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 2rem;
  gap: 1rem;
}

.header-left {
  flex: 1;
}

.company-name {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary, #ffffff);
  margin: 0 0 0.5rem 0;
}

.position {
  font-size: 1.1rem;
  color: var(--primary, #00d9ff);
  margin: 0;
  font-weight: 500;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.period {
  font-size: 0.95rem;
  color: var(--text-secondary, #a0aec0);
  white-space: nowrap;
}

.expand-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 217, 255, 0.1);
  border: 1px solid rgba(0, 217, 255, 0.3);
  color: var(--primary, #00d9ff);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.expand-btn:hover {
  background: rgba(0, 217, 255, 0.2);
  transform: scale(1.1);
}

.expand-btn.rotated {
  transform: rotate(180deg);
}

.expand-btn.rotated:hover {
  transform: rotate(180deg) scale(1.1);
}

.card-body {
  padding: 0 2rem 2rem;
  animation: slideDown 0.4s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 1000px;
}

.section-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary, #ffffff);
  margin: 0 0 1rem 0;
  padding-left: 1rem;
  border-left: 3px solid var(--primary, #00d9ff);
}

.responsibilities-section {
  margin-bottom: 2rem;
}

.responsibilities-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.responsibilities-list li {
  font-size: 0.95rem;
  color: var(--text-secondary, #a0aec0);
  line-height: 1.6;
  padding-left: 1.5rem;
  position: relative;
  opacity: 0;
  animation: fadeInLeft 0.4s ease-out forwards;
}

@keyframes fadeInLeft {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.responsibilities-list li::before {
  content: '▹';
  position: absolute;
  left: 0;
  color: var(--primary, #00d9ff);
  font-weight: bold;
  font-size: 1.2rem;
}

.achievements-section {
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.achievement-card {
  background: rgba(0, 217, 255, 0.05);
  border: 1px solid rgba(0, 217, 255, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.3s ease;
  opacity: 0;
  animation: scaleIn 0.4s ease-out forwards;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.achievement-card:hover {
  background: rgba(0, 217, 255, 0.1);
  border-color: var(--primary, #00d9ff);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 217, 255, 0.2);
}

.achievement-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary, #00d9ff);
  margin-bottom: 0.5rem;
}

.achievement-metric {
  font-size: 0.9rem;
  color: var(--text-secondary, #a0aec0);
}

@media (max-width: 768px) {
  .experience-page {
    padding: 5rem 1rem 2rem;
  }

  .page-title {
    font-size: 2rem;
  }

  .page-subtitle {
    font-size: 1rem;
  }

  .experience-card {
    gap: 1rem;
  }

  .card-header {
    flex-direction: column;
    padding: 1.5rem;
  }

  .header-right {
    width: 100%;
    justify-content: space-between;
  }

  .card-body {
    padding: 0 1.5rem 1.5rem;
  }

  .company-name {
    font-size: 1.25rem;
  }

  .position {
    font-size: 1rem;
  }

  .achievements-grid {
    grid-template-columns: 1fr;
  }

  .experience-card:hover .card-content {
    transform: translateY(-2px);
  }
}
</style>
