<script setup lang="ts">
/**
 * Meta 配置表单组件
 * 支持各页面标题、描述、关键词和 Open Graph 标签配置
 * 
 * 需求: 7.1.1-7.1.4
 */
import { ref, reactive, onMounted, computed } from 'vue'
import {
  ElCard,
  ElForm,
  ElFormItem,
  ElInput,
  ElButton,
  ElTag,
  ElMessage,
  ElCollapse,
  ElCollapseItem,
  ElDivider,
  ElIcon,
  ElTooltip,
  type FormInstance,
  type FormRules
} from 'element-plus'
import {
  Document,
  Picture,
  Refresh,
  Check,
  InfoFilled
} from '@element-plus/icons-vue'
import {
  getAllMeta,
  updateMeta,
  PAGE_NAMES,
  DEFAULT_PAGES,
  type PageMeta,
  type PageIdentifier,
  type PageMetaInput
} from '@/api/seo'

// ========== 状态定义 ==========

// 加载状态
const loading = ref(false)
const saveLoading = ref<Record<string, boolean>>({})

// 所有页面的 Meta 配置
const metaList = ref<PageMeta[]>([])

// 当前编辑的页面
const activePages = ref<string[]>(['home'])

// 关键词输入
const keywordInputs = reactive<Record<string, string>>({})

// 表单引用
const formRefs = ref<Record<string, FormInstance>>({})

// 表单验证规则
const rules = reactive<FormRules>({
  title: [
    { required: true, message: '请输入页面标题', trigger: 'blur' },
    { min: 5, max: 100, message: '标题长度应为 5-100 个字符', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入页面描述', trigger: 'blur' },
    { min: 10, max: 300, message: '描述长度应为 10-300 个字符', trigger: 'blur' }
  ]
})

// ========== 计算属性 ==========

// 按页面分组的 Meta 配置
const metaByPage = computed(() => {
  const map: Record<string, PageMeta> = {}
  metaList.value.forEach(meta => {
    map[meta.page] = meta
  })
  return map
})

// ========== 方法定义 ==========

/**
 * 加载所有 Meta 配置
 */
async function loadMeta() {
  loading.value = true
  try {
    const res = await getAllMeta() as any
    metaList.value = res.data || []
    
    // 确保所有页面都有配置
    DEFAULT_PAGES.forEach(page => {
      if (!metaByPage.value[page]) {
        metaList.value.push({
          page,
          title: '',
          description: '',
          keywords: []
        })
      }
    })
  } catch (error) {
    console.error('加载 Meta 配置失败:', error)
    ElMessage.error('加载 Meta 配置失败')
  } finally {
    loading.value = false
  }
}

/**
 * 保存单个页面的 Meta 配置
 */
async function saveMeta(page: PageIdentifier) {
  const meta = metaByPage.value[page]
  if (!meta) return
  
  // 表单验证
  const formRef = formRefs.value[page]
  if (formRef) {
    const valid = await formRef.validate().catch(() => false)
    if (!valid) {
      ElMessage.warning('请正确填写表单信息')
      return
    }
  }
  
  saveLoading.value[page] = true
  try {
    const input: PageMetaInput = {
      title: meta.title,
      description: meta.description,
      keywords: meta.keywords,
      ogTitle: meta.ogTitle,
      ogDescription: meta.ogDescription,
      ogImage: meta.ogImage
    }
    
    await updateMeta(page, input)
    ElMessage.success(`${PAGE_NAMES[page]}页面 Meta 配置保存成功`)
  } catch (error: any) {
    console.error('保存 Meta 配置失败:', error)
    ElMessage.error(error.message || '保存失败')
  } finally {
    saveLoading.value[page] = false
  }
}

/**
 * 添加关键词
 */
function addKeyword(page: PageIdentifier) {
  const keyword = keywordInputs[page]?.trim()
  if (!keyword) return
  
  const meta = metaByPage.value[page]
  if (!meta) return
  
  if (meta.keywords.includes(keyword)) {
    ElMessage.warning('关键词已存在')
    return
  }
  
  if (meta.keywords.length >= 20) {
    ElMessage.warning('关键词数量不能超过 20 个')
    return
  }
  
  meta.keywords.push(keyword)
  keywordInputs[page] = ''
}

/**
 * 删除关键词
 */
function removeKeyword(page: PageIdentifier, index: number) {
  const meta = metaByPage.value[page]
  if (!meta) return
  meta.keywords.splice(index, 1)
}

/**
 * 处理关键词输入回车
 */
function handleKeywordEnter(page: PageIdentifier) {
  addKeyword(page)
}

/**
 * 使用标题作为 OG 标题
 */
function useAsOgTitle(page: PageIdentifier) {
  const meta = metaByPage.value[page]
  if (meta) {
    meta.ogTitle = meta.title
  }
}

/**
 * 使用描述作为 OG 描述
 */
function useAsOgDescription(page: PageIdentifier) {
  const meta = metaByPage.value[page]
  if (meta) {
    meta.ogDescription = meta.description
  }
}

// ========== 生命周期 ==========

onMounted(() => {
  loadMeta()
})
</script>

<template>
  <div class="meta-config-form" v-loading="loading">
    <!-- 说明卡片 -->
    <el-card shadow="never" class="info-card">
      <div class="info-content">
        <el-icon class="info-icon"><InfoFilled /></el-icon>
        <div class="info-text">
          <p><strong>Meta 配置说明：</strong></p>
          <ul>
            <li><strong>标题（Title）</strong>：显示在浏览器标签页和搜索结果中，建议 50-60 个字符</li>
            <li><strong>描述（Description）</strong>：显示在搜索结果中，建议 150-160 个字符</li>
            <li><strong>关键词（Keywords）</strong>：帮助搜索引擎理解页面内容，建议 5-10 个</li>
            <li><strong>Open Graph</strong>：用于社交媒体分享时的展示效果</li>
          </ul>
        </div>
      </div>
    </el-card>
    
    <!-- 页面配置折叠面板 -->
    <el-collapse v-model="activePages" class="meta-collapse">
      <el-collapse-item
        v-for="page in DEFAULT_PAGES"
        :key="page"
        :name="page"
      >
        <template #title>
          <div class="collapse-title">
            <el-icon><Document /></el-icon>
            <span>{{ PAGE_NAMES[page] }}</span>
            <el-tag v-if="metaByPage[page]?.title" type="success" size="small">已配置</el-tag>
            <el-tag v-else type="info" size="small">待配置</el-tag>
          </div>
        </template>
        
        <el-form
          v-if="metaByPage[page]"
          :ref="(el: FormInstance) => { if (el) formRefs[page] = el }"
          :model="metaByPage[page]"
          :rules="rules"
          label-width="120px"
          class="meta-form"
        >
          <!-- 基础 Meta 配置 -->
          <div class="form-section">
            <h4 class="section-title">基础配置</h4>
            
            <el-form-item label="页面标题" prop="title" required>
              <el-input
                v-model="metaByPage[page].title"
                placeholder="请输入页面标题"
                maxlength="100"
                show-word-limit
              />
            </el-form-item>
            
            <el-form-item label="页面描述" prop="description" required>
              <el-input
                v-model="metaByPage[page].description"
                type="textarea"
                :rows="3"
                placeholder="请输入页面描述"
                maxlength="300"
                show-word-limit
              />
            </el-form-item>
            
            <el-form-item label="关键词">
              <div class="keywords-container">
                <div class="keywords-input">
                  <el-input
                    v-model="keywordInputs[page]"
                    placeholder="输入关键词后按回车添加"
                    @keyup.enter="handleKeywordEnter(page)"
                  >
                    <template #append>
                      <el-button @click="addKeyword(page)">添加</el-button>
                    </template>
                  </el-input>
                </div>
                <div class="keywords-tags">
                  <el-tag
                    v-for="(keyword, index) in metaByPage[page].keywords"
                    :key="index"
                    closable
                    @close="removeKeyword(page, index)"
                  >
                    {{ keyword }}
                  </el-tag>
                  <span v-if="metaByPage[page].keywords.length === 0" class="no-keywords">
                    暂无关键词
                  </span>
                </div>
              </div>
            </el-form-item>
          </div>
          
          <el-divider />
          
          <!-- Open Graph 配置 -->
          <div class="form-section">
            <h4 class="section-title">
              <el-icon><Picture /></el-icon>
              Open Graph 配置
              <el-tooltip content="用于社交媒体分享时的展示效果" placement="top">
                <el-icon class="help-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </h4>
            
            <el-form-item label="OG 标题">
              <el-input
                v-model="metaByPage[page].ogTitle"
                placeholder="留空则使用页面标题"
                maxlength="100"
                show-word-limit
              >
                <template #append>
                  <el-button @click="useAsOgTitle(page)">使用标题</el-button>
                </template>
              </el-input>
            </el-form-item>
            
            <el-form-item label="OG 描述">
              <el-input
                v-model="metaByPage[page].ogDescription"
                type="textarea"
                :rows="2"
                placeholder="留空则使用页面描述"
                maxlength="300"
                show-word-limit
              >
              </el-input>
              <div class="form-item-extra">
                <el-button size="small" text @click="useAsOgDescription(page)">
                  使用页面描述
                </el-button>
              </div>
            </el-form-item>
            
            <el-form-item label="OG 图片">
              <el-input
                v-model="metaByPage[page].ogImage"
                placeholder="请输入图片 URL"
              />
              <div class="form-item-tip">
                建议尺寸：1200 x 630 像素
              </div>
            </el-form-item>
          </div>
          
          <!-- 操作按钮 -->
          <div class="form-actions">
            <el-button
              type="primary"
              :loading="saveLoading[page]"
              @click="saveMeta(page)"
            >
              <el-icon><Check /></el-icon>
              保存配置
            </el-button>
          </div>
        </el-form>
      </el-collapse-item>
    </el-collapse>
    
    <!-- 刷新按钮 -->
    <div class="refresh-bar">
      <el-button @click="loadMeta" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新配置
      </el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.meta-config-form {
  padding: 16px;
}

.info-card {
  margin-bottom: 20px;
  background: var(--success-card-bg);
  border-color: var(--success-card-border);
  
  :deep(.el-card__body) {
    padding: 16px;
  }
  
  .info-content {
    display: flex;
    gap: 12px;
    
    .info-icon {
      font-size: 24px;
      color: var(--success-color);
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

.meta-collapse {
  :deep(.el-collapse-item__header) {
    font-size: 15px;
    font-weight: 500;
  }
}

.collapse-title {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .el-icon {
    color: var(--primary-color);
  }
}

.meta-form {
  padding: 16px 0;
}

.form-section {
  .section-title {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0 0 16px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    
    .el-icon {
      color: var(--primary-color);
    }
    
    .help-icon {
      color: var(--text-secondary);
      cursor: help;
    }
  }
}

.keywords-container {
  width: 100%;
  
  .keywords-input {
    margin-bottom: 12px;
  }
  
  .keywords-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-height: 32px;
    
    .el-tag {
      cursor: default;
    }
    
    .no-keywords {
      color: var(--text-secondary);
      font-size: 13px;
    }
  }
}

.form-item-extra {
  margin-top: 4px;
}

.form-item-tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.refresh-bar {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}
</style>
