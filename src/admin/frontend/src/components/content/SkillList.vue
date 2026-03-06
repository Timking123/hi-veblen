<script setup lang="ts">
/**
 * 技能列表管理组件
 * 支持技能 CRUD 操作（名称、等级、分类、经验描述）
 * 
 * 需求: 3.4.1, 3.4.3
 */
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import type { Skill } from '@/types'
import {
  getSkillList,
  createSkill,
  updateSkill,
  deleteSkill
} from '@/api/content'

// 定义事件
const emit = defineEmits<{
  (e: 'saved'): void
}>()

// 技能分类选项
const categoryOptions = [
  { value: 'frontend', label: '前端' },
  { value: 'backend', label: '后端' },
  { value: 'tools', label: '工具' },
  { value: 'other', label: '其他' }
]

// 技能列表
const skillList = ref<Skill[]>([])
const loading = ref(false)

// 筛选条件
const filterCategory = ref<string>('')

// 对话框状态
const dialogVisible = ref(false)
const dialogTitle = ref('添加技能')
const isEditing = ref(false)
const saving = ref(false)

// 表单数据
const formData = reactive<Partial<Skill>>({
  id: 0,
  name: '',
  level: 50,
  category: 'frontend',
  experience: '',
  projects: [],
  sortOrder: 0
})

// 新增项目输入
const newProject = ref('')

// 根据分类筛选后的列表
const filteredSkillList = computed(() => {
  if (!filterCategory.value) {
    return skillList.value
  }
  return skillList.value.filter(skill => skill.category === filterCategory.value)
})

/**
 * 获取分类标签类型
 */
function getCategoryTagType(category: string) {
  const typeMap: Record<string, string> = {
    frontend: 'primary',
    backend: 'success',
    tools: 'warning',
    other: 'info'
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
 * 加载技能列表
 */
async function loadSkillList() {
  loading.value = true
  try {
    const res = await getSkillList() as any
    skillList.value = res.data || []
  } catch (error) {
    console.error('加载技能列表失败:', error)
    ElMessage.error('加载技能列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 打开添加对话框
 */
function handleAdd() {
  dialogTitle.value = '添加技能'
  isEditing.value = false
  resetForm()
  dialogVisible.value = true
}

/**
 * 打开编辑对话框
 */
function handleEdit(row: Skill) {
  dialogTitle.value = '编辑技能'
  isEditing.value = true
  Object.assign(formData, {
    id: row.id,
    name: row.name,
    level: row.level,
    category: row.category,
    experience: row.experience || '',
    projects: [...(row.projects || [])],
    sortOrder: row.sortOrder || 0
  })
  dialogVisible.value = true
}

/**
 * 删除技能
 */
async function handleDelete(row: Skill) {
  try {
    await ElMessageBox.confirm(
      `确定要删除技能 "${row.name}" 吗？`,
      '删除确认',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    
    await deleteSkill(row.id)
    ElMessage.success('删除成功')
    loadSkillList()
    emit('saved')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除技能失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 保存技能
 */
async function handleSave() {
  // 验证必填字段
  if (!formData.name?.trim()) {
    ElMessage.warning('请输入技能名称')
    return
  }
  if (formData.level === undefined || formData.level < 0 || formData.level > 100) {
    ElMessage.warning('技能等级必须在 0-100 之间')
    return
  }
  if (!formData.category) {
    ElMessage.warning('请选择技能分类')
    return
  }
  
  saving.value = true
  try {
    const data = {
      name: formData.name,
      level: formData.level,
      category: formData.category,
      experience: formData.experience,
      projects: formData.projects,
      sort_order: formData.sortOrder
    }
    
    if (isEditing.value && formData.id) {
      await updateSkill(formData.id, data)
      ElMessage.success('更新成功')
    } else {
      await createSkill(data as any)
      ElMessage.success('添加成功')
    }
    
    dialogVisible.value = false
    loadSkillList()
    emit('saved')
  } catch (error) {
    console.error('保存技能失败:', error)
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
    id: 0,
    name: '',
    level: 50,
    category: 'frontend',
    experience: '',
    projects: [],
    sortOrder: 0
  })
}

/**
 * 添加相关项目
 */
function addProject() {
  if (!newProject.value.trim()) {
    ElMessage.warning('请输入项目名称')
    return
  }
  if (!formData.projects) {
    formData.projects = []
  }
  formData.projects.push(newProject.value.trim())
  newProject.value = ''
}

/**
 * 删除相关项目
 */
function removeProject(index: number) {
  formData.projects?.splice(index, 1)
}

// 组件挂载时加载数据
onMounted(() => {
  loadSkillList()
})
</script>

<template>
  <div class="skill-list" v-loading="loading">
    <!-- 操作栏 -->
    <div class="toolbar">
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        添加技能
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
    
    <!-- 技能列表 -->
    <div class="list-container">
      <el-table :data="filteredSkillList" stripe>
        <el-table-column prop="name" label="技能名称" min-width="120" />
        <el-table-column label="熟练度" width="200">
          <template #default="{ row }">
            <div class="level-cell">
              <el-progress
                :percentage="row.level"
                :stroke-width="10"
                :color="row.level >= 80 ? '#67c23a' : row.level >= 50 ? '#409eff' : '#e6a23c'"
              />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="100">
          <template #default="{ row }">
            <el-tag :type="getCategoryTagType(row.category)" size="small">
              {{ getCategoryLabel(row.category) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="experience" label="经验描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="相关项目" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.projects?.length" type="info" size="small">
              {{ row.projects.length }} 个
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
      width="600px"
      destroy-on-close
    >
      <el-form :model="formData" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="技能名称" required>
              <el-input v-model="formData.name" placeholder="请输入技能名称" />
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
        
        <el-form-item label="熟练度" required>
          <div class="level-slider">
            <el-slider v-model="formData.level" :min="0" :max="100" show-input />
          </div>
        </el-form-item>
        
        <el-form-item label="经验描述">
          <el-input
            v-model="formData.experience"
            type="textarea"
            :rows="3"
            placeholder="描述使用该技能的经验"
          />
        </el-form-item>
        
        <el-form-item label="相关项目">
          <div class="sub-form">
            <div class="input-row">
              <el-input
                v-model="newProject"
                placeholder="输入项目名称，按回车添加"
                @keyup.enter="addProject"
              >
                <template #append>
                  <el-button @click="addProject">添加</el-button>
                </template>
              </el-input>
            </div>
            <div class="tag-list" v-if="formData.projects?.length">
              <el-tag
                v-for="(project, index) in formData.projects"
                :key="index"
                closable
                @close="removeProject(index)"
              >
                {{ project }}
              </el-tag>
            </div>
          </div>
        </el-form-item>
        
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
.skill-list {
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

.level-cell {
  padding-right: 20px;
}

.level-slider {
  width: 100%;
  padding-right: 20px;
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
</style>
