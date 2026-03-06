<script setup lang="ts">
/**
 * 项目管理组件
 * 支持项目信息 CRUD、截图上传、技术标签管理、分类筛选
 * 
 * 需求: 3.5.1-3.5.4
 */
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Picture } from '@element-plus/icons-vue'
import type { Project } from '@/types'
import {
  getProjectList,
  createProject,
  updateProject,
  deleteProject
} from '@/api/content'

// 定义事件
const emit = defineEmits<{
  (e: 'saved'): void
}>()

// 项目分类选项
const categoryOptions = [
  { value: 'work', label: '工作项目' },
  { value: 'personal', label: '个人项目' },
  { value: 'opensource', label: '开源项目' }
]

// 项目列表
const projectList = ref<Project[]>([])
const loading = ref(false)

// 筛选条件
const filterCategory = ref<string>('')

// 对话框状态
const dialogVisible = ref(false)
const dialogTitle = ref('添加项目')
const isEditing = ref(false)
const saving = ref(false)

// 表单数据
const formData = reactive<Partial<Project>>({
  id: '',
  name: '',
  description: '',
  period: '',
  role: '',
  technologies: [],
  highlights: [],
  screenshots: [],
  demoUrl: '',
  sourceUrl: '',
  category: 'personal',
  sortOrder: 0
})

// 新增输入
const newTechnology = ref('')
const newHighlight = ref('')
const newScreenshot = ref('')

// 根据分类筛选后的列表
const filteredProjectList = computed(() => {
  if (!filterCategory.value) {
    return projectList.value
  }
  return projectList.value.filter(project => project.category === filterCategory.value)
})

/**
 * 获取分类标签类型
 */
function getCategoryTagType(category: string) {
  const typeMap: Record<string, string> = {
    work: 'primary',
    personal: 'success',
    opensource: 'warning'
  }
  return typeMap[category] || 'info'
}

/**
 * 获取分类标签文本
 */
function getCategoryLabel(category: string) {
  const option = categoryOptions.find(opt => opt.value === category)
  return option?.label || category
}

/**
 * 加载项目列表
 */
async function loadProjectList() {
  loading.value = true
  try {
    const res = await getProjectList() as any
    projectList.value = res.data || []
  } catch (error) {
    console.error('加载项目列表失败:', error)
    ElMessage.error('加载项目列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 打开添加对话框
 */
function handleAdd() {
  dialogTitle.value = '添加项目'
  isEditing.value = false
  resetForm()
  dialogVisible.value = true
}

/**
 * 打开编辑对话框
 */
function handleEdit(row: Project) {
  dialogTitle.value = '编辑项目'
  isEditing.value = true
  Object.assign(formData, {
    id: row.id,
    name: row.name,
    description: row.description || '',
    period: row.period || '',
    role: row.role || '',
    technologies: [...(row.technologies || [])],
    highlights: [...(row.highlights || [])],
    screenshots: [...(row.screenshots || [])],
    demoUrl: row.demoUrl || '',
    sourceUrl: row.sourceUrl || '',
    category: row.category,
    sortOrder: row.sortOrder || 0
  })
  dialogVisible.value = true
}

/**
 * 删除项目
 */
async function handleDelete(row: Project) {
  try {
    await ElMessageBox.confirm(
      `确定要删除项目 "${row.name}" 吗？`,
      '删除确认',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    
    await deleteProject(row.id)
    ElMessage.success('删除成功')
    loadProjectList()
    emit('saved')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除项目失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 保存项目
 */
async function handleSave() {
  // 验证必填字段
  if (!formData.name?.trim()) {
    ElMessage.warning('请输入项目名称')
    return
  }
  if (!formData.category) {
    ElMessage.warning('请选择项目分类')
    return
  }
  
  saving.value = true
  try {
    const data = {
      name: formData.name,
      description: formData.description,
      period: formData.period,
      role: formData.role,
      technologies: formData.technologies,
      highlights: formData.highlights,
      screenshots: formData.screenshots,
      demo_url: formData.demoUrl,
      source_url: formData.sourceUrl,
      category: formData.category,
      sort_order: formData.sortOrder
    }
    
    if (isEditing.value && formData.id) {
      await updateProject(formData.id, data)
      ElMessage.success('更新成功')
    } else {
      await createProject(data as any)
      ElMessage.success('添加成功')
    }
    
    dialogVisible.value = false
    loadProjectList()
    emit('saved')
  } catch (error) {
    console.error('保存项目失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

/**
 * 重置表单
 */
function resetForm() {
  Object.assign(formData, {
    id: '',
    name: '',
    description: '',
    period: '',
    role: '',
    technologies: [],
    highlights: [],
    screenshots: [],
    demoUrl: '',
    sourceUrl: '',
    category: 'personal',
    sortOrder: 0
  })
}

/**
 * 添加技术标签
 */
function addTechnology() {
  if (!newTechnology.value.trim()) {
    ElMessage.warning('请输入技术名称')
    return
  }
  if (!formData.technologies) {
    formData.technologies = []
  }
  if (formData.technologies.includes(newTechnology.value.trim())) {
    ElMessage.warning('该技术标签已存在')
    return
  }
  formData.technologies.push(newTechnology.value.trim())
  newTechnology.value = ''
}

/**
 * 删除技术标签
 */
function removeTechnology(index: number) {
  formData.technologies?.splice(index, 1)
}

/**
 * 添加项目亮点
 */
function addHighlight() {
  if (!newHighlight.value.trim()) {
    ElMessage.warning('请输入项目亮点')
    return
  }
  if (!formData.highlights) {
    formData.highlights = []
  }
  formData.highlights.push(newHighlight.value.trim())
  newHighlight.value = ''
}

/**
 * 删除项目亮点
 */
function removeHighlight(index: number) {
  formData.highlights?.splice(index, 1)
}

/**
 * 添加截图 URL
 */
function addScreenshot() {
  if (!newScreenshot.value.trim()) {
    ElMessage.warning('请输入截图 URL')
    return
  }
  if (!formData.screenshots) {
    formData.screenshots = []
  }
  formData.screenshots.push(newScreenshot.value.trim())
  newScreenshot.value = ''
}

/**
 * 删除截图
 */
function removeScreenshot(index: number) {
  formData.screenshots?.splice(index, 1)
}

// 组件挂载时加载数据
onMounted(() => {
  loadProjectList()
})
</script>

<template>
  <div class="project-list" v-loading="loading">
    <!-- 操作栏 -->
    <div class="toolbar">
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        添加项目
      </el-button>
      
      <el-select
        v-model="filterCategory"
        placeholder="按分类筛选"
        clearable
        style="width: 150px; margin-left: 15px;"
      >
        <el-option
          v-for="opt in categoryOptions"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
    </div>
    
    <!-- 项目列表 -->
    <div class="list-container">
      <el-table :data="filteredProjectList" stripe>
        <el-table-column prop="name" label="项目名称" min-width="150" />
        <el-table-column label="分类" width="100">
          <template #default="{ row }">
            <el-tag :type="getCategoryTagType(row.category)" size="small">
              {{ getCategoryLabel(row.category) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="period" label="时间" width="150" />
        <el-table-column prop="role" label="角色" width="120" />
        <el-table-column label="技术栈" min-width="200">
          <template #default="{ row }">
            <div class="tech-tags" v-if="row.technologies?.length">
              <el-tag
                v-for="(tech, index) in row.technologies.slice(0, 3)"
                :key="index"
                size="small"
                type="info"
              >
                {{ tech }}
              </el-tag>
              <el-tag v-if="row.technologies.length > 3" size="small" type="info">
                +{{ row.technologies.length - 3 }}
              </el-tag>
            </div>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="截图" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.screenshots?.length" type="success" size="small">
              <el-icon><Picture /></el-icon>
              {{ row.screenshots.length }}
            </el-tag>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="handleEdit(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="danger" size="small" link @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="800px"
      destroy-on-close
    >
      <el-form :model="formData" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="项目名称" required>
              <el-input v-model="formData.name" placeholder="请输入项目名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分类" required>
              <el-select v-model="formData.category" placeholder="请选择分类" style="width: 100%;">
                <el-option
                  v-for="opt in categoryOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="时间">
              <el-input v-model="formData.period" placeholder="如：2023.01 - 2023.06" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="角色">
              <el-input v-model="formData.role" placeholder="如：前端负责人" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="项目描述">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入项目描述"
          />
        </el-form-item>
        
        <!-- 技术标签 -->
        <el-form-item label="技术栈">
          <div class="sub-form">
            <div class="input-row">
              <el-input
                v-model="newTechnology"
                placeholder="输入技术名称，按回车添加"
                @keyup.enter="addTechnology"
              >
                <template #append>
                  <el-button @click="addTechnology">添加</el-button>
                </template>
              </el-input>
            </div>
            <div class="tag-list" v-if="formData.technologies?.length">
              <el-tag
                v-for="(tech, index) in formData.technologies"
                :key="index"
                closable
                type="info"
                @close="removeTechnology(index)"
              >
                {{ tech }}
              </el-tag>
            </div>
          </div>
        </el-form-item>
        
        <!-- 项目亮点 -->
        <el-form-item label="项目亮点">
          <div class="sub-form">
            <div class="input-row">
              <el-input
                v-model="newHighlight"
                placeholder="输入项目亮点，按回车添加"
                @keyup.enter="addHighlight"
              >
                <template #append>
                  <el-button @click="addHighlight">添加</el-button>
                </template>
              </el-input>
            </div>
            <div class="highlight-list" v-if="formData.highlights?.length">
              <div
                v-for="(item, index) in formData.highlights"
                :key="index"
                class="highlight-item"
              >
                <span class="item-bullet">•</span>
                <span class="item-text">{{ item }}</span>
                <el-button type="danger" size="small" link @click="removeHighlight(index)">
                  删除
                </el-button>
              </div>
            </div>
          </div>
        </el-form-item>
        
        <!-- 项目截图 -->
        <el-form-item label="项目截图">
          <div class="sub-form">
            <div class="input-row">
              <el-input
                v-model="newScreenshot"
                placeholder="输入截图 URL"
                @keyup.enter="addScreenshot"
              >
                <template #append>
                  <el-button @click="addScreenshot">添加</el-button>
                </template>
              </el-input>
            </div>
            <div class="screenshot-list" v-if="formData.screenshots?.length">
              <div
                v-for="(url, index) in formData.screenshots"
                :key="index"
                class="screenshot-item"
              >
                <el-image
                  :src="url"
                  fit="cover"
                  :preview-src-list="formData.screenshots"
                  :initial-index="index"
                  class="screenshot-thumb"
                />
                <el-button type="danger" size="small" circle @click="removeScreenshot(index)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="演示链接">
              <el-input v-model="formData.demoUrl" placeholder="项目演示地址" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="源码链接">
              <el-input v-model="formData.sourceUrl" placeholder="源码仓库地址" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="排序">
          <el-input-number v-model="formData.sortOrder" :min="0" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.project-list {
  padding: 20px;
}

.toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.list-container {
  background: var(--bg-color);
  border-radius: 8px;
  padding: 20px;
}

.text-muted {
  color: var(--text-secondary);
}

.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.sub-form {
  width: 100%;
  
  .input-row {
    margin-bottom: 10px;
  }
  
  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
}

.highlight-list {
  margin-top: 10px;
  
  .highlight-item {
    display: flex;
    align-items: flex-start;
    padding: 8px 12px;
    margin-bottom: 6px;
    background: var(--bg-color-page);
    border-radius: 4px;
    
    .item-bullet {
      color: var(--primary-color);
      margin-right: 8px;
    }
    
    .item-text {
      flex: 1;
      color: var(--text-primary);
    }
  }
}

.screenshot-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
  
  .screenshot-item {
    position: relative;
    
    .screenshot-thumb {
      width: 100px;
      height: 75px;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .el-button {
      position: absolute;
      top: -8px;
      right: -8px;
    }
  }
}
</style>
