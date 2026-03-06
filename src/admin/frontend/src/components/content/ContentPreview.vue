<script setup lang="ts">
/**
 * 内容预览组件
 * 在保存前查看修改效果，模拟前端网站的显示样式
 * 
 * 需求: 3.7.2 - 提供"预览"功能，在保存前查看修改效果
 */
import { computed } from 'vue'
import { User, Phone, Message, Briefcase, School, Trophy, Star, Link } from '@element-plus/icons-vue'

// 定义 Props
interface PreviewData {
  profile?: {
    name?: string
    title?: string
    phone?: string
    email?: string
    avatar?: string
    summary?: string
    jobIntentions?: string[]
    job_intentions?: string[]
  } | null
  education?: Array<{
    id?: string
    school: string
    college?: string
    major: string
    period: string
    rank?: string
    honors?: string[]
    courses?: Array<{ name: string; score: number }>
  }>
  experience?: Array<{
    id?: string
    company: string
    position: string
    period: string
    responsibilities?: string[]
    achievements?: Array<{ metric: string; value: string }>
  }>
  skills?: Array<{
    id?: number
    name: string
    level: number
    category: string
    experience?: string
    projects?: string[]
  }>
  projects?: Array<{
    id?: string
    name: string
    description?: string
    period?: string
    role?: string
    technologies?: string[]
    highlights?: string[]
    screenshots?: string[]
    demo_url?: string
    source_url?: string
    category: string
  }>
  campus?: Array<{
    id?: number
    organization: string
    position: string
    period: string
  }>
}

const props = defineProps<{
  data: PreviewData | null
}>()

// 计算属性：获取求职意向
const jobIntentions = computed(() => {
  if (!props.data?.profile) return []
  return props.data.profile.jobIntentions || props.data.profile.job_intentions || []
})

// 计算属性：按分类分组技能
const skillsByCategory = computed(() => {
  if (!props.data?.skills) return {}
  const grouped: Record<string, typeof props.data.skills> = {}
  for (const skill of props.data.skills) {
    const category = skill.category || 'other'
    if (!grouped[category]) {
      grouped[category] = []
    }
    grouped[category].push(skill)
  }
  return grouped
})

// 技能分类名称映射
const categoryNames: Record<string, string> = {
  frontend: '前端技术',
  backend: '后端技术',
  tools: '工具',
  other: '其他'
}

// 项目分类名称映射
const projectCategoryNames: Record<string, string> = {
  work: '工作项目',
  personal: '个人项目',
  opensource: '开源项目'
}

// 获取技能等级颜色
function getSkillLevelColor(level: number): string {
  if (level >= 80) return '#67c23a'
  if (level >= 60) return '#409eff'
  if (level >= 40) return '#e6a23c'
  return '#909399'
}

// 获取技能等级文字
function getSkillLevelText(level: number): string {
  if (level >= 90) return '精通'
  if (level >= 70) return '熟练'
  if (level >= 50) return '掌握'
  if (level >= 30) return '了解'
  return '入门'
}
</script>

<template>
  <div class="content-preview">
    <!-- 无数据提示 -->
    <el-empty v-if="!data" description="暂无预览数据" />
    
    <template v-else>
      <!-- 个人信息卡片 -->
      <div class="preview-card profile-card" v-if="data.profile">
        <div class="profile-header">
          <div class="avatar-wrapper">
            <el-avatar 
              v-if="data.profile.avatar" 
              :src="data.profile.avatar" 
              :size="100"
            />
            <el-avatar v-else :size="100" :icon="User" />
          </div>
          <div class="profile-info">
            <h2 class="profile-name">{{ data.profile.name || '未设置姓名' }}</h2>
            <p class="profile-title">{{ data.profile.title || '未设置职位' }}</p>
            <div class="profile-contact">
              <span v-if="data.profile.phone" class="contact-item">
                <el-icon><Phone /></el-icon>
                {{ data.profile.phone }}
              </span>
              <span v-if="data.profile.email" class="contact-item">
                <el-icon><Message /></el-icon>
                {{ data.profile.email }}
              </span>
            </div>
          </div>
        </div>
        
        <!-- 个人简介 -->
        <div class="profile-summary" v-if="data.profile.summary">
          <h4>个人简介</h4>
          <p>{{ data.profile.summary }}</p>
        </div>
        
        <!-- 求职意向 -->
        <div class="job-intentions" v-if="jobIntentions.length > 0">
          <h4>求职意向</h4>
          <div class="intention-tags">
            <el-tag 
              v-for="(intention, index) in jobIntentions" 
              :key="index"
              type="primary"
              effect="light"
            >
              {{ intention }}
            </el-tag>
          </div>
        </div>
      </div>
      
      <!-- 教育经历 -->
      <div class="preview-card" v-if="data.education && data.education.length > 0">
        <h3 class="card-title">
          <el-icon><School /></el-icon>
          教育经历
        </h3>
        <div class="timeline">
          <div 
            v-for="edu in data.education" 
            :key="edu.id || edu.school"
            class="timeline-item"
          >
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="timeline-title">{{ edu.school }}</span>
                <span class="timeline-period">{{ edu.period }}</span>
              </div>
              <div class="timeline-subtitle">
                <span v-if="edu.college">{{ edu.college }} · </span>
                {{ edu.major }}
                <span v-if="edu.rank" class="rank-badge">{{ edu.rank }}</span>
              </div>
              <div class="timeline-details" v-if="edu.honors && edu.honors.length > 0">
                <div class="honors">
                  <el-tag 
                    v-for="(honor, idx) in edu.honors" 
                    :key="idx"
                    size="small"
                    type="warning"
                    effect="light"
                  >
                    <el-icon><Trophy /></el-icon>
                    {{ honor }}
                  </el-tag>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 工作经历 -->
      <div class="preview-card" v-if="data.experience && data.experience.length > 0">
        <h3 class="card-title">
          <el-icon><Briefcase /></el-icon>
          工作经历
        </h3>
        <div class="timeline">
          <div 
            v-for="exp in data.experience" 
            :key="exp.id || exp.company"
            class="timeline-item"
          >
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="timeline-title">{{ exp.company }}</span>
                <span class="timeline-period">{{ exp.period }}</span>
              </div>
              <div class="timeline-subtitle">{{ exp.position }}</div>
              <div class="timeline-details" v-if="exp.responsibilities && exp.responsibilities.length > 0">
                <ul class="responsibility-list">
                  <li v-for="(resp, idx) in exp.responsibilities" :key="idx">
                    {{ resp }}
                  </li>
                </ul>
              </div>
              <div class="achievements" v-if="exp.achievements && exp.achievements.length > 0">
                <el-tag 
                  v-for="(achievement, idx) in exp.achievements" 
                  :key="idx"
                  size="small"
                  type="success"
                  effect="light"
                >
                  {{ achievement.metric }}: {{ achievement.value }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 技能 -->
      <div class="preview-card" v-if="data.skills && data.skills.length > 0">
        <h3 class="card-title">
          <el-icon><Star /></el-icon>
          专业技能
        </h3>
        <div class="skills-container">
          <div 
            v-for="(skills, category) in skillsByCategory" 
            :key="category"
            class="skill-category"
          >
            <h4 class="category-title">{{ categoryNames[category] || category }}</h4>
            <div class="skill-list">
              <div 
                v-for="skill in skills" 
                :key="skill.id || skill.name"
                class="skill-item"
              >
                <div class="skill-header">
                  <span class="skill-name">{{ skill.name }}</span>
                  <span 
                    class="skill-level-text"
                    :style="{ color: getSkillLevelColor(skill.level) }"
                  >
                    {{ getSkillLevelText(skill.level) }}
                  </span>
                </div>
                <el-progress 
                  :percentage="skill.level" 
                  :color="getSkillLevelColor(skill.level)"
                  :stroke-width="8"
                  :show-text="false"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 项目经历 -->
      <div class="preview-card" v-if="data.projects && data.projects.length > 0">
        <h3 class="card-title">
          <el-icon><Link /></el-icon>
          项目经历
        </h3>
        <div class="projects-grid">
          <div 
            v-for="project in data.projects" 
            :key="project.id || project.name"
            class="project-item"
          >
            <div class="project-header">
              <span class="project-name">{{ project.name }}</span>
              <el-tag size="small" type="info">
                {{ projectCategoryNames[project.category] || project.category }}
              </el-tag>
            </div>
            <p class="project-description" v-if="project.description">
              {{ project.description }}
            </p>
            <div class="project-meta">
              <span v-if="project.period" class="meta-item">
                📅 {{ project.period }}
              </span>
              <span v-if="project.role" class="meta-item">
                👤 {{ project.role }}
              </span>
            </div>
            <div class="project-tech" v-if="project.technologies && project.technologies.length > 0">
              <el-tag 
                v-for="(tech, idx) in project.technologies" 
                :key="idx"
                size="small"
                effect="plain"
              >
                {{ tech }}
              </el-tag>
            </div>
            <div class="project-highlights" v-if="project.highlights && project.highlights.length > 0">
              <ul>
                <li v-for="(highlight, idx) in project.highlights" :key="idx">
                  {{ highlight }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 校园经历 -->
      <div class="preview-card" v-if="data.campus && data.campus.length > 0">
        <h3 class="card-title">
          <el-icon><School /></el-icon>
          校园经历
        </h3>
        <div class="campus-list">
          <div 
            v-for="campus in data.campus" 
            :key="campus.id || campus.organization"
            class="campus-item"
          >
            <div class="campus-header">
              <span class="campus-org">{{ campus.organization }}</span>
              <span class="campus-period">{{ campus.period }}</span>
            </div>
            <div class="campus-position">{{ campus.position }}</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.content-preview {
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100%;
  
  // 模拟前端网站的深色主题
  color: #fff;
}

.preview-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  
  .el-icon {
    font-size: 20px;
  }
}

// 个人信息卡片样式
.profile-card {
  .profile-header {
    display: flex;
    gap: 24px;
    margin-bottom: 20px;
  }
  
  .avatar-wrapper {
    flex-shrink: 0;
    
    :deep(.el-avatar) {
      border: 3px solid rgba(255, 255, 255, 0.3);
    }
  }
  
  .profile-info {
    flex: 1;
  }
  
  .profile-name {
    margin: 0 0 8px;
    font-size: 28px;
    font-weight: 700;
  }
  
  .profile-title {
    margin: 0 0 12px;
    font-size: 16px;
    color: rgba(255, 255, 255, 0.8);
  }
  
  .profile-contact {
    display: flex;
    gap: 20px;
    
    .contact-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.7);
    }
  }
  
  .profile-summary,
  .job-intentions {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    
    h4 {
      margin: 0 0 10px;
      font-size: 14px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
    }
    
    p {
      margin: 0;
      font-size: 14px;
      line-height: 1.8;
      color: rgba(255, 255, 255, 0.8);
    }
  }
  
  .intention-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
}

// 时间线样式
.timeline {
  position: relative;
  padding-left: 20px;
  
  &::before {
    content: '';
    position: absolute;
    left: 6px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: rgba(255, 255, 255, 0.2);
  }
}

.timeline-item {
  position: relative;
  padding-bottom: 24px;
  
  &:last-child {
    padding-bottom: 0;
  }
}

.timeline-dot {
  position: absolute;
  left: -17px;
  top: 6px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #409eff;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.timeline-content {
  .timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  
  .timeline-title {
    font-size: 16px;
    font-weight: 600;
  }
  
  .timeline-period {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
  }
  
  .timeline-subtitle {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 8px;
    
    .rank-badge {
      display: inline-block;
      margin-left: 8px;
      padding: 2px 8px;
      background: rgba(103, 194, 58, 0.3);
      border-radius: 4px;
      font-size: 12px;
      color: #67c23a;
    }
  }
  
  .timeline-details {
    margin-top: 10px;
  }
  
  .honors {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  
  .responsibility-list {
    margin: 0;
    padding-left: 18px;
    
    li {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.7);
      line-height: 1.8;
    }
  }
  
  .achievements {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
  }
}

// 技能样式
.skills-container {
  display: grid;
  gap: 24px;
}

.skill-category {
  .category-title {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
  }
}

.skill-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.skill-item {
  .skill-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  
  .skill-name {
    font-size: 14px;
    font-weight: 500;
  }
  
  .skill-level-text {
    font-size: 12px;
    font-weight: 600;
  }
  
  :deep(.el-progress) {
    .el-progress-bar__outer {
      background: rgba(255, 255, 255, 0.1);
    }
  }
}

// 项目样式
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.project-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  .project-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  
  .project-name {
    font-size: 16px;
    font-weight: 600;
  }
  
  .project-description {
    margin: 0 0 10px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.6;
  }
  
  .project-meta {
    display: flex;
    gap: 16px;
    margin-bottom: 10px;
    
    .meta-item {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
    }
  }
  
  .project-tech {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }
  
  .project-highlights {
    ul {
      margin: 0;
      padding-left: 18px;
      
      li {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        line-height: 1.6;
      }
    }
  }
}

// 校园经历样式
.campus-list {
  display: grid;
  gap: 12px;
}

.campus-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px 16px;
  
  .campus-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }
  
  .campus-org {
    font-size: 15px;
    font-weight: 600;
  }
  
  .campus-period {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }
  
  .campus-position {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.8);
  }
}
</style>
