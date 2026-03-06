<script setup lang="ts">
/**
 * Sitemap 配置组件
 * 支持页面优先级配置、更新频率配置和自动生成 sitemap.xml
 * 
 * 需求: 7.3.1-7.3.3
 */
import { ref, reactive, onMounted } from 'vue'
import {
  ElCard,
  ElForm,
  ElFormItem,
  ElInput,
  ElButton,
  ElSelect,
  ElOption,
  ElTable,
  ElTableColumn,
  ElMessage,
  ElMessageBox,
  ElIcon,
  ElTag,
  ElSlider
} from 'element-plus'
import {
  Plus,
  Delete,
  Check,
  Refresh,
  Download,
  InfoFilled
} from '@element-plus/icons-vue'
import {
  getSitemapConfig,
  updateSitemapConfig,
  generateSitemap,
  CHANGE_FREQUENCY_OPTIONS,
  type SitemapConfig
} from '@/api/seo'

// ========== 状态定义 ==========

// 加载状态
const loading = ref(false)
const saveLoading = ref(false)
const generateLoading = ref(false)

// Sitemap 配置数据
const config = reactive<SitemapConfig>({
  baseUrl: '',
  pages: []
})

// 生成的 sitemap.xml 内容预览
const sitemapPreview = ref('')
const showPreview = ref(false)

// ========== 计算属性 ==========

// 优先级颜色映射
const getPriorityColor = (priority: number) => {
  if (priority >= 0.8) return 'success'
  if (priority >= 0.5) return 'warning'
  return 'info'
}

// 优先级标签
const getPriorityLabel = (priority: number) => {
  if (priority >= 0.8) return '高'
  if (priority >= 0.5) return '中'
  return '低'
}

// ========== 方法定义 ==========

/**
 * 加载 Sitemap 配置
 */
async function loadConfig() {
  loading.value = true
  try {
    const res = await getSitemapConfig() as any
    Object.assign(config, res.config)
  } catch (error) {
    console.error('加载 Sitemap 配置失败:', error)
    ElMessage.error('加载 Sitemap 配置失败')
  } finally {
    loading.value = false
  }
}

/**
 * 保存 Sitemap 配置
 */
async function saveConfig() {
  // 验证必填字段
  if (!config.baseUrl.trim()) {
    ElMessage.warning('网站基础 URL 不能为空')
    return
  }
  
  // 验证 URL 格式
  try {
    new URL(config.baseUrl)
  } catch {
    ElMessage.warning('请输入有效的网站基础 URL')
    return
  }
  
  // 验证页面配置
  for (const page of config.pages) {
    if (!page.url.trim()) {
      ElMessage.warning('页面 URL 不能为空')
      return
    }
  }
  
  saveLoading.value = true
  try {
    await updateSitemapConfig(config)
    ElMessage.success('Sitemap 配置保存成功')
  } catch (error: any) {
    console.error('保存 Sitemap 配置失败:', error)
    ElMessage.error(error.message || '保存失败')
  } finally {
    saveLoading.value = false
  }
}

/**
 * 生成 sitemap.xml
 */
async function handleGenerateSitemap() {
  try {
    await ElMessageBox.confirm(
      '确定要生成 sitemap.xml 文件吗？这将覆盖现有文件。',
      '生成 Sitemap',
      {
        confirmButtonText: '确定生成',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    generateLoading.value = true
    const res = await generateSitemap() as any
    
    if (res.success) {
      ElMessage.success('sitemap.xml 生成成功')
      
      // 显示预览
      if (res.content) {
        sitemapPreview.value = res.content
        showPreview.value = true
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('生成 Sitemap 失败:', error)
      ElMessage.error('生成 Sitemap 失败')
    }
  } finally {
    generateLoading.value = false
  }
}

/**
 * 添加页面
 */
function addPage() {
  config.pages.push({
    url: '/',
    priority: 0.5,
    changefreq: 'monthly'
  })
}

/**
 * 删除页面
 */
function removePage(index: number) {
  config.pages.splice(index, 1)
}

/**
 * 格式化优先级显示
 */
function formatPriority(priority: number) {
  return priority.toFixed(1)
}

// ========== 生命周期 ==========

onMounted(() => {
  loadConfig()
})
</script>

<template>
  <div class="sitemap-config" v-loading="loading">
    <!-- 说明卡片 -->
    <el-card shadow="never" class="info-card">
      <div class="info-content">
        <el-icon class="info-icon"><InfoFilled /></el-icon>
        <div class="info-text">
          <p><strong>Sitemap 配置说明：</strong></p>
          <ul>
            <li><strong>优先级（Priority）</strong>：0.0-1.0，表示页面相对于其他页面的重要性</li>
            <li><strong>更新频率（Changefreq）</strong>：告诉搜索引擎页面的更新频率</li>
            <li>生成的 sitemap.xml 将帮助搜索引擎更好地索引您的网站</li>
          </ul>
        </div>
      </div>
    </el-card>
    
    <!-- 基础配置 -->
    <el-card shadow="never" class="config-card">
      <template #header>
        <div class="card-header">
          <span>基础配置</span>
        </div>
      </template>
      
      <el-form :model="config" label-width="120px">
        <el-form-item label="网站基础 URL" required>
          <el-input
            v-model="config.baseUrl"
            placeholder="https://example.com"
          />
          <div class="form-item-tip">
            所有页面 URL 将基于此地址生成完整链接
          </div>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 页面配置 -->
    <el-card shadow="never" class="config-card">
      <template #header>
        <div class="card-header">
          <span>页面配置</span>
          <el-button type="primary" size="small" @click="addPage">
            <el-icon><Plus /></el-icon>
            添加页面
          </el-button>
        </div>
      </template>
      
      <el-table :data="config.pages" stripe>
        <el-table-column label="页面 URL" min-width="200">
          <template #default="{ row }">
            <el-input v-model="row.url" placeholder="/page-path" size="small" />
          </template>
        </el-table-column>
        
        <el-table-column label="优先级" width="200">
          <template #default="{ row }">
            <div class="priority-cell">
              <el-slider
                v-model="row.priority"
                :min="0"
                :max="1"
                :step="0.1"
                :show-tooltip="false"
                size="small"
              />
              <el-tag :type="getPriorityColor(row.priority)" size="small">
                {{ formatPriority(row.priority) }} ({{ getPriorityLabel(row.priority) }})
              </el-tag>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="更新频率" width="150">
          <template #default="{ row }">
            <el-select v-model="row.changefreq" size="small" style="width: 100%">
              <el-option
                v-for="option in CHANGE_FREQUENCY_OPTIONS"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </template>
        </el-table-column>
        
        <el-table-column label="最后修改" width="150">
          <template #default="{ row }">
            <el-input
              v-model="row.lastmod"
              placeholder="YYYY-MM-DD"
              size="small"
            />
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ $index }">
            <el-button
              type="danger"
              size="small"
              text
              @click="removePage($index)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div v-if="config.pages.length === 0" class="empty-tip">
        暂无页面配置，点击"添加页面"按钮添加
      </div>
    </el-card>
    
    <!-- 操作按钮 -->
    <div class="action-bar">
      <div class="action-left">
        <el-button @click="loadConfig" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新配置
        </el-button>
      </div>
      <div class="action-right">
        <el-button
          type="success"
          @click="handleGenerateSitemap"
          :loading="generateLoading"
        >
          <el-icon><Download /></el-icon>
          生成 sitemap.xml
        </el-button>
        <el-button
          type="primary"
          @click="saveConfig"
          :loading="saveLoading"
        >
          <el-icon><Check /></el-icon>
          保存配置
        </el-button>
      </div>
    </div>
    
    <!-- Sitemap 预览 -->
    <el-card v-if="showPreview" shadow="never" class="preview-card">
      <template #header>
        <div class="card-header">
          <span>sitemap.xml 预览</span>
          <el-button size="small" text @click="showPreview = false">关闭</el-button>
        </div>
      </template>
      <pre class="xml-preview">{{ sitemapPreview }}</pre>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.sitemap-config {
  padding: 16px;
}

.info-card {
  margin-bottom: 20px;
  background: var(--info-card-bg);
  border-color: var(--info-card-border);
  
  :deep(.el-card__body) {
    padding: 16px;
  }
  
  .info-content {
    display: flex;
    gap: 12px;
    
    .info-icon {
      font-size: 24px;
      color: var(--primary-color);
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

.config-card {
  margin-bottom: 20px;
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}

.form-item-tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.priority-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  
  .el-slider {
    flex: 1;
  }
  
  .el-tag {
    flex-shrink: 0;
    min-width: 80px;
    text-align: center;
  }
}

.empty-tip {
  padding: 40px;
  text-align: center;
  color: var(--text-secondary);
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

.preview-card {
  margin-top: 20px;
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .xml-preview {
    padding: 16px;
    background: var(--code-preview-bg);
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 12px;
    line-height: 1.5;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 400px;
    overflow-y: auto;
  }
}
</style>
