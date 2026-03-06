<script setup lang="ts">
/**
 * 结构化数据编辑器组件
 * 支持 Person Schema、WebSite Schema 和面包屑导航 Schema 配置
 * 
 * 需求: 7.2.1-7.2.3
 */
import { ref, reactive, onMounted, computed } from 'vue'
import {
  ElCard,
  ElForm,
  ElFormItem,
  ElInput,
  ElButton,
  ElSwitch,
  ElTabs,
  ElTabPane,
  ElMessage,
  ElDivider,
  ElIcon,
  ElTooltip,
  ElTag,
  ElCollapse,
  ElCollapseItem
} from 'element-plus'
import {
  User,
  Link,
  Position,
  Check,
  Refresh,
  Plus,
  Delete,
  InfoFilled,
  Document
} from '@element-plus/icons-vue'
import {
  getSchemas,
  updateSchemas,
  PAGE_NAMES,
  DEFAULT_PAGES,
  type SchemaConfig,
  type BreadcrumbItem,
  type PageIdentifier
} from '@/api/seo'

// ========== 状态定义 ==========

// 加载状态
const loading = ref(false)
const saveLoading = ref(false)

// 当前编辑模式：form（表单）或 json（JSON）
const editMode = ref<'form' | 'json'>('form')

// Schema 配置数据
const schemas = reactive<SchemaConfig>({
  person: {
    name: '',
    jobTitle: '',
    url: '',
    email: '',
    telephone: '',
    image: '',
    sameAs: []
  },
  website: {
    name: '',
    url: '',
    description: '',
    inLanguage: 'zh-CN'
  },
  breadcrumb: {
    enabled: true,
    items: {} as Record<PageIdentifier, BreadcrumbItem[]>
  }
})

// JSON 编辑器内容
const jsonContent = ref('')
const jsonError = ref('')

// 社交媒体链接输入
const socialLinkInput = ref('')

// 当前激活的面包屑页面
const activeBreadcrumbPages = ref<string[]>(['home'])

// ========== 计算属性 ==========

// 生成 Person Schema JSON-LD 预览
const personJsonLd = computed(() => {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: schemas.person.name,
    jobTitle: schemas.person.jobTitle
  }
  
  if (schemas.person.url) jsonLd.url = schemas.person.url
  if (schemas.person.email) jsonLd.email = schemas.person.email
  if (schemas.person.telephone) jsonLd.telephone = schemas.person.telephone
  if (schemas.person.image) jsonLd.image = schemas.person.image
  if (schemas.person.sameAs && schemas.person.sameAs.length > 0) {
    jsonLd.sameAs = schemas.person.sameAs
  }
  if (schemas.person.worksFor) jsonLd.worksFor = schemas.person.worksFor
  
  return JSON.stringify(jsonLd, null, 2)
})

// 生成 WebSite Schema JSON-LD 预览
const websiteJsonLd = computed(() => {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: schemas.website.name,
    url: schemas.website.url
  }
  
  if (schemas.website.description) jsonLd.description = schemas.website.description
  if (schemas.website.inLanguage) jsonLd.inLanguage = schemas.website.inLanguage
  if (schemas.website.author) jsonLd.author = schemas.website.author
  
  return JSON.stringify(jsonLd, null, 2)
})

// ========== 方法定义 ==========

/**
 * 加载 Schema 配置
 */
async function loadSchemas() {
  loading.value = true
  try {
    const res = await getSchemas() as any
    const data = res.schemas as SchemaConfig
    
    // 更新 Person Schema
    Object.assign(schemas.person, data.person)
    
    // 更新 WebSite Schema
    Object.assign(schemas.website, data.website)
    
    // 更新 Breadcrumb Schema
    schemas.breadcrumb.enabled = data.breadcrumb.enabled
    schemas.breadcrumb.items = data.breadcrumb.items || {}
    
    // 确保所有页面都有面包屑配置
    DEFAULT_PAGES.forEach(page => {
      if (!schemas.breadcrumb.items[page]) {
        schemas.breadcrumb.items[page] = [{ name: PAGE_NAMES[page], url: `/${page === 'home' ? '' : page}` }]
      }
    })
    
    // 更新 JSON 内容
    jsonContent.value = JSON.stringify(schemas, null, 2)
  } catch (error) {
    console.error('加载 Schema 配置失败:', error)
    ElMessage.error('加载 Schema 配置失败')
  } finally {
    loading.value = false
  }
}

/**
 * 保存 Schema 配置
 */
async function saveSchemas() {
  // 如果是 JSON 模式，先解析 JSON
  if (editMode.value === 'json') {
    try {
      const parsed = JSON.parse(jsonContent.value)
      Object.assign(schemas, parsed)
      jsonError.value = ''
    } catch (e) {
      jsonError.value = 'JSON 格式错误，请检查'
      ElMessage.error('JSON 格式错误')
      return
    }
  }
  
  // 验证必填字段
  if (!schemas.person.name.trim()) {
    ElMessage.warning('Person Schema 的姓名不能为空')
    return
  }
  if (!schemas.website.name.trim()) {
    ElMessage.warning('WebSite Schema 的网站名称不能为空')
    return
  }
  if (!schemas.website.url.trim()) {
    ElMessage.warning('WebSite Schema 的网站 URL 不能为空')
    return
  }
  
  saveLoading.value = true
  try {
    await updateSchemas(schemas)
    ElMessage.success('Schema 配置保存成功')
  } catch (error: any) {
    console.error('保存 Schema 配置失败:', error)
    ElMessage.error(error.message || '保存失败')
  } finally {
    saveLoading.value = false
  }
}

/**
 * 添加社交媒体链接
 */
function addSocialLink() {
  const link = socialLinkInput.value.trim()
  if (!link) return
  
  if (!schemas.person.sameAs) {
    schemas.person.sameAs = []
  }
  
  if (schemas.person.sameAs.includes(link)) {
    ElMessage.warning('链接已存在')
    return
  }
  
  // 简单验证 URL 格式
  try {
    new URL(link)
  } catch {
    ElMessage.warning('请输入有效的 URL')
    return
  }
  
  schemas.person.sameAs.push(link)
  socialLinkInput.value = ''
}

/**
 * 删除社交媒体链接
 */
function removeSocialLink(index: number) {
  schemas.person.sameAs?.splice(index, 1)
}

/**
 * 添加面包屑项
 */
function addBreadcrumbItem(page: PageIdentifier) {
  if (!schemas.breadcrumb.items[page]) {
    schemas.breadcrumb.items[page] = []
  }
  schemas.breadcrumb.items[page].push({ name: '', url: '' })
}

/**
 * 删除面包屑项
 */
function removeBreadcrumbItem(page: PageIdentifier, index: number) {
  schemas.breadcrumb.items[page]?.splice(index, 1)
}

/**
 * 切换编辑模式
 */
function switchEditMode(mode: 'form' | 'json') {
  if (mode === 'json') {
    // 切换到 JSON 模式时，更新 JSON 内容
    jsonContent.value = JSON.stringify(schemas, null, 2)
  } else {
    // 切换到表单模式时，尝试解析 JSON
    try {
      const parsed = JSON.parse(jsonContent.value)
      Object.assign(schemas, parsed)
      jsonError.value = ''
    } catch (e) {
      ElMessage.warning('JSON 格式错误，已恢复为表单数据')
    }
  }
  editMode.value = mode
}

/**
 * 验证 JSON 格式
 */
function validateJson() {
  try {
    JSON.parse(jsonContent.value)
    jsonError.value = ''
    ElMessage.success('JSON 格式正确')
  } catch (e) {
    jsonError.value = 'JSON 格式错误'
    ElMessage.error('JSON 格式错误')
  }
}

// ========== 生命周期 ==========

onMounted(() => {
  loadSchemas()
})
</script>

<template>
  <div class="schema-editor" v-loading="loading">
    <!-- 工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <el-button
          :type="editMode === 'form' ? 'primary' : 'default'"
          @click="switchEditMode('form')"
        >
          表单编辑
        </el-button>
        <el-button
          :type="editMode === 'json' ? 'primary' : 'default'"
          @click="switchEditMode('json')"
        >
          JSON 编辑
        </el-button>
      </div>
      <div class="toolbar-right">
        <el-button @click="loadSchemas" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button type="primary" @click="saveSchemas" :loading="saveLoading">
          <el-icon><Check /></el-icon>
          保存配置
        </el-button>
      </div>
    </div>
    
    <!-- 表单编辑模式 -->
    <div v-if="editMode === 'form'" class="form-mode">
      <el-tabs type="border-card">
        <!-- Person Schema -->
        <el-tab-pane>
          <template #label>
            <span class="tab-label">
              <el-icon><User /></el-icon>
              Person Schema
            </span>
          </template>
          
          <div class="schema-section">
            <div class="section-header">
              <h4>个人信息结构化数据</h4>
              <el-tooltip content="用于搜索引擎识别网站所有者信息" placement="top">
                <el-icon class="help-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </div>
            
            <el-form :model="schemas.person" label-width="120px">
              <el-form-item label="姓名" required>
                <el-input v-model="schemas.person.name" placeholder="请输入姓名" />
              </el-form-item>
              
              <el-form-item label="职位/头衔" required>
                <el-input v-model="schemas.person.jobTitle" placeholder="请输入职位或头衔" />
              </el-form-item>
              
              <el-form-item label="个人网站">
                <el-input v-model="schemas.person.url" placeholder="https://example.com" />
              </el-form-item>
              
              <el-form-item label="邮箱">
                <el-input v-model="schemas.person.email" placeholder="email@example.com" />
              </el-form-item>
              
              <el-form-item label="电话">
                <el-input v-model="schemas.person.telephone" placeholder="+86 123 4567 8900" />
              </el-form-item>
              
              <el-form-item label="头像图片">
                <el-input v-model="schemas.person.image" placeholder="头像图片 URL" />
              </el-form-item>
              
              <el-form-item label="社交媒体链接">
                <div class="social-links">
                  <div class="link-input">
                    <el-input
                      v-model="socialLinkInput"
                      placeholder="输入社交媒体链接后按回车添加"
                      @keyup.enter="addSocialLink"
                    >
                      <template #append>
                        <el-button @click="addSocialLink">
                          <el-icon><Plus /></el-icon>
                        </el-button>
                      </template>
                    </el-input>
                  </div>
                  <div class="link-list">
                    <div
                      v-for="(link, index) in schemas.person.sameAs"
                      :key="index"
                      class="link-item"
                    >
                      <el-icon><Link /></el-icon>
                      <span class="link-url">{{ link }}</span>
                      <el-button
                        type="danger"
                        size="small"
                        text
                        @click="removeSocialLink(index)"
                      >
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                    <div v-if="!schemas.person.sameAs?.length" class="no-links">
                      暂无社交媒体链接
                    </div>
                  </div>
                </div>
              </el-form-item>
            </el-form>
            
            <!-- JSON-LD 预览 -->
            <el-divider content-position="left">JSON-LD 预览</el-divider>
            <pre class="json-preview">{{ personJsonLd }}</pre>
          </div>
        </el-tab-pane>
        
        <!-- WebSite Schema -->
        <el-tab-pane>
          <template #label>
            <span class="tab-label">
              <el-icon><Link /></el-icon>
              WebSite Schema
            </span>
          </template>
          
          <div class="schema-section">
            <div class="section-header">
              <h4>网站信息结构化数据</h4>
              <el-tooltip content="用于搜索引擎识别网站基本信息" placement="top">
                <el-icon class="help-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </div>
            
            <el-form :model="schemas.website" label-width="120px">
              <el-form-item label="网站名称" required>
                <el-input v-model="schemas.website.name" placeholder="请输入网站名称" />
              </el-form-item>
              
              <el-form-item label="网站 URL" required>
                <el-input v-model="schemas.website.url" placeholder="https://example.com" />
              </el-form-item>
              
              <el-form-item label="网站描述">
                <el-input
                  v-model="schemas.website.description"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入网站描述"
                />
              </el-form-item>
              
              <el-form-item label="网站语言">
                <el-input v-model="schemas.website.inLanguage" placeholder="zh-CN" />
              </el-form-item>
            </el-form>
            
            <!-- JSON-LD 预览 -->
            <el-divider content-position="left">JSON-LD 预览</el-divider>
            <pre class="json-preview">{{ websiteJsonLd }}</pre>
          </div>
        </el-tab-pane>
        
        <!-- Breadcrumb Schema -->
        <el-tab-pane>
          <template #label>
            <span class="tab-label">
              <el-icon><Position /></el-icon>
              面包屑导航
            </span>
          </template>
          
          <div class="schema-section">
            <div class="section-header">
              <h4>面包屑导航结构化数据</h4>
              <el-tooltip content="帮助搜索引擎理解网站页面层级结构" placement="top">
                <el-icon class="help-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </div>
            
            <el-form label-width="120px">
              <el-form-item label="启用面包屑">
                <el-switch v-model="schemas.breadcrumb.enabled" />
              </el-form-item>
            </el-form>
            
            <div v-if="schemas.breadcrumb.enabled" class="breadcrumb-config">
              <el-collapse v-model="activeBreadcrumbPages">
                <el-collapse-item
                  v-for="page in DEFAULT_PAGES"
                  :key="page"
                  :name="page"
                >
                  <template #title>
                    <div class="collapse-title">
                      <el-icon><Document /></el-icon>
                      <span>{{ PAGE_NAMES[page] }}</span>
                      <el-tag size="small" type="info">
                        {{ schemas.breadcrumb.items[page]?.length || 0 }} 项
                      </el-tag>
                    </div>
                  </template>
                  
                  <div class="breadcrumb-items">
                    <div
                      v-for="(item, index) in schemas.breadcrumb.items[page]"
                      :key="index"
                      class="breadcrumb-item"
                    >
                      <span class="item-index">{{ index + 1 }}</span>
                      <el-input
                        v-model="item.name"
                        placeholder="名称"
                        size="small"
                        style="width: 150px"
                      />
                      <el-input
                        v-model="item.url"
                        placeholder="URL"
                        size="small"
                        style="width: 200px"
                      />
                      <el-button
                        type="danger"
                        size="small"
                        text
                        @click="removeBreadcrumbItem(page, index)"
                      >
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                    
                    <el-button
                      type="primary"
                      size="small"
                      text
                      @click="addBreadcrumbItem(page)"
                    >
                      <el-icon><Plus /></el-icon>
                      添加项
                    </el-button>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
    
    <!-- JSON 编辑模式 -->
    <div v-else class="json-mode">
      <el-card shadow="never">
        <template #header>
          <div class="json-header">
            <span>JSON 编辑器</span>
            <el-button size="small" @click="validateJson">验证 JSON</el-button>
          </div>
        </template>
        
        <el-input
          v-model="jsonContent"
          type="textarea"
          :rows="25"
          placeholder="请输入 JSON 格式的 Schema 配置"
          class="json-textarea"
        />
        
        <div v-if="jsonError" class="json-error">
          <el-icon><InfoFilled /></el-icon>
          {{ jsonError }}
        </div>
      </el-card>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.schema-editor {
  padding: 16px;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px;
  background: var(--code-preview-bg);
  border-radius: 8px;
  
  .toolbar-left,
  .toolbar-right {
    display: flex;
    gap: 12px;
  }
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.schema-section {
  padding: 16px;
  
  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
    
    h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .help-icon {
      color: var(--text-secondary);
      cursor: help;
    }
  }
}

.social-links {
  width: 100%;
  
  .link-input {
    margin-bottom: 12px;
  }
  
  .link-list {
    .link-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      margin-bottom: 8px;
      background: var(--code-preview-bg);
      border-radius: 4px;
      
      .el-icon {
        color: var(--primary-color);
      }
      
      .link-url {
        flex: 1;
        font-size: 13px;
        color: var(--text-primary);
        word-break: break-all;
      }
    }
    
    .no-links {
      color: var(--text-secondary);
      font-size: 13px;
    }
  }
}

.json-preview {
  padding: 16px;
  background: var(--code-preview-bg);
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.breadcrumb-config {
  margin-top: 16px;
}

.collapse-title {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .el-icon {
    color: var(--primary-color);
  }
}

.breadcrumb-items {
  padding: 12px;
  
  .breadcrumb-item {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    
    .item-index {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--primary-color);
      color: var(--bg-color);
      border-radius: 50%;
      font-size: 12px;
    }
  }
}

.json-mode {
  .json-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .json-textarea {
    :deep(textarea) {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 13px;
      line-height: 1.5;
    }
  }
  
  .json-error {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
    padding: 8px 12px;
    background: var(--danger-bg);
    color: var(--danger-color);
    border-radius: 4px;
    font-size: 13px;
  }
}
</style>
