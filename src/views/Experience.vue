<template>
  <section class="experience-page sci-section" aria-labelledby="experience-title">
    <div class="sci-section-heading sci-section-heading--center">
      <p class="sci-eyebrow">CAREER FLIGHT PATH</p>
      <h1 id="experience-title">任务航行日志</h1>
      <p>将工作经历转换为连续任务记录，突出职责、成果与业务价值。</p>
    </div>

    <div class="mission-timeline">
      <article
        v-for="(exp, index) in experiences"
        :key="exp.id"
        class="sci-card mission-card"
        :class="{ 'mission-card--expanded': exp.expanded }"
      >
        <button class="mission-card__header" type="button" @click="toggleExpand(exp.id)">
          <span class="mission-card__index">MISSION {{ String(index + 1).padStart(2, '0') }}</span>
          <span class="mission-card__main">
            <strong>{{ exp.company }}</strong>
            <small>{{ exp.position }} / {{ exp.period }}</small>
          </span>
          <span class="mission-card__toggle">{{ exp.expanded ? 'COLLAPSE' : 'EXPAND' }}</span>
        </button>

        <Transition name="expand">
          <div v-if="exp.expanded" class="mission-card__body">
            <div class="mission-card__section">
              <p class="sci-eyebrow">RESPONSIBILITIES</p>
              <ul class="sci-list">
                <li v-for="item in exp.responsibilities" :key="item">{{ item }}</li>
              </ul>
            </div>
            <div v-if="exp.achievements?.length" class="mission-card__metrics">
              <div v-for="achievement in exp.achievements" :key="achievement.metric" class="mission-metric">
                <strong>{{ achievement.value }}</strong>
                <span>{{ achievement.metric }}</span>
              </div>
            </div>
          </div>
        </Transition>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { profileData } from '@/data/profile'
import type { Experience } from '@/types'

interface ExpandableExperience extends Experience {
  expanded: boolean
}

const experiences = ref<ExpandableExperience[]>(profileData.experience.map((exp, index) => ({
  ...exp,
  expanded: index === 0,
})))

const toggleExpand = (id: string) => {
  const exp = experiences.value.find((item) => item.id === id)
  if (exp) exp.expanded = !exp.expanded
}
</script>
