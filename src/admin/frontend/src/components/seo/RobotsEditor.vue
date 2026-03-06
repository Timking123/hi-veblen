<script setup lang="ts">
/**
 * Robots.txt 编辑器组件
 * 支持 robots.txt 编辑和常用规则模板
 * 
 * 需求: 7.4.1-7.4.2
 */
import { ref, onMounted } from 'vue'
import {
  ElCard,
  ElInput,
  ElButton,
  ElMessage,
  ElDivider,
  ElIcon,
  ElTooltip,
  ElDialog
} from 'element-plus'
import {
  Document,
  Check,
  Refresh,
  InfoFilled,
  DocumentCopy,
  View
} from '@element-plus/icons-vue'
import {
  getRobotsTxt,
  updateRobotsTxt,
  getRobotsTemplates,
  type RobotsTemplate
} from '@/api/seo'

// ========== 状态定义 ==========

// 加载状态
const loading = ref(false)
const saveLoading = ref(false)

// robots.txt 内容
const content = ref('')

// 模板列表
const templates = ref<RobotsTemplate[]>([])
const selectedTemplate = ref<RobotsTemplate | null>(null)

// Sitemap URL（用于替换模板中的占位符）
const sitemapUrl = ref('https://example.com/sitemap.xml')

// 模板预览对话框
const showTemplateDialog = ref(false)
const templatePreview = ref('')

// ========== 方法定义 ==========

/**
 * 加载 robots.txt 内容
 */
async function loadContent() {
  loading.value = true
  try {
    const res = await getRobotsTxt() as any
    content.value = res.content || ''
  } catch (error) {
    console.error('加载 robots.txt 失败:', error)
    ElMessage.error('加载 robots.txt 失败')
  } finally {
    loading.value = false
  }
}

/**
 * 加载模板列表
 */
async function loadTemplates() {
  try {
    const res = await getRobotsTemplates() as any
    templates.value = res.templates || []
  } catch (error) {
    console.error('加载模板列表失败:', error)
  }
}

/**
 * 保存 robots.txt 内容
 */
async function saveContent() {
  saveLoading.value = true
  try {
    await updateRobotsTxt(content.value)
    ElMessage.success('robots.txt 保存成功')
  } catch (error: any) {
    console.error('保存 robots.txt 失败:', error)
    ElMessage.error(error.message || '保存失败')
  } finally {
    saveLoading.value = false
  }
}

/**
 * 选择模板
 */
function selectTemplate(template: RobotsTemplate) {
  selectedTemplate.value = template
  // 替换占位符生成预览
  templatePreview.value = template.content.replace('{{SITEMAP_URL}}', sitemapUrl.value)
  showTemplateDialog.value = true
}

/**
 * 直接使用模板内容
 */
function useTemplateContent() {
  content.value = templatePreview.value
  showTemplateDialog.value = false
  ElMessage.success('模板已应用到编辑器')
}

/**
 * 插入常用指令
 */
function insertDirective(directive: string) {
  const textarea = document.querySelector('.robots-textarea textarea') as HTMLTextAreaElement
  if (textarea) {
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = content.value.substring(0, start)
    const after = content.value.substring(end)
    content.value = before + directive + '\n' + after
    
    // 恢复光标位置
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + directive.length + 1, start + directive.length + 1)
    }, 0)
  } else {
    content.value += (content.value ? '\n' : '') + directive
  }
}

// ========== 生命周期 ==========

onMounted(() => {
  loadContent()
  loadTemplates()
})
</script>

<template>
  <div class="robots-editor" v-loading="loading">
    <!-- 说明卡片 -->
    <el-card shadow="never" class="info-card">
      <div class="info-content">
        <el-icon class="info-icon"><InfoFilled /></el-icon>
        <div class="info-text">
          <p><strong>robots.txt 配置说明：</strong></p>
          <ul>
            <li><strong>User-agent</strong>：指定规则适用的搜索引擎爬虫（* 表示所有）</li>
            <li><strong>Allow</strong>：允许爬取的路径</li>
            <li><strong>Disallow</strong>：禁止爬取的路径</li>
            <li><strong>Sitemap</strong>：指定 sitemap.xml 的位置</li>
            <li><strong>Crawl-delay</strong>：设置爬取延迟（秒）</li>
          </ul>
        </div>
      </div>
    </el-card>
    
    <!-- 模板选择 -->
    <el-card shadow="never" class="template-card">
      <template #header>
        <div class="card-header">
          <span>常用模板</span>
          <el-tooltip content="选择模板可快速生成 robots.txt 内容" placement="top">
            <el-icon class="help-icon"><InfoFilled /></el-icon>
          </el-tooltip>
        </div>
      </template>
      
      <div class="template-list">
        <div
          v-for="template in templates"
          :key="template.name"
          class="template-item"
          @click="selectTemplate(template)"
        >
          <div class="template-info">
            <el-icon><Document /></el-icon>
            <div class="template-text">
              <span class="template-name">{{ template.name }}</span>
              <span class="template-desc">{{ template.description }}</span>
            </div>
          </div>
          <el-button type="primary" size="small" text>
            <el-icon><View /></el-icon>
            预览
          </el-button>
        </div>
      </div>
    </el-card>
    
    <!-- 快捷指令 -->
    <el-card shadow="never" class="directive-card">
      <template #header>
        <div class="card-header">
          <span>快捷指令</span>
        </div>
      </template>
      
      <div class="directive-buttons">
        <el-button size="small" @click="insertDirective('User-agent: *')">
          User-agent: *
        </el-button>
        <el-button size="small" @click="insertDirective('Allow: /')">
          Allow: /
        </el-button>
        <el-button size="small" @click="insertDirective('Disallow: /')">
          Disallow: /
        </el-button>
        <el-button size="small" @click="insertDirective('Disallow: /admin/')">
          Disallow: /admin/
        </el-button>
        <el-button size="small" @click="insertDirective('Disallow: /api/')">
          Disallow: /api/
        </el-button>
        <el-button size="small" @click="insertDirective('Crawl-delay: 10')">
          Crawl-delay: 10
        </el-button>
        <el-button size="small" @click="insertDirective(`Sitemap: ${sitemapUrl}`)">
          Sitemap
        </el-button>
      </div>
    </el-card>
    
    <!-- 编辑器 -->
    <el-card shadow="never" class="editor-card">
      <template #header>
        <div class="card-header">
          <span>robots.txt 内容</span>
          <div class="header-actions">
            <el-input
              v-model="sitemapUrl"
              placeholder="Sitemap URL"
              size="small"
              style="width: 300px"
            >
              <template #prepend>Sitemap URL</template>
            </el-input>
          </div>
        </div>
      </template>
      
      <el-input
        v-model="content"
        type="textarea"
        :rows="15"
        placeholder="# robots.txt 内容
User-agent: *
Allow: /
Disallow: /admin/

Sitemap: https://example.com/sitemap.xml"
        class="robots-textarea"
      />
    </el-card>
    
    <!-- 操作按钮 -->
    <div class="action-bar">
      <div class="action-left">
        <el-button @click="loadContent" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新内容
        </el-button>
      </div>
      <div class="action-right">
        <el-button
          type="primary"
          @click="saveContent"
          :loading="saveLoading"
        >
          <el-icon><Check /></el-icon>
          保存 robots.txt
        </el-button>
      </div>
    </div>
    
    <!-- 模板预览对话框 -->
    <el-dialog
      v-model="showTemplateDialog"
      :title="selectedTemplate?.name || '模板预览'"
      width="600px"
    >
      <div class="template-dialog-content">
        <p class="template-dialog-desc">{{ selectedTemplate?.description }}</p>
        
        <el-divider content-position="left">Sitemap URL</el-divider>
        <el-input
          v-model="sitemapUrl"
          placeholder="请输入 Sitemap URL"
          @input="templatePreview = selectedTemplate?.content.replace('{{SITEMAP_URL}}', sitemapUrl) || ''"
        />
        
        <el-divider content-position="left">预览内容</el-divider>
        <pre class="template-preview">{{ templatePreview }}</pre>
      </div>
      
      <template #footer>
        <el-button @click="showTemplateDialog = false">取消</el-button>
        <el-button type="primary" @click="useTemplateContent">
          <el-icon><DocumentCopy /></el-icon>
          应用到编辑器
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.robots-editor {
  padding: 16px;
}

.info-card {
  margin-bottom: 20px;
  background: var(--warning-card-bg);
  border-color: var(--warning-card-border);
  
  :deep(.el-card__body) {
    padding: 16px;
  }
  
  .info-content {
    display: flex;
    gap: 12px;
    
    .info-icon {
      font-size: 24px;
      color: var(--warning-color);
      flex-shrink: 0;
    }
    
    .info-text {
      p {
        margin: 0 0 8px 0;
        color: var(--text-primary);
      }
      
      ul {
        margin: 0;
        padding-left: 20px;
        color: var(--text-secondary);
        font-size: 13px;
        
        li {
          margin-bottom: 4px;
        }
      }
    }
  }
}

.template-card,
.directive-card,
.editor-card {
  margin-bottom: 20px;
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .help-icon {
      color: var(--text-secondary);
      cursor: help;
    }
    
    .header-actions {
      display: flex;
      gap: 12px;
    }
  }
}

.template-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  
  .template-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--code-preview-bg);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      background: var(--info-card-bg);
      border-color: var(--info-card-border);
    }
    
    .template-info {
      display: flex;
      align-items: center;
      gap: 12px;
      
      .el-icon {
        font-size: 20px;
        color: var(--primary-color);
      }
      
      .template-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        
        .template-name {
          font-weight: 500;
          color: var(--text-primary);
        }
        
        .template-desc {
          font-size: 12px;
          color: var(--text-secondary);
        }
      }
    }
  }
}

.directive-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.robots-textarea {
  :deep(textarea) {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
    line-height: 1.6;
  }
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--code-preview-bg);
  border-radius: 8px;
  
  .action-left,
  .action-right {
    display: flex;
    gap: 12px;
  }
}

.template-dialog-content {
  .template-dialog-desc {
    margin: 0 0 16px 0;
    color: var(--text-primary);
  }
  
  .template-preview {
    padding: 16px;
    background: var(--code-preview-bg);
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 300px;
    overflow-y: auto;
  }
}
</style>
