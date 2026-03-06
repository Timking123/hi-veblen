<template>
  <div class="about">
    <!-- Main Content Section -->
    <section class="about-section">
      <div class="about-container">
        <!-- Left Column: Photo and Visual Elements -->
        <div class="about-left" :class="{ 'animate-slideInLeft': isVisible }">
          <div class="photo-wrapper">
            <div class="photo-glow"></div>
            <LazyImage 
              :src="profile.avatar" 
              :alt="profile.name" 
              img-class="profile-photo"
              width="100%"
              height="100%"
            />
          </div>

          <!-- Personal Traits Tags -->
          <div class="traits-section">
            <h3 class="section-subtitle">个人特质</h3>
            <div class="traits-tags">
              <span
                v-for="(trait, index) in personalTraits"
                :key="index"
                class="trait-tag"
                :style="{ animationDelay: `${0.1 + index * 0.05}s` }"
              >
                {{ trait }}
              </span>
            </div>
          </div>

          <!-- Hobbies/Interests -->
          <div class="hobbies-section">
            <h3 class="section-subtitle">兴趣爱好</h3>
            <div class="hobbies-grid">
              <div
                v-for="(hobby, index) in hobbies"
                :key="index"
                class="hobby-item"
                :style="{ animationDelay: `${0.2 + index * 0.05}s` }"
              >
                <span class="hobby-icon">{{ hobby.icon }}</span>
                <span class="hobby-name">{{ hobby.name }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Detailed Information -->
        <div class="about-right" :class="{ 'animate-slideInRight': isVisible }">
          <!-- Title -->
          <div class="about-header">
            <h1 class="about-title">关于我</h1>
            <div class="title-underline"></div>
          </div>

          <!-- Detailed Summary -->
          <div class="about-content">
            <h2 class="content-heading">个人简介</h2>
            <p class="content-text">{{ profile.summary }}</p>

            <!-- Career Philosophy -->
            <h2 class="content-heading">职业理念</h2>
            <div class="philosophy-section">
              <div v-for="(item, index) in careerPhilosophy" :key="index" class="philosophy-item">
                <div class="philosophy-icon">{{ item.icon }}</div>
                <div class="philosophy-content">
                  <h3 class="philosophy-title">{{ item.title }}</h3>
                  <p class="philosophy-text">{{ item.description }}</p>
                </div>
              </div>
            </div>

            <!-- Core Competencies -->
            <h2 class="content-heading">核心竞争力</h2>
            <div class="competencies-list">
              <div
                v-for="(competency, index) in coreCompetencies"
                :key="index"
                class="competency-item"
                :style="{ animationDelay: `${0.3 + index * 0.05}s` }"
              >
                <div class="competency-bullet"></div>
                <span class="competency-text">{{ competency }}</span>
              </div>
            </div>

            <!-- Career Goals -->
            <h2 class="content-heading">发展方向</h2>
            <p class="content-text">
              我期待加入一个充满活力和创新精神的团队，在前端技术领域持续深耕。希望能够参与有挑战性的项目，不断提升技术能力，同时也能够将自己的经验分享给团队，共同成长。我相信技术的价值在于解决实际问题，创造更好的用户体验，为产品和团队带来真正的价值。
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { profileData } from '@/data/profile'
import { LazyImage } from '@/components/common'

const profile = profileData
const isVisible = ref(false)

// Personal traits
const personalTraits = [
  '责任心强',
  '学习能力强',
  '注重细节',
  '团队协作',
  '积极主动',
  '追求卓越',
  '善于沟通',
  '问题解决',
]

// Hobbies with icons
const hobbies = [
  { icon: '💻', name: '编程' },
  { icon: '📚', name: '阅读' },
  { icon: '🎮', name: '游戏' },
  { icon: '🎵', name: '音乐' },
  { icon: '🏃', name: '运动' },
  { icon: '✈️', name: '旅行' },
]

// Career philosophy
const careerPhilosophy = [
  {
    icon: '🎯',
    title: '用户至上',
    description: '始终以用户体验为核心，追求产品的易用性和美观性，让技术真正服务于人。',
  },
  {
    icon: '🚀',
    title: '持续学习',
    description: '前端技术日新月异，保持学习热情，紧跟技术趋势，不断提升自己的技术深度和广度。',
  },
  {
    icon: '🤝',
    title: '团队协作',
    description: '相信团队的力量，善于沟通协作，乐于分享知识，与团队共同成长，创造更大价值。',
  },
  {
    icon: '💡',
    title: '创新思维',
    description: '勇于尝试新技术和新方法，用创新的思维解决问题，为项目带来更优的技术方案。',
  },
]

// Core competencies
const coreCompetencies = [
  '扎实的计算机理论基础和软件工程知识体系',
  '熟练掌握 Vue 3、React 等现代前端框架和生态',
  '具备全栈开发能力，了解前后端协作流程',
  '良好的代码规范意识和工程化实践经验',
  '优秀的问题分析和解决能力',
  '较强的学习能力和自驱力',
]

// Scroll animation trigger
const handleScroll = () => {
  const scrollY = window.scrollY
  if (scrollY > 50) {
    isVisible.value = true
  }
}

onMounted(() => {
  // Trigger animations on mount
  setTimeout(() => {
    isVisible.value = true
  }, 100)

  // Add scroll listener
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.about {
  width: 100%;
  min-height: 100vh;
  position: relative;
}

/* About Section */
.about-section {
  min-height: calc(100vh - 4rem);
  padding: var(--spacing-3xl) var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.about-container {
  max-width: 1400px;
  width: 100%;
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: var(--spacing-3xl);
  align-items: start;
}

/* Left Column */
.about-left {
  position: sticky;
  top: calc(4rem + var(--spacing-xl));
  opacity: 0;
}

.photo-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  margin-bottom: var(--spacing-2xl);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.photo-glow {
  position: absolute;
  inset: -20px;
  background: linear-gradient(135deg, var(--primary), var(--secondary), var(--accent));
  opacity: 0.3;
  filter: blur(30px);
  z-index: 0;
}

/* Profile photo styles - using :deep() to penetrate LazyImage component */
:deep(.profile-photo) {
  position: relative;
  width: 100%;
  height: 100%;
  object-fit: cover !important;  /* Ensure no distortion */
  object-position: center;       /* Center the image */
  border-radius: var(--radius-lg);
  border: 2px solid var(--border);
  z-index: 1;
  transition: transform var(--transition-base);
}

:deep(.profile-photo):hover {
  transform: scale(1.02);
}

/* Traits Section */
.traits-section {
  margin-bottom: var(--spacing-2xl);
}

.section-subtitle {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.section-subtitle::before {
  content: '';
  width: 4px;
  height: 1.25rem;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border-radius: 2px;
}

.traits-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.trait-tag {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-card);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 0.875rem;
  transition: all var(--transition-base);
  cursor: default;
  opacity: 0;
  animation: fadeInScale 0.5s forwards;
}

.trait-tag:hover {
  transform: translateY(-2px);
  border-color: var(--primary);
  color: var(--text-primary);
  box-shadow: 0 4px 12px rgba(0, 217, 255, 0.2);
}

/* Hobbies Section */
.hobbies-section {
  margin-bottom: var(--spacing-xl);
}

.hobbies-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
}

.hobby-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  background: var(--bg-card);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
  cursor: default;
  opacity: 0;
  animation: fadeInScale 0.5s forwards;
}

.hobby-item:hover {
  transform: translateY(-4px);
  border-color: var(--primary);
  box-shadow: 0 8px 16px rgba(0, 217, 255, 0.2);
}

.hobby-icon {
  font-size: 2rem;
}

.hobby-name {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Right Column */
.about-right {
  opacity: 0;
}

.about-header {
  margin-bottom: var(--spacing-2xl);
}

.about-title {
  font-size: clamp(2.5rem, 5vw, 3.5rem);
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin-bottom: var(--spacing-md);
}

.title-underline {
  width: 80px;
  height: 4px;
  background: linear-gradient(90deg, var(--primary), var(--secondary));
  border-radius: 2px;
}

/* Content */
.about-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2xl);
}

.content-heading {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--spacing-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.content-heading::before {
  content: '';
  width: 6px;
  height: 1.5rem;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border-radius: 3px;
}

.content-text {
  font-size: 1.125rem;
  line-height: 1.8;
  color: var(--text-secondary);
  text-align: justify;
}

/* Philosophy Section */
.philosophy-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.philosophy-item {
  display: flex;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  background: var(--bg-card);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
}

.philosophy-item:hover {
  transform: translateX(8px);
  border-color: var(--primary);
  box-shadow: 0 4px 16px rgba(0, 217, 255, 0.2);
}

.philosophy-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.philosophy-content {
  flex: 1;
}

.philosophy-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.philosophy-text {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text-secondary);
}

/* Competencies List */
.competencies-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.competency-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--bg-card);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
  opacity: 0;
  animation: fadeInUp 0.5s forwards;
}

.competency-item:hover {
  transform: translateX(8px);
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(0, 217, 255, 0.2);
}

.competency-bullet {
  width: 8px;
  height: 8px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border-radius: 50%;
  flex-shrink: 0;
}

.competency-text {
  font-size: 1rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .about-container {
    grid-template-columns: 1fr;
    gap: var(--spacing-2xl);
  }

  .about-left {
    position: relative;
    top: 0;
    max-width: 500px;
    margin: 0 auto;
  }

  .photo-wrapper {
    max-width: 300px;
    margin: 0 auto var(--spacing-2xl);
  }
}

@media (max-width: 768px) {
  .about-section {
    padding: var(--spacing-2xl) var(--spacing-md);
  }

  .about-container {
    gap: var(--spacing-xl);
  }

  .hobbies-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .philosophy-item {
    flex-direction: column;
    text-align: center;
  }

  .philosophy-icon {
    font-size: 2rem;
  }

  .content-text {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .about-title {
    font-size: 2rem;
  }

  .content-heading {
    font-size: 1.25rem;
  }

  .traits-tags {
    gap: var(--spacing-xs);
  }

  .trait-tag {
    font-size: 0.75rem;
    padding: var(--spacing-xs) var(--spacing-sm);
  }

  .hobbies-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-sm);
  }

  .hobby-item {
    padding: var(--spacing-sm);
  }

  .hobby-icon {
    font-size: 1.5rem;
  }

  .hobby-name {
    font-size: 0.75rem;
  }
}
</style>
