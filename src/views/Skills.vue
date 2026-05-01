<template>
  <section class="matrix-page sci-section" aria-labelledby="matrix-title">
    <div class="sci-section-heading sci-section-heading--center">
      <p class="sci-eyebrow">CAPABILITY MATRIX</p>
      <h1 id="matrix-title">能力矩阵</h1>
      <p>技能不再作为标签堆叠，而是以系统节点展示熟练度、经验和项目关联。</p>
    </div>

    <div class="matrix-layout">
      <aside class="matrix-core sci-panel">
        <div class="matrix-core__orb"><span></span></div>
        <h2>{{ selectedSkill || 'HYJ CORE' }}</h2>
        <p v-if="activeSkill">{{ activeSkill.experience }}</p>
        <p v-else>悬停或点击任意技能节点，查看对应经验和项目链接。</p>
      </aside>

      <div class="matrix-groups">
        <section v-for="category in categories" :key="category.key" class="sci-card matrix-group">
          <p class="sci-eyebrow">{{ category.key }}</p>
          <h2>{{ category.name }}</h2>
          <div class="matrix-group__nodes">
            <button
              v-for="skill in category.skills"
              :key="skill.name"
              :class="['matrix-node', { active: selectedSkill === skill.name }]"
              :style="{ '--level': `${skill.level}%` }"
              @mouseenter="hoveredSkill = skill"
              @mouseleave="hoveredSkill = null"
              @click="toggleSkillFilter(skill.name)"
            >
              <span>{{ skill.name }}</span>
              <strong>{{ skill.level }}%</strong>
            </button>
          </div>
        </section>
      </div>
    </div>

    <section v-if="selectedSkill" class="sci-card matrix-projects">
      <div class="matrix-projects__header">
        <h2>关联项目 / {{ selectedSkill }}</h2>
        <button class="sci-chip" @click="clearFilter">CLEAR</button>
      </div>
      <div class="matrix-projects__list">
        <span v-for="project in filteredProjects" :key="project" class="sci-chip">{{ project }}</span>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { profileData } from '@/data/profile'
import type { Skill } from '@/types'

const hoveredSkill = ref<Skill | null>(null)
const selectedSkill = ref<string | null>(null)
const activeSkill = computed(() => hoveredSkill.value || profileData.skills.find((skill) => skill.name === selectedSkill.value) || null)

const categories = computed(() => {
  const categoryMap: Record<string, { key: string; name: string; skills: Skill[] }> = {
    frontend: { key: 'frontend', name: '前端核心', skills: [] },
    backend: { key: 'backend', name: '后端与接口', skills: [] },
    tools: { key: 'tools', name: '工具链', skills: [] },
    other: { key: 'other', name: '研究与业务', skills: [] },
  }
  profileData.skills.forEach((skill) => categoryMap[skill.category]?.skills.push(skill))
  return Object.values(categoryMap).filter((category) => category.skills.length > 0)
})

const filteredProjects = computed(() => {
  const skill = profileData.skills.find((item) => item.name === selectedSkill.value)
  return skill ? skill.projects : []
})

const toggleSkillFilter = (skillName: string) => {
  selectedSkill.value = selectedSkill.value === skillName ? null : skillName
}

const clearFilter = () => {
  selectedSkill.value = null
}
</script>
