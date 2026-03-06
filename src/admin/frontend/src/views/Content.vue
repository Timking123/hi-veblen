<script setup lang="ts">
/**
 * 内容管理页面
 * 使用 Tab 组织各子模块，提供预览和发布功能
 * 
 * 需求: 3.1.1-3.7.3
 * 
 * 键盘快捷键:
 * - Ctrl+S: 发布内容到前端
 * - Ctrl+P: 打开预览
 */
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { View, Upload, Monitor, FullScreen, Close, ArrowDown } from '@element-plus/icons-vue'
import { useKeyboardShortcuts } from '@/utils/keyboard'
import ProfileForm from '@/components/content/ProfileForm.vue'
import EducationList from '@/components/content/EducationList.vue'
import ExperienceList from '@/components/content/ExperienceList.vue'
import SkillList from '@/components/content/SkillList.vue'
import SkillTreeEditor from '@/components/content/SkillTreeEditor.vue'
import ProjectList from '@/components/content/ProjectList.vue'
import CampusList from '@/components/content/CampusList.vue'
import ContentPreview from '@/components/content/ContentPreview.vue'
import { getPreview, publish } from '@/api/content'

// 当前激活的 Tab
const activeTab = ref('profile')

// 预览对话框
const previewDialogVisible = ref(false)
const previewData = ref<any>(null)
const previewLoading = ref(false)

// 预览模式：'dialog' 对话框模式，'fullscreen' 全屏模式
const previewMode = ref<'dialog' | 'fullscreen'>('dialog')

// 发布状态
const publishing = ref(false)

// 注册键盘快捷键
useKeyboardShortcuts([
  {
    key: 's',
    ctrl: true,
    handler: () => handlePublish(),
    description: '发布内容到前端'
  },
  {
    key: 'p',
    ctrl: true,
    handler: () => handlePreview(),
    description: '打开预览'
  }
])

// Tab 配置
const tabs = [
  { name: 'profile', label: '个人信息' },
  { name: 'education', label: '教育经历' },
  { name: 'experience', label: '工作经历' },
  { name: 'skills', label: '技能列表' },
  { name: 'skillTree', label: '技能树' },
  { name: 'projects', label: '项目经历' },
  { name: 'campus', label: '校园经历' }
]

/**
 * 处理子组件保存事件
 */
function handleSaved() {
  // 可以在这里添加全局保存后的处理逻辑
  console.log('内容已保存')
}

/**
 * 加载预览数据
 */
async function loadPreviewData() {
  previewLoading.value = true
  
  try {
    const res = await getPreview() as any
    previewData.value = res.profile
  } catch (error) {
    console.error('获取预览数据失败:', error)
    ElMessage.error('获取预览数据失败')
  } finally {
    previewLoading.value = false
  }
}

/**
 * 预览数据（对话框模式）
 * 需求: 3.7.2 - 提供"预览"功能，在保存前查看修改效果
 */
async function handlePreview() {
  previewMode.value = 'dialog'
  previewDialogVisible.value = true
  await loadPreviewData()
}

/**
 * 全屏预览
 * 提供更沉浸式的预览体验
 */
async function handleFullscreenPreview() {
  previewMode.value = 'fullscreen'
  previewDialogVisible.value = true
  await loadPreviewData()
}

/**
 * 关闭预览
 */
function closePreview() {
  previewDialogVisible.value = false
}

/**
 * 切换预览模式
 */
function togglePreviewMode() {
  previewMode.value = previewMode.value === 'dialog' ? 'fullscreen' : 'dialog'
}

/**
 * 刷新预览数据
 */
async function refreshPreview() {
  await loadPreviewData()
  ElMessage.success('预览数据已刷新')
}

/**
 * 发布到前端
 * 需求: 3.7.1 - 内容修改后生成新的 profile.ts 数据文件
 * 需求: 3.7.3 - 提供"发布"功能，将修改同步到前端网站
 */
async function handlePublish() {
  try {
    await ElMessageBox.confirm(
      '确定要发布内容到前端网站吗？这将生成新的 profile.ts 文件并覆盖现有数据。',
      '发布确认',
      {
        confirmButtonText: '确定发布',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    publishing.value = true
    const res = await publish() as any
    
    if (res.success) {
      ElMessage.success(res.message || '发布成功')
    } else {
      ElMessage.error('发布失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('发布失败:', error)
      ElMessage.error('发布失败')
    }
  } finally {
    publishing.value = false
  }
}

/**
 * 从预览对话框中发布
 */
async function handlePublishFromPreview() {
  await handlePublish()
  if (!publishing.value) {
    // 发布成功后关闭预览
    closePreview()
  }
}
</script>

<template>
  <div class="content-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2 class="page-title">内容管理</h2>
      <div class="page-actions">
        <el-dropdown @command="(cmd: string) => cmd === 'dialog' ? handlePreview() : handleFullscreenPreview()">
          <el-button>
            <el-icon><View /></el-icon>
            预览
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="dialog">
                <el-icon><Monitor /></el-icon>
                对话框预览
              </el-dropdown-item>
              <el-dropdown-item command="fullscreen">
                <el-icon><FullScreen /></el-icon>
                全屏预览
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button type="primary" :loading="publishing" @click="handlePublish">
          <el-icon><Upload /></el-icon>
          发布到前端
        </el-button>
      </div>
    </div>
    
    <!-- Tab 导航 -->
    <el-tabs v-model="activeTab" type="border-card" class="content-tabs">
      <el-tab-pane
        v-for="tab in tabs"
        :key="tab.name"
        :label="tab.label"
        :name="tab.name"
        lazy
      >
        <!-- 个人信息 -->
        <ProfileForm v-if="tab.name === 'profile'" @saved="handleSaved" />
        
        <!-- 教育经历 -->
        <EducationList v-else-if="tab.name === 'education'" @saved="handleSaved" />
        
        <!-- 工作经历 -->
        <ExperienceList v-else-if="tab.name === 'experience'" @saved="handleSaved" />
        
        <!-- 技能列表 -->
        <SkillList v-else-if="tab.name === 'skills'" @saved="handleSaved" />
        
        <!-- 技能树 -->
        <SkillTreeEditor v-else-if="tab.name === 'skillTree'" @saved="handleSaved" />
        
        <!-- 项目经历 -->
        <ProjectList v-else-if="tab.name === 'projects'" @saved="handleSaved" />
        
        <!-- 校园经历 -->
        <CampusList v-else-if="tab.name === 'campus'" @saved="handleSaved" />
      </el-tab-pane>
    </el-tabs>
    
    <!-- 预览对话框（普通模式） -->
    <el-dialog
      v-model="previewDialogVisible"
      :title="previewMode === 'dialog' ? '内容预览' : ''"
      :width="previewMode === 'dialog' ? '900px' : '100%'"
      :fullscreen="previewMode === 'fullscreen'"
      :show-close="previewMode === 'dialog'"
      :close-on-click-modal="previewMode === 'dialog'"
      :close-on-press-escape="true"
      top="3vh"
      class="preview-dialog"
      :class="{ 'fullscreen-preview': previewMode === 'fullscreen' }"
    >
      <!-- 全屏模式的自定义头部 -->
      <template v-if="previewMode === 'fullscreen'" #header>
        <div class="fullscreen-header">
          <h3>内容预览 - 全屏模式</h3>
          <div class="fullscreen-actions">
            <el-button @click="refreshPreview" :loading="previewLoading">
              刷新预览
            </el-button>
            <el-button @click="togglePreviewMode">
              <el-icon><Monitor /></el-icon>
              切换到对话框模式
            </el-button>
            <el-button type="primary" :loading="publishing" @click="handlePublishFromPreview">
              <el-icon><Upload /></el-icon>
              确认发布
            </el-button>
            <el-button @click="closePreview" circle>
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
        </div>
      </template>
      
      <div v-loading="previewLoading" class="preview-content">
        <!-- 预览说明 -->
        <el-alert
          v-if="previewMode === 'dialog'"
          title="预览说明"
          type="info"
          :closable="false"
          style="margin-bottom: 15px;"
        >
          以下是将要发布到前端的数据预览。预览效果模拟了前端网站的显示样式，发布后将生成 profile.ts 文件。
          <el-button 
            type="primary" 
            link 
            @click="togglePreviewMode"
            style="margin-left: 10px;"
          >
            切换到全屏预览
          </el-button>
        </el-alert>
        
        <!-- 使用新的预览组件 -->
        <ContentPreview :data="previewData" />
      </div>
      
      <!-- 对话框模式的底部按钮 -->
      <template v-if="previewMode === 'dialog'" #footer>
        <div class="dialog-footer">
          <el-button @click="refreshPreview" :loading="previewLoading">
            刷新预览
          </el-button>
          <el-button @click="closePreview">关闭</el-button>
          <el-button type="primary" :loading="publishing" @click="handlePublishFromPreview">
            确认发布
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.content-page {
  padding: 20px;
  background-color: var(--bg-color-page);
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  .page-title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .page-actions {
    display: flex;
    gap: 10px;
  }
}

.content-tabs {
  background: var(--bg-color);
  border-radius: 8px;
  
  :deep(.el-tabs__content) {
    padding: 0;
  }
}

// 预览对话框样式
.preview-dialog {
  :deep(.el-dialog__body) {
    padding: 0;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  &.fullscreen-preview {
    :deep(.el-dialog__header) {
      padding: 0;
      margin: 0;
    }
    
    :deep(.el-dialog__body) {
      max-height: calc(100vh - 70px);
    }
  }
}

.fullscreen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: var(--gradient-primary);
  color: var(--sidebar-active-text);
  
  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }
  
  .fullscreen-actions {
    display: flex;
    gap: 10px;
  }
}

.preview-content {
  min-height: 300px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
