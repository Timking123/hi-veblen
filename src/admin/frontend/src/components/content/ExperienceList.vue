<script setup lang="ts">
/**
 * 工作经历管理组件
 * 支持公司/职位信息 CRUD、工作职责富文本编辑、工作成果数据管理
 * 
 * 需求: 3.3.1-3.3.3
 */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import type { Experience } from '@/types'
import {
  getExperienceList,
  createExperience,
  updateExperience,
  deleteExperience
} from '@/api/content'

// 定义事件
const emit = defineEmits<{
  (e: 'saved'): void
}>()

// 工作经历列表
const experienceList = ref<Experience[]>([])
const loading = ref(false)

// 对话框状态
const dialogVisible = ref(false)
const dialogTitle = ref('添加工作经历')
const isEditing = ref(false)
const saving = ref(false)

// 表单数据
const formData = reactive<Partial<Experience>>({
  id: '',
  company: '',
  position: '',
  period: '',
  responsibilities: [],
  achievements: [],
  sortOrder: 0
})

// 工作职责输入
const newResponsibility = ref('')
// 工作成果输入
const newAchievement = reactive({ metric: '', value: '' })

/**
 * 加载工作经历列表
 */
async function loadExperienceList() {
  loading.value = true
  try {
    const res = await getExperienceList() as any
    experienceList.value = res.data || []
  } catch (error) {
    console.error('加载工作经历失败:', error)
    ElMessage.error('加载工作经历失败')
  } finally {
    loading.value = false
  }
}

/**
 * 打开添加对话框
 */
function handleAdd() {
  dialogTitle.value = '添加工作经历'
  isEditing.value = false
  resetForm()
  dialogVisible.value = true
}

/**
 * 打开编辑对话框
 */
function handleEdit(row: Experience) {
  dialogTitle.value = '编辑工作经历'
  isEditing.value = true
  Object.assign(formData, {
    id: row.id,
    company: row.company,
    position: row.position,
    period: row.period,
    responsibilities: [...(row.responsibilities || [])],
    achievements: [...(row.achievements || [])],
    sortOrder: row.sortOrder || 0
  })
  dialogVisible.value = true
}

/**
 * 删除工作经历
 */
async function handleDelete(row: Experience) {
  try {
    await ElMessageBox.confirm(
      `确定要删除在 "${row.company}" 的工作经历吗？`,
      '删除确认',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    
    await deleteExperience(row.id)
    ElMessage.success('删除成功')
    loadExperienceList()
    emit('saved')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除工作经历失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 保存工作经历
 */
async function handleSave() {
  // 验证必填字段
  if (!formData.company?.trim()) {
    ElMessage.warning('请输入公司名称')
    return
  }
  if (!formData.position?.trim()) {
    ElMessage.warning('请输入职位名称')
    return
  }
  if (!formData.period?.trim()) {
    ElMessage.warning('请输入工作时间')
    return
  }
  
  saving.value = true
  try {
    const data = {
      company: formData.company,
      position: formData.position,
      period: formData.period,
      responsibilities: formData.responsibilities,
      achievements: formData.achievements,
      sort_order: formData.sortOrder
    }
    
    if (isEditing.value && formData.id) {
      await updateExperience(formData.id, data)
      ElMessage.success('更新成功')
    } else {
      await createExperience(data as any)
      ElMessage.success('添加成功')
    }
    
    dialogVisible.value = false
    loadExperienceList()
    emit('saved')
  } catch (error) {
    console.error('保存工作经历失败:', error)
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
    company: '',
    position: '',
    period: '',
    responsibilities: [],
    achievements: [],
    sortOrder: 0
  })
}

/**
 * 添加工作职责
 */
function addResponsibility() {
  if (!newResponsibility.value.trim()) {
    ElMessage.warning('请输入工作职责')
    return
  }
  if (!formData.responsibilities) {
    formData.responsibilities = []
  }
  formData.responsibilities.push(newResponsibility.value.trim())
  newResponsibility.value = ''
}

/**
 * 删除工作职责
 */
function removeResponsibility(index: number) {
  formData.responsibilities?.splice(index, 1)
}

/**
 * 添加工作成果
 */
function addAchievement() {
  if (!newAchievement.metric.trim()) {
    ElMessage.warning('请输入成果指标')
    return
  }
  if (!newAchievement.value.trim()) {
    ElMessage.warning('请输入成果数值')
    return
  }
  if (!formData.achievements) {
    formData.achievements = []
  }
  formData.achievements.push({
    metric: newAchievement.metric.trim(),
    value: newAchievement.value.trim()
  })
  newAchievement.metric = ''
  newAchievement.value = ''
}

/**
 * 删除工作成果
 */
function removeAchievement(index: number) {
  formData.achievements?.splice(index, 1)
}

// 组件挂载时加载数据
onMounted(() => {
  loadExperienceList()
})
</script>

<template>
  <div class="experience-list" v-loading="loading">
    <!-- 操作栏 -->
    <div class="toolbar">
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        添加工作经历
      </el-button>
    </div>
    
    <!-- 工作经历列表 -->
    <div class="list-container">
      <el-table :data="experienceList" stripe>
        <el-table-column prop="company" label="公司" min-width="150" />
        <el-table-column prop="position" label="职位" min-width="120" />
        <el-table-column prop="period" label="工作时间" width="180" />
        <el-table-column label="工作职责" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.responsibilities?.length" type="info" size="small">
              {{ row.responsibilities.length }} 项
            </el-tag>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="工作成果" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.achievements?.length" type="success" size="small">
              {{ row.achievements.length }} 项
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
      width="750px"
      destroy-on-close
    >
      <el-form :model="formData" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="公司" required>
              <el-input v-model="formData.company" placeholder="请输入公司名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="职位" required>
              <el-input v-model="formData.position" placeholder="请输入职位名称" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="工作时间" required>
              <el-input v-model="formData.period" placeholder="如：2020.07 - 至今" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排序">
              <el-input-number v-model="formData.sortOrder" :min="0" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <!-- 工作职责 -->
        <el-form-item label="工作职责">
          <div class="sub-form">
            <div class="input-row">
              <el-input
                v-model="newResponsibility"
                type="textarea"
                :rows="2"
                placeholder="输入工作职责描述，按回车添加"
                @keyup.enter.prevent="addResponsibility"
                style="flex: 1;"
              />
              <el-button @click="addResponsibility" style="margin-left: 10px;">
                添加
              </el-button>
            </div>
            <div class="responsibility-list" v-if="formData.responsibilities?.length">
              <div
                v-for="(item, index) in formData.responsibilities"
                :key="index"
                class="responsibility-item"
              >
                <span class="item-index">{{ index + 1 }}.</span>
                <span class="item-text">{{ item }}</span>
                <el-button
                  type="danger"
                  size="small"
                  link
                  @click="removeResponsibility(index)"
                >
                  删除
                </el-button>
              </div>
            </div>
          </div>
        </el-form-item>
        
        <!-- 工作成果 -->
        <el-form-item label="工作成果">
          <div class="sub-form">
            <div class="input-row">
              <el-input
                v-model="newAchievement.metric"
                placeholder="成果指标（如：用户增长）"
                style="width: 200px; margin-right: 10px;"
              />
              <el-input
                v-model="newAchievement.value"
                placeholder="成果数值（如：提升 50%）"
                style="width: 200px; margin-right: 10px;"
              />
              <el-button @click="addAchievement">添加</el-button>
            </div>
            <el-table
              v-if="formData.achievements?.length"
              :data="formData.achievements"
              size="small"
              style="margin-top: 10px;"
            >
              <el-table-column prop="metric" label="成果指标" />
              <el-table-column prop="value" label="成果数值" />
              <el-table-column label="操作" width="80">
                <template #default="{ $index }">
                  <el-button type="danger" size="small" link @click="removeAchievement($index)">
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
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
.experience-list {
  padding: 20px;
}

.toolbar {
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

.sub-form {
  width: 100%;
  
  .input-row {
    display: flex;
    align-items: flex-start;
  }
}

.responsibility-list {
  margin-top: 10px;
  
  .responsibility-item {
    display: flex;
    align-items: flex-start;
    padding: 10px 15px;
    margin-bottom: 8px;
    background: var(--bg-color-page);
    border-radius: 6px;
    
    .item-index {
      color: var(--primary-color);
      font-weight: 600;
      margin-right: 8px;
      min-width: 24px;
    }
    
    .item-text {
      flex: 1;
      line-height: 1.5;
      color: var(--text-primary);
    }
  }
}
</style>
