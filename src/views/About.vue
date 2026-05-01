<template>
  <section class="identity-page sci-section" aria-labelledby="identity-title">
    <div class="identity-layout">
      <aside class="identity-card sci-panel">
        <div class="identity-card__portrait">
          <LazyImage :src="profile.avatar" :alt="profile.name" img-class="identity-card__image" />
        </div>
        <p class="sci-eyebrow">SUBJECT</p>
        <h1 id="identity-title">{{ profile.name }}</h1>
        <p>{{ profile.title }}</p>
        <div class="identity-card__tags">
          <span v-for="trait in personalTraits" :key="trait" class="sci-chip">{{ trait }}</span>
        </div>
      </aside>

      <div class="identity-content">
        <section class="sci-card">
          <p class="sci-eyebrow">IDENTITY ARCHIVE</p>
          <h2>个人简介</h2>
          <p>{{ profile.summary }}</p>
        </section>

        <section class="sci-grid sci-grid--2">
          <article v-for="item in careerPhilosophy" :key="item.title" class="sci-card">
            <span class="identity-content__icon">{{ item.icon }}</span>
            <h3>{{ item.title }}</h3>
            <p>{{ item.description }}</p>
          </article>
        </section>

        <section class="sci-card">
          <p class="sci-eyebrow">CORE COMPETENCE</p>
          <h2>核心竞争力</h2>
          <ul class="sci-list">
            <li v-for="item in coreCompetencies" :key="item">{{ item }}</li>
          </ul>
        </section>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { profileData } from '@/data/profile'
import { LazyImage } from '@/components/common'

const profile = profileData
const personalTraits = ['责任心强', '学习能力强', '注重细节', '团队协作', '积极主动', '需求洞察', '视觉执行', '问题解决']
const careerPhilosophy = [
  { icon: '◎', title: '用户至上', description: '始终以用户体验为核心，让技术服务真实业务场景。' },
  { icon: '△', title: '持续学习', description: '保持对 Vue 生态、AI 工具与视觉交互的探索热情。' },
  { icon: '◇', title: '团队协作', description: '善于需求评审、接口联调、质量保障与跨角色沟通。' },
  { icon: '✦', title: '创新思维', description: '用数字艺术、数据可视化和工程能力创造差异化体验。' },
]
const coreCompetencies = [
  '扎实的软件工程基础与现代前端工程化能力',
  '熟练掌握 Vue 3、TypeScript、Pinia、Vue Router 与 ECharts',
  '具备从 UI 视觉设计到业务功能落地的全流程执行能力',
  '拥有 B 端行业研究、需求分析和多企业调研经验',
  '能将视觉审美、交互设计与工程实现融合为完整产品体验',
]
</script>
