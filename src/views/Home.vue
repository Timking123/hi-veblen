<template>
  <div class="home">
    <!-- 阅读进度条 - 需求 8.2, 8.3 -->
    <ReadingProgress />
    
    <!-- 键盘快捷键提示 - 需求 8.6 -->
    <Transition name="toast">
      <div v-if="keyboardHint" class="keyboard-hint" role="status" aria-live="polite">
        {{ keyboardHint }}
      </div>
    </Transition>
    
    <!-- Hero Section -->
    <section class="hero-section" aria-labelledby="hero-heading">
      <div class="hero-content">
        <!-- 个性化问候语 - 需求 8.1 -->
        <div ref="greetingRef" class="greeting-message" style="opacity: 0">
          <span class="greeting-icon">{{ greetingIcon }}</span>
          <span class="greeting-text">{{ greeting }}，欢迎访问我的个人网站</span>
        </div>
        
        <!-- Avatar with interactive effect -->
        <div ref="heroAvatar" class="hero-avatar-wrapper" style="opacity: 0">
          <div class="avatar-glow"></div>
          <img 
            :src="profile.avatar" 
            :alt="`${profile.name}的头像`"
            class="hero-avatar"
            @click="handleAvatarClick"
            @error="handleImageError"
            style="cursor: pointer;"
          />
        </div>

        <!-- Name with gradient effect -->
        <h1 id="hero-heading" ref="heroName" class="hero-name" style="opacity: 0">
          {{ profile.name }}
        </h1>

        <!-- Job Intentions with typing effect -->
        <div ref="heroSubtitle" class="hero-subtitle" style="opacity: 0" role="doc-subtitle">
          <span class="typing-text">{{ typingText }}</span>
          <span class="cursor">|</span>
        </div>

        <!-- Summary -->
        <p ref="heroSummary" class="hero-summary" style="opacity: 0">
          {{ profile.summary }}
        </p>

        <!-- Core Skills Tag Cloud with interactive hover -->
        <div ref="skillsCloud" class="skills-cloud" style="opacity: 0" role="list" aria-label="核心技能">
          <span
            v-for="(skill, index) in coreSkills"
            :key="skill.name"
            class="skill-tag"
            :style="{ animationDelay: `${index * 0.1}s` }"
            role="listitem"
            @mouseenter="handleSkillHover(skill)"
          >
            <span class="skill-icon">{{ getSkillIcon(skill.name) }}</span>
            {{ skill.name }}
            <span class="skill-level">{{ skill.level }}%</span>
          </span>
        </div>

        <!-- CTA Buttons -->
        <div ref="ctaButtons" class="cta-buttons" style="opacity: 0">
          <button 
            class="btn btn-primary" 
            @click="viewResume"
            aria-label="查看简历并下载"
          >
            <span class="btn-icon">📄</span>
            <span>查看简历</span>
          </button>
          <button 
            class="btn btn-secondary" 
            @click="contactMe"
            aria-label="前往联系方式页面"
          >
            <span class="btn-icon">✉️</span>
            <span>联系我</span>
          </button>
        </div>
      </div>

      <!-- Scroll Indicator -->
      <div 
        ref="scrollIndicator" 
        class="scroll-indicator" 
        style="opacity: 0"
        @click="scrollToNext"
        role="button"
        tabindex="0"
        aria-label="向下滚动查看更多内容"
      >
        <div class="scroll-arrow"></div>
        <span class="scroll-text">向下滚动</span>
      </div>
    </section>

    <!-- Highlights Section -->
    <section ref="highlightsSection" class="highlights-section" style="opacity: 0">
      <h2 class="section-title">核心亮点</h2>
      <div class="highlights-grid">
        <div 
          v-for="(highlight, index) in highlights" 
          :key="index"
          class="highlight-card"
          :style="{ animationDelay: `${index * 0.15}s` }"
        >
          <div class="highlight-icon">{{ highlight.icon }}</div>
          <h3 class="highlight-title">{{ highlight.title }}</h3>
          <p class="highlight-desc">{{ highlight.description }}</p>
          <div class="highlight-stats">
            <span class="stat-value">{{ highlight.stat }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Interactive Stats Section -->
    <section ref="statsSection" class="stats-section" style="opacity: 0">
      <h2 class="section-title">数据概览</h2>
      <div class="stats-grid">
        <div 
          v-for="(stat, index) in stats" 
          :key="index"
          class="stat-card"
          @mouseenter="animateStat(index)"
        >
          <div class="stat-icon">{{ stat.icon }}</div>
          <div class="stat-number" :ref="el => statRefs[index] = el">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </div>
    </section>

    <!-- Interests Section -->
    <section ref="interestsSection" class="interests-section" style="opacity: 0">
      <h2 class="section-title">兴趣爱好</h2>
      <p class="section-subtitle">工作之余，我也热衷于探索生活的多样性</p>
      <div class="interests-grid">
        <div 
          v-for="(interest, index) in interests" 
          :key="index"
          class="interest-card"
          :class="{ active: activeInterest === index }"
          @click="setActiveInterest(index)"
        >
          <div class="interest-icon-wrapper">
            <span class="interest-icon">{{ interest.icon }}</span>
          </div>
          <h3 class="interest-title">{{ interest.title }}</h3>
          <p class="interest-desc">{{ interest.description }}</p>
          <div v-if="activeInterest === index" class="interest-detail">
            <p>{{ interest.detail }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Quick Links Section -->
    <section ref="quickLinksSection" class="quick-links-section" style="opacity: 0">
      <h2 class="section-title">快速导航</h2>
      <div class="quick-links-grid">
        <router-link 
          v-for="link in quickLinks" 
          :key="link.path"
          :to="link.path"
          class="quick-link-card"
        >
          <div class="link-icon">{{ link.icon }}</div>
          <h3 class="link-title">{{ link.title }}</h3>
          <p class="link-desc">{{ link.description }}</p>
          <span class="link-arrow">→</span>
        </router-link>
      </div>
    </section>

    <!-- Footer with ICP License - 备案号页脚 -->
    <footer ref="footerSection" class="site-footer" style="opacity: 0">
      <div class="footer-content">
        <p class="icp-license">
          <a 
            href="https://beian.miit.gov.cn/" 
            target="_blank" 
            rel="noopener noreferrer"
            class="icp-link"
          >
            粤ICP备2026024503号-1
          </a>
        </p>
        <p class="copyright">
          © {{ currentYear }} {{ profile.name }}. All rights reserved.
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { profileData } from '@/data/profile'
import { useScrollAnimation } from '@/composables/useScroll'
import { useSEO } from '@/composables/useSEO'
import { useEasterEggTrigger } from '@/composables/useEasterEggTrigger'
import { useEasterEggStore } from '@/stores/easterEgg'
// 个性化功能 - 需求 8.1-8.6
import { useGreeting } from '@/composables/useGreeting'
import { useKeyboardNavigation } from '@/composables/useKeyboardNavigation'
import ReadingProgress from '@/components/common/ReadingProgress.vue'

const router = useRouter()
const profile = profileData
const easterEggStore = useEasterEggStore()

// ========== 个性化功能 ==========

// 问候语 - 需求 8.1
const { greeting } = useGreeting()

// 根据问候语返回对应的图标
const greetingIcon = computed(() => {
  const greetingValue = greeting.value
  if (greetingValue === '早上好') return '🌅'
  if (greetingValue === '下午好') return '☀️'
  if (greetingValue === '晚上好') return '🌆'
  return '🌙' // 夜深了
})

// 键盘快捷键提示 - 需求 8.6
const keyboardHint = ref<string | null>(null)
let hintTimer: number | null = null

/**
 * 显示键盘快捷键提示
 * @param message - 提示消息
 */
const showKeyboardHint = (message: string) => {
  // 清除之前的定时器
  if (hintTimer) {
    clearTimeout(hintTimer)
  }
  keyboardHint.value = message
  // 2秒后自动隐藏
  hintTimer = window.setTimeout(() => {
    keyboardHint.value = null
  }, 2000)
}

// 键盘导航 - 需求 8.4, 8.5
const navigationRoutes = ['/', '/education', '/experience', '/skills', '/projects', '/contact']
const routeNames: Record<string, string> = {
  '/': '首页',
  '/education': '教育经历',
  '/experience': '工作经历',
  '/skills': '技能展示',
  '/projects': '项目展示',
  '/contact': '联系方式',
}

useKeyboardNavigation({
  routes: navigationRoutes,
  enableNumberKeys: true,
  enableArrowKeys: true,
  onNavigate: (route) => {
    const routeName = routeNames[route] || route
    showKeyboardHint(`⌨️ 导航到: ${routeName}`)
  },
})

// 监听 Escape 键提示
const handleEscapeHint = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    showKeyboardHint('⌨️ 返回上一页')
  }
}

// 问候语动画 ref
const greetingRef = ref<HTMLElement | null>(null)

// Easter Egg Trigger
const { handleAvatarClick, setTriggerCallback } = useEasterEggTrigger()

// 设置彩蛋触发回调
setTriggerCallback(() => {
  easterEggStore.enterCollapseAnimation()
})

// SEO Meta Tags
useSEO({
  title: `${profile.name} - ${profile.jobIntentions.join(' / ')}`,
  description: profile.summary,
  keywords: `${profile.name},${profile.jobIntentions.join(',')},${profile.skills.slice(0, 10).map(s => s.name).join(',')}`,
  ogTitle: `${profile.name} - 个人求职网站`,
  ogDescription: profile.summary,
  ogType: 'profile',
})

// Refs for scroll animations
const heroAvatar = ref<HTMLElement | null>(null)
const heroName = ref<HTMLElement | null>(null)
const heroSubtitle = ref<HTMLElement | null>(null)
const heroSummary = ref<HTMLElement | null>(null)
const skillsCloud = ref<HTMLElement | null>(null)
const ctaButtons = ref<HTMLElement | null>(null)
const scrollIndicator = ref<HTMLElement | null>(null)
const highlightsSection = ref<HTMLElement | null>(null)
const statsSection = ref<HTMLElement | null>(null)
const interestsSection = ref<HTMLElement | null>(null)
const quickLinksSection = ref<HTMLElement | null>(null)
const footerSection = ref<HTMLElement | null>(null)

// 当前年份
const currentYear = new Date().getFullYear()

// Apply scroll animations
useScrollAnimation(greetingRef, { animationClass: 'animate-fadeInUp', threshold: 0.1 })
useScrollAnimation(heroAvatar, { animationClass: 'animate-fadeInScale', threshold: 0.1 })
useScrollAnimation(heroName, { animationClass: 'animate-fadeInUp', threshold: 0.1 })
useScrollAnimation(heroSubtitle, { animationClass: 'animate-fadeInUp', threshold: 0.1 })
useScrollAnimation(heroSummary, { animationClass: 'animate-fadeInUp', threshold: 0.1 })
useScrollAnimation(skillsCloud, { animationClass: 'animate-fadeInScale', threshold: 0.1 })
useScrollAnimation(ctaButtons, { animationClass: 'animate-fadeInUp', threshold: 0.1 })
useScrollAnimation(scrollIndicator, { animationClass: 'animate-fadeIn', threshold: 0.1 })
useScrollAnimation(highlightsSection, { animationClass: 'animate-fadeInUp', threshold: 0.2 })
useScrollAnimation(statsSection, { animationClass: 'animate-fadeInUp', threshold: 0.2 })
useScrollAnimation(interestsSection, { animationClass: 'animate-fadeInUp', threshold: 0.2 })
useScrollAnimation(quickLinksSection, { animationClass: 'animate-fadeInUp', threshold: 0.2 })
useScrollAnimation(footerSection, { animationClass: 'animate-fadeInUp', threshold: 0.2 })

// Typing effect
const typingText = ref('')
const fullText = profile.jobIntentions.join(' / ')
let typingIndex = 0
let typingTimer: number | null = null

const startTyping = () => {
  if (typingIndex < fullText.length) {
    typingText.value += fullText[typingIndex]
    typingIndex++
    typingTimer = window.setTimeout(startTyping, 100)
  }
}

onMounted(() => {
  setTimeout(startTyping, 500)
  // 添加 Escape 键监听 - 需求 8.6
  window.addEventListener('keydown', handleEscapeHint)
})

onUnmounted(() => {
  if (typingTimer) {
    clearTimeout(typingTimer)
  }
  if (hintTimer) {
    clearTimeout(hintTimer)
  }
  window.removeEventListener('keydown', handleEscapeHint)
})

// Get core skills
const coreSkills = computed(() => {
  return profile.skills
    .filter(skill => skill.category === 'frontend')
    .sort((a, b) => b.level - a.level)
    .slice(0, 8)
})

// Skill icons mapping
const getSkillIcon = (skillName: string): string => {
  const iconMap: Record<string, string> = {
    'Vue.js': '🎯',
    'TypeScript': '📘',
    'ECharts': '📊',
    'JavaScript': '⚡',
    'HTML5/CSS3': '🎨',
    'TailwindCSS': '🌊',
    'Vite': '⚙️',
    'UI/UX 设计': '✨',
  }
  return iconMap[skillName] || '💻'
}

// Handle skill hover
const handleSkillHover = (skill: any) => {
  console.log('Hovered skill:', skill.name)
}

// Highlights data
const highlights = [
  {
    icon: '🎓',
    title: '学业优异',
    description: '软件工程专业，年级排名前10%',
    stat: 'Top 10%'
  },
  {
    icon: '💼',
    title: '实战经验',
    description: '香港城市大学深圳研究院前端开发',
    stat: '1.5年+'
  },
  {
    icon: '🔍',
    title: '行业洞察',
    description: '调研20+家科技企业，具备B端业务视野',
    stat: '20+ 企业'
  },
  {
    icon: '🚀',
    title: '技术栈',
    description: 'Vue 3 + ECharts + TypeScript 全栈开发',
    stat: '全栈'
  }
]

// Stats data
const stats = [
  { icon: '💻', value: '15+', label: '项目经验' },
  { icon: '🛠️', value: '20+', label: '技术栈' },
  { icon: '📈', value: '98', label: '最高课程分' },
  { icon: '🏆', value: '多项', label: '荣誉奖项' }
]

const statRefs = ref<any[]>([])

const animateStat = (index: number) => {
  const el = statRefs.value[index] as HTMLElement | null
  if (el) {
    el.style.transform = 'scale(1.2)'
    setTimeout(() => {
      el.style.transform = 'scale(1)'
    }, 300)
  }
}

// Interests data
const interests = [
  {
    icon: '💻',
    title: '开源贡献',
    description: '热衷于参与开源项目',
    detail: '积极参与 GitHub 开源社区，贡献代码，学习最新技术趋势，与全球开发者交流协作。'
  },
  {
    icon: '📚',
    title: '技术阅读',
    description: '持续学习新技术',
    detail: '定期阅读技术博客、官方文档和技术书籍，关注前端领域的最新动态和最佳实践。'
  },
  {
    icon: '🎮',
    title: '游戏娱乐',
    description: '放松身心的方式',
    detail: '通过游戏放松心情，同时也从游戏设计中学习用户体验和交互设计的理念。'
  },
  {
    icon: '🎵',
    title: '音乐欣赏',
    description: '编程时的灵感来源',
    detail: '喜欢在编程时听音乐，音乐能帮助我保持专注，激发创造力和灵感。'
  },
  {
    icon: '🏃',
    title: '四处旅行',
    description: '满足内心的好奇',
    detail: '有空时到不同的地方旅行，探索未知的事物，为高效工作提供充沛的精力。'
  },
  {
    icon: '✍️',
    title: '文学写作',
    description: '保持思考与创作',
    detail: '喜欢写些小说，在生活通过创作延续思考的火花，使工作时始终能保持清醒的大脑。'
  }
]

const activeInterest = ref<number | null>(null)

const setActiveInterest = (index: number) => {
  activeInterest.value = activeInterest.value === index ? null : index
}

// Quick links
const quickLinks = [
  {
    path: '/education',
    icon: '🎓',
    title: '教育经历',
    description: '查看我的学习背景和课程成绩'
  },
  {
    path: '/experience',
    icon: '💼',
    title: '工作经历',
    description: '了解我的工作经验和项目成果'
  },
  {
    path: '/skills',
    icon: '🛠️',
    title: '技能展示',
    description: '探索我的技术栈和专业能力'
  },
  {
    path: '/contact',
    icon: '📧',
    title: '联系方式',
    description: '获取我的联系方式和简历下载'
  }
]

// Handle image error
const handleImageError = (e: Event) => {
  const target = e.target as HTMLImageElement
  target.src = '/vite.svg' // Fallback image
}

// CTA button handlers
const viewResume = () => {
  router.push('/contact')
}

const contactMe = () => {
  router.push('/contact')
}

// Scroll to next section
const scrollToNext = () => {
  highlightsSection.value?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<style scoped>
.home {
  width: 100%;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}

/* Hero Section */
.hero-section {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl) var(--spacing-lg);
  position: relative;
}

.hero-content {
  max-width: 1200px;
  width: 100%;
  text-align: center;
  z-index: 1;
}

/* Hero Avatar */
.hero-avatar-wrapper {
  position: relative;
  width: 180px;
  height: 180px;
  margin: 0 auto var(--spacing-xl);
  opacity: 0;
}

.avatar-glow {
  position: absolute;
  inset: -10px;
  background: linear-gradient(135deg, var(--primary), var(--secondary), var(--accent));
  border-radius: 50%;
  filter: blur(20px);
  opacity: 0.6;
  animation: pulse 3s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

.hero-avatar {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover !important;  /* Ensure no distortion - crop to fit */
  object-position: center top;   /* Start cropping from the top of the image */
  border: 4px solid var(--bg-primary);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  transition: transform var(--transition-base);
}

.hero-avatar:hover {
  transform: scale(1.05) rotate(5deg);
}

/* Hero Name */
.hero-name {
  font-size: clamp(2.5rem, 7vw, 5rem);
  font-weight: 800;
  margin: 0 0 var(--spacing-lg);
  background: linear-gradient(135deg, var(--primary), var(--secondary), var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  opacity: 0;
  letter-spacing: -0.02em;
}

/* Job Intentions with Typing Effect */
.hero-subtitle {
  font-size: clamp(1.25rem, 3vw, 1.75rem);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xl);
  opacity: 0;
  min-height: 2.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.25rem;
}

.typing-text {
  font-weight: 500;
}

.cursor {
  animation: blink 1s infinite;
  color: var(--primary);
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* Summary */
.hero-summary {
  font-size: clamp(0.95rem, 2vw, 1.1rem);
  line-height: 1.8;
  color: var(--text-secondary);
  max-width: 900px;
  margin: 0 auto var(--spacing-2xl);
  opacity: 0;
}

/* Skills Cloud */
.skills-cloud {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-2xl);
  opacity: 0;
}

.skill-tag {
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--bg-card);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 500;
  transition: all var(--transition-base);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  animation: fadeInScale 0.5s ease-out forwards;
  opacity: 0;
}

@keyframes fadeInScale {
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.skill-icon {
  font-size: 1.1rem;
}

.skill-level {
  font-size: 0.75rem;
  color: var(--primary);
  font-weight: 600;
}

.skill-tag:hover {
  transform: translateY(-4px) scale(1.08);
  border-color: var(--primary);
  box-shadow: 0 0 25px rgba(0, 217, 255, 0.4);
  background: rgba(0, 217, 255, 0.15);
}

/* CTA Buttons */
.cta-buttons {
  display: flex;
  gap: var(--spacing-lg);
  justify-content: center;
  flex-wrap: wrap;
  opacity: 0;
}

.btn {
  padding: var(--spacing-md) var(--spacing-2xl);
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all var(--transition-base);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.btn-icon {
  font-size: 1.2rem;
}

.btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.btn:hover::before {
  width: 300px;
  height: 300px;
}

.btn span {
  position: relative;
  z-index: 1;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: var(--text-primary);
  box-shadow: 0 4px 16px rgba(0, 217, 255, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 217, 255, 0.4);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 2px solid var(--primary);
}

.btn-secondary:hover {
  background: rgba(0, 217, 255, 0.1);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 217, 255, 0.2);
}

.btn-secondary:active {
  transform: translateY(0);
}

/* Scroll Indicator */
.scroll-indicator {
  position: absolute;
  bottom: var(--spacing-2xl);
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  transition: all var(--transition-base);
}

.scroll-indicator:hover {
  transform: translateX(-50%) translateY(-5px);
}

.scroll-arrow {
  width: 24px;
  height: 40px;
  border: 2px solid var(--primary);
  border-radius: 12px;
  position: relative;
}

.scroll-arrow::before {
  content: '';
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 6px;
  background: var(--primary);
  border-radius: 50%;
  animation: scrollDown 2s infinite;
}

.scroll-text {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

@keyframes scrollDown {
  0% {
    top: 8px;
    opacity: 1;
  }
  100% {
    top: 24px;
    opacity: 0;
  }
}

/* Section Styles */
.highlights-section,
.stats-section,
.interests-section,
.quick-links-section {
  padding: var(--spacing-3xl) var(--spacing-lg);
  max-width: 1200px;
  margin: 0 auto;
  opacity: 0;
}

.section-title {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 700;
  text-align: center;
  margin-bottom: var(--spacing-md);
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.section-subtitle {
  text-align: center;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-2xl);
  font-size: 1.1rem;
}

/* Highlights Grid */
.highlights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-xl);
  margin-top: var(--spacing-2xl);
}

.highlight-card {
  background: var(--bg-card);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  text-align: center;
  transition: all var(--transition-base);
  animation: fadeInUp 0.6s ease-out forwards;
  opacity: 0;
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.highlight-card:hover {
  transform: translateY(-8px);
  border-color: var(--primary);
  box-shadow: 0 8px 32px rgba(0, 217, 255, 0.2);
}

.highlight-icon {
  font-size: 3rem;
  margin-bottom: var(--spacing-md);
}

.highlight-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: var(--spacing-sm);
  color: var(--text-primary);
}

.highlight-desc {
  color: var(--text-secondary);
  margin-bottom: var(--spacing-md);
  line-height: 1.6;
}

.highlight-stats {
  margin-top: var(--spacing-md);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-xl);
  margin-top: var(--spacing-2xl);
}

.stat-card {
  background: var(--bg-card);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  text-align: center;
  transition: all var(--transition-base);
  cursor: pointer;
}

.stat-card:hover {
  transform: translateY(-5px);
  border-color: var(--secondary);
  box-shadow: 0 8px 32px rgba(123, 97, 255, 0.2);
}

.stat-icon {
  font-size: 2.5rem;
  margin-bottom: var(--spacing-md);
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: var(--spacing-sm);
  transition: transform 0.3s ease;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* Interests Grid */
.interests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-xl);
  margin-top: var(--spacing-2xl);
}

.interest-card {
  background: var(--bg-card);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  text-align: center;
  transition: all var(--transition-base);
  cursor: pointer;
}

.interest-card:hover {
  transform: translateY(-5px);
  border-color: var(--accent);
}

.interest-card.active {
  border-color: var(--primary);
  box-shadow: 0 8px 32px rgba(0, 217, 255, 0.3);
  background: rgba(0, 217, 255, 0.05);
}

.interest-icon-wrapper {
  margin-bottom: var(--spacing-md);
}

.interest-icon {
  font-size: 3rem;
  display: inline-block;
  transition: transform var(--transition-base);
}

.interest-card:hover .interest-icon {
  transform: scale(1.2) rotate(10deg);
}

.interest-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: var(--spacing-sm);
  color: var(--text-primary);
}

.interest-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.6;
}

.interest-detail {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.7;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Quick Links Grid */
.quick-links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-xl);
  margin-top: var(--spacing-2xl);
}

.quick-link-card {
  background: var(--bg-card);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  text-decoration: none;
  transition: all var(--transition-base);
  position: relative;
  overflow: hidden;
}

.quick-link-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0, 217, 255, 0.1), transparent);
  transition: left 0.5s;
}

.quick-link-card:hover::before {
  left: 100%;
}

.quick-link-card:hover {
  transform: translateY(-5px);
  border-color: var(--primary);
  box-shadow: 0 8px 32px rgba(0, 217, 255, 0.2);
}

.link-icon {
  font-size: 2.5rem;
  margin-bottom: var(--spacing-md);
}

.link-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: var(--spacing-sm);
  color: var(--text-primary);
}

.link-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: var(--spacing-md);
}

.link-arrow {
  font-size: 1.5rem;
  color: var(--primary);
  transition: transform var(--transition-base);
  display: inline-block;
}

.quick-link-card:hover .link-arrow {
  transform: translateX(5px);
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero-section {
    padding: var(--spacing-xl) var(--spacing-md);
    min-height: 100vh;
  }

  .hero-avatar-wrapper {
    width: 140px;
    height: 140px;
  }

  .hero-subtitle {
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .skills-cloud {
    gap: var(--spacing-sm);
  }

  .skill-tag {
    font-size: 0.75rem;
    padding: var(--spacing-xs) var(--spacing-md);
  }

  .cta-buttons {
    flex-direction: column;
    width: 100%;
    max-width: 300px;
    margin: 0 auto;
  }

  .btn {
    width: 100%;
  }

  .highlights-section,
  .stats-section,
  .interests-section,
  .quick-links-section {
    padding: var(--spacing-2xl) var(--spacing-md);
  }

  .highlights-grid,
  .stats-grid,
  .interests-grid,
  .quick-links-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .hero-summary {
    font-size: 0.9rem;
  }

  .section-title {
    font-size: 1.75rem;
  }
}

/* ========== 个性化功能样式 - 需求 8.1-8.6 ========== */

/* 问候语样式 - 需求 8.1 */
.greeting-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xl);
  font-size: clamp(1rem, 2.5vw, 1.25rem);
  color: var(--text-secondary);
  opacity: 0;
}

.greeting-icon {
  font-size: 1.5em;
}

.greeting-text {
  font-weight: 500;
}

/* 键盘快捷键提示样式 - 需求 8.6 */
.keyboard-hint {
  position: fixed;
  bottom: var(--spacing-xl);
  left: 50%;
  transform: translateX(-50%);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--bg-card);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  white-space: nowrap;
}

/* Toast 过渡动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

/* 减少动画偏好支持 */
@media (prefers-reduced-motion: reduce) {
  .greeting-message,
  .keyboard-hint {
    transition: none;
  }
  
  .toast-enter-active,
  .toast-leave-active {
    transition: opacity 0.1s ease;
  }
  
  .toast-enter-from,
  .toast-leave-to {
    transform: translateX(-50%);
  }
}

/* ========== 页脚样式 ========== */
.site-footer {
  padding: var(--spacing-2xl) var(--spacing-lg);
  background: var(--bg-card);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--border);
  margin-top: var(--spacing-3xl);
  opacity: 0;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
}

.icp-license {
  margin-bottom: var(--spacing-sm);
}

.icp-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.875rem;
  transition: all var(--transition-base);
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
}

.icp-link:hover {
  color: var(--primary);
  background: rgba(0, 217, 255, 0.1);
}

.icp-link:focus {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.copyright {
  color: var(--text-muted);
  font-size: 0.8rem;
  margin: 0;
}

@media (max-width: 768px) {
  .site-footer {
    padding: var(--spacing-xl) var(--spacing-md);
  }
  
  .icp-link,
  .copyright {
    font-size: 0.75rem;
  }
}
</style>
