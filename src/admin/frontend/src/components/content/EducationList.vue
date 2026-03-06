<script setup lang="ts">
/**
 * 教育经历管理组件
 * 支持学校信息 CRUD、课程成绩管理、荣誉奖项管理
 * 
 * 需求: 3.2.1-3.2.3
 */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Upload, Document } from '@element-plus/icons-vue'
import type { Education } from '@/types'
import {
  getEducationList,
  createEducation,
  updateEducation,
  deleteEducation,
  importCourses
} from '@/api/content'

// 定义事件
const emit = defineEmits<{
  (e: 'saved'): void
}>()

// 教育经历列表
const educationList = ref<Education[]>([])
const loading = ref(false)

// 对话框状态
const dialogVisible = ref(false)
const dialogTitle = ref('添加教育经历')
const isEditing = ref(false)
const saving = ref(false)

// 表单数据
const formData = reactive<Partial<Education>>({
  id: '',
  school: '',
  college: '',
  major: '',
  period: '',
  rank: '',
  honors: [],
  courses: [],
  sortOrder: 0
})

// 课程成绩输入
const newCourse = reactive({ name: '', score: 0 })
// 荣誉奖项输入
const newHonor = ref('')
// 批量导入对话框
const importDialogVisible = ref(false)
const importText = ref('')
// 文件导入对话框
const fileImportDialogVisible = ref(false)
const fileImporting = ref(false)
const selectedFile = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

/**
 * 加载教育经历列表
 */
async function loadEducationList() {
  loading.value = true
  try {
    const res = await getEducationList() as any
    educationList.value = res.data || []
  } catch (error) {
    console.error('加载教育经历失败:', error)
    ElMessage.error('加载教育经历失败')
  } finally {
    loading.value = false
  }
}

/**
 * 打开添加对话框
 */
function handleAdd() {
  dialogTitle.value = '添加教育经历'
  isEditing.value = false
  resetForm()
  dialogVisible.value = true
}

/**
 * 打开编辑对话框
 */
function handleEdit(row: Education) {
  dialogTitle.value = '编辑教育经历'
  isEditing.value = true
  Object.assign(formData, {
    id: row.id,
    school: row.school,
    college: row.college || '',
    major: row.major,
    period: row.period,
    rank: row.rank || '',
    honors: [...(row.honors || [])],
    courses: [...(row.courses || [])],
    sortOrder: row.sortOrder || 0
  })
  dialogVisible.value = true
}

/**
 * 删除教育经历
 */
async function handleDelete(row: Education) {
  try {
    await ElMessageBox.confirm(
      `确定要删除 "${row.school}" 的教育经历吗？`,
      '删除确认',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    
    await deleteEducation(row.id)
    ElMessage.success('删除成功')
    loadEducationList()
    emit('saved')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除教育经历失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 保存教育经历
 */
async function handleSave() {
  // 验证必填字段
  if (!formData.school?.trim()) {
    ElMessage.warning('请输入学校名称')
    return
  }
  if (!formData.major?.trim()) {
    ElMessage.warning('请输入专业名称')
    return
  }
  if (!formData.period?.trim()) {
    ElMessage.warning('请输入就读时间')
    return
  }
  
  saving.value = true
  try {
    const data = {
      school: formData.school,
      college: formData.college,
      major: formData.major,
      period: formData.period,
      rank: formData.rank,
      honors: formData.honors,
      courses: formData.courses,
      sort_order: formData.sortOrder
    }
    
    if (isEditing.value && formData.id) {
      await updateEducation(formData.id, data)
      ElMessage.success('更新成功')
    } else {
      await createEducation(data as any)
      ElMessage.success('添加成功')
    }
    
    dialogVisible.value = false
    loadEducationList()
    emit('saved')
  } catch (error) {
    console.error('保存教育经历失败:', error)
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
    school: '',
    college: '',
    major: '',
    period: '',
    rank: '',
    honors: [],
    courses: [],
    sortOrder: 0
  })
}

/**
 * 添加课程成绩
 */
function addCourse() {
  if (!newCourse.name.trim()) {
    ElMessage.warning('请输入课程名称')
    return
  }
  if (!formData.courses) {
    formData.courses = []
  }
  formData.courses.push({ name: newCourse.name, score: newCourse.score })
  newCourse.name = ''
  newCourse.score = 0
}

/**
 * 删除课程成绩
 */
function removeCourse(index: number) {
  formData.courses?.splice(index, 1)
}

/**
 * 添加荣誉奖项
 */
function addHonor() {
  if (!newHonor.value.trim()) {
    ElMessage.warning('请输入荣誉奖项')
    return
  }
  if (!formData.honors) {
    formData.honors = []
  }
  formData.honors.push(newHonor.value.trim())
  newHonor.value = ''
}

/**
 * 删除荣誉奖项
 */
function removeHonor(index: number) {
  formData.honors?.splice(index, 1)
}

/**
 * 打开批量导入对话框
 */
function openImportDialog() {
  importText.value = ''
  importDialogVisible.value = true
}

/**
 * 批量导入课程成绩
 * 格式：每行一条，课程名称和成绩用逗号或空格分隔
 */
function handleImportCourses() {
  if (!importText.value.trim()) {
    ElMessage.warning('请输入要导入的课程数据')
    return
  }
  
  const lines = importText.value.trim().split('\n')
  const courses: Array<{ name: string; score: number }> = []
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine) continue
    
    // 支持逗号或空格分隔
    const parts = trimmedLine.split(/[,，\s]+/)
    if (parts.length >= 2) {
      const name = parts[0].trim()
      const score = parseFloat(parts[1])
      if (name && !isNaN(score)) {
        courses.push({ name, score })
      }
    }
  }
  
  if (courses.length === 0) {
    ElMessage.warning('未能解析出有效的课程数据')
    return
  }
  
  if (!formData.courses) {
    formData.courses = []
  }
  formData.courses.push(...courses)
  importDialogVisible.value = false
  ElMessage.success(`成功导入 ${courses.length} 条课程成绩`)
}

/**
 * 打开文件导入对话框
 */
function openFileImportDialog() {
  selectedFile.value = null
  fileImportDialogVisible.value = true
}

/**
 * 处理文件选择
 */
function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    // 验证文件类型
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      ElMessage.error('只支持 Excel (.xlsx, .xls) 和 CSV 文件格式')
      return
    }
    // 验证文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      ElMessage.error('文件大小不能超过 5MB')
      return
    }
    selectedFile.value = file
  }
}

/**
 * 触发文件选择
 */
function triggerFileSelect() {
  fileInputRef.value?.click()
}

/**
 * 从文件导入课程成绩
 * 需求: 3.2.2 - 支持 Excel/CSV 格式导入
 */
async function handleFileImport() {
  if (!selectedFile.value) {
    ElMessage.warning('请选择要导入的文件')
    return
  }
  
  if (!formData.id) {
    ElMessage.warning('请先保存教育经历后再导入课程成绩')
    return
  }
  
  fileImporting.value = true
  try {
    const res = await importCourses(formData.id, selectedFile.value) as any
    
    // 更新本地数据
    if (res.courses && res.courses.length > 0) {
      if (!formData.courses) {
        formData.courses = []
      }
      formData.courses.push(...res.courses)
    }
    
    fileImportDialogVisible.value = false
    ElMessage.success(res.message || `成功导入 ${res.imported} 条课程成绩`)
    
    // 刷新列表
    loadEducationList()
    emit('saved')
  } catch (error: any) {
    console.error('文件导入失败:', error)
    const message = error.response?.data?.message || error.message || '导入失败'
    ElMessage.error(message)
  } finally {
    fileImporting.value = false
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadEducationList()
})
</script>

<template>
  <div class="education-list" v-loading="loading">
    <!-- 操作栏 -->
    <div class="toolbar">
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        添加教育经历
      </el-button>
    </div>
    
    <!-- 教育经历列表 -->
    <div class="list-container">
      <el-table :data="educationList" stripe>
        <el-table-column prop="school" label="学校" min-width="150" />
        <el-table-column prop="college" label="学院" min-width="120" />
        <el-table-column prop="major" label="专业" min-width="120" />
        <el-table-column prop="period" label="就读时间" width="180" />
        <el-table-column prop="rank" label="排名" width="100" />
        <el-table-column label="荣誉奖项" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.honors?.length" type="success" size="small">
              {{ row.honors.length }} 项
            </el-tag>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="课程成绩" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.courses?.length" type="info" size="small">
              {{ row.courses.length }} 门
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
      width="700px"
      destroy-on-close
    >
      <el-form :model="formData" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="学校" required>
              <el-input v-model="formData.school" placeholder="请输入学校名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="学院">
              <el-input v-model="formData.college" placeholder="请输入学院名称" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="专业" required>
              <el-input v-model="formData.major" placeholder="请输入专业名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="就读时间" required>
              <el-input v-model="formData.period" placeholder="如：2018.09 - 2022.06" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="排名">
              <el-input v-model="formData.rank" placeholder="如：前 10%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排序">
              <el-input-number v-model="formData.sortOrder" :min="0" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <!-- 荣誉奖项 -->
        <el-form-item label="荣誉奖项">
          <div class="sub-form">
            <div class="input-row">
              <el-input
                v-model="newHonor"
                placeholder="输入荣誉奖项，按回车添加"
                @keyup.enter="addHonor"
              >
                <template #append>
                  <el-button @click="addHonor">添加</el-button>
                </template>
              </el-input>
            </div>
            <div class="tag-list" v-if="formData.honors?.length">
              <el-tag
                v-for="(honor, index) in formData.honors"
                :key="index"
                closable
                type="success"
                @close="removeHonor(index)"
              >
                {{ honor }}
              </el-tag>
            </div>
          </div>
        </el-form-item>
        
        <!-- 课程成绩 -->
        <el-form-item label="课程成绩">
          <div class="sub-form">
            <div class="input-row">
              <el-input
                v-model="newCourse.name"
                placeholder="课程名称"
                style="width: 200px; margin-right: 10px;"
              />
              <el-input-number
                v-model="newCourse.score"
                :min="0"
                :max="100"
                placeholder="成绩"
                style="width: 120px; margin-right: 10px;"
              />
              <el-button @click="addCourse">添加</el-button>
              <el-button type="success" @click="openImportDialog">
                <el-icon><Upload /></el-icon>
                文本导入
              </el-button>
              <el-button type="primary" @click="openFileImportDialog" :disabled="!isEditing">
                <el-icon><Document /></el-icon>
                文件导入
              </el-button>
            </div>
            <el-table
              v-if="formData.courses?.length"
              :data="formData.courses"
              size="small"
              style="margin-top: 10px;"
            >
              <el-table-column prop="name" label="课程名称" />
              <el-table-column prop="score" label="成绩" width="100" />
              <el-table-column label="操作" width="80">
                <template #default="{ $index }">
                  <el-button type="danger" size="small" link @click="removeCourse($index)">
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
    
    <!-- 批量导入对话框（文本方式） -->
    <el-dialog
      v-model="importDialogVisible"
      title="文本导入课程成绩"
      width="500px"
    >
      <el-alert
        title="导入格式说明"
        type="info"
        :closable="false"
        style="margin-bottom: 15px;"
      >
        每行一条记录，课程名称和成绩用逗号或空格分隔。<br />
        示例：<br />
        高等数学, 95<br />
        线性代数 88
      </el-alert>
      <el-input
        v-model="importText"
        type="textarea"
        :rows="10"
        placeholder="请粘贴课程成绩数据..."
      />
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleImportCourses">导入</el-button>
      </template>
    </el-dialog>
    
    <!-- 文件导入对话框（Excel/CSV） -->
    <el-dialog
      v-model="fileImportDialogVisible"
      title="文件导入课程成绩"
      width="550px"
    >
      <el-alert
        title="支持的文件格式"
        type="info"
        :closable="false"
        style="margin-bottom: 15px;"
      >
        <p>支持 Excel (.xlsx, .xls) 和 CSV 文件格式</p>
        <p style="margin-top: 8px;"><strong>文件格式要求：</strong></p>
        <ul style="margin: 5px 0 0 20px; padding: 0;">
          <li>第一列：课程名称</li>
          <li>第二列：成绩（0-100）</li>
          <li>可以有表头行（会自动跳过）</li>
        </ul>
      </el-alert>
      
      <!-- 隐藏的文件输入 -->
      <input
        ref="fileInputRef"
        type="file"
        accept=".xlsx,.xls,.csv"
        style="display: none;"
        @change="handleFileSelect"
      />
      
      <!-- 文件选择区域 -->
      <div class="file-upload-area" @click="triggerFileSelect">
        <el-icon class="upload-icon" :size="48"><Upload /></el-icon>
        <div class="upload-text">
          <span v-if="!selectedFile">点击选择文件或拖拽文件到此处</span>
          <span v-else class="selected-file">
            <el-icon><Document /></el-icon>
            {{ selectedFile.name }}
            <span class="file-size">({{ (selectedFile.size / 1024).toFixed(1) }} KB)</span>
          </span>
        </div>
        <div class="upload-hint">支持 .xlsx, .xls, .csv 格式，最大 5MB</div>
      </div>
      
      <template #footer>
        <el-button @click="fileImportDialogVisible = false">取消</el-button>
        <el-button 
          type="primary" 
          :loading="fileImporting" 
          :disabled="!selectedFile"
          @click="handleFileImport"
        >
          导入
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.education-list {
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
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }
  
  .tag-list {
    margin-top: 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
}

// 文件上传区域样式
.file-upload-area {
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: var(--bg-color-page);
  
  &:hover {
    border-color: var(--primary-color);
    background: var(--el-color-primary-light-9);
  }
  
  .upload-icon {
    color: var(--text-placeholder);
    margin-bottom: 10px;
  }
  
  .upload-text {
    font-size: 14px;
    color: var(--text-regular);
    margin-bottom: 8px;
    
    .selected-file {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      color: var(--primary-color);
      
      .file-size {
        color: var(--text-secondary);
        font-size: 12px;
      }
    }
  }
  
  .upload-hint {
    font-size: 12px;
    color: var(--text-secondary);
  }
}
</style>
