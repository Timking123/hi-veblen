<script setup lang="ts">
/**
 * 个人信息表单组件
 * 包含基本信息编辑、头像上传、简介富文本编辑、求职意向管理
 * 
 * 需求: 3.1.1-3.1.4
 */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Delete, Rank } from '@element-plus/icons-vue'
import type { Profile } from '@/types'
import { getProfile, updateProfile } from '@/api/content'
// @ts-ignore - vuedraggable 类型声明
import draggable from 'vuedraggable'

// 定义事件
const emit = defineEmits<{
  (e: 'saved'): void
}>()

// 表单引用
const formRef = ref<FormInstance>()

// 表单数据
const formData = reactive<Profile>({
  name: '',
  title: '',
  phone: '',
  email: '',
  avatar: '',
  summary: '',
  jobIntentions: []
})

// 表单验证规则
const rules = reactive<FormRules>({
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度应为 2-20 个字符', trigger: 'blur' }
  ],
  title: [
    { required: true, message: '请输入职位', trigger: 'blur' },
    { max: 50, message: '职位长度不能超过 50 个字符', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$|^$/, message: '请输入正确的手机号格式', trigger: 'blur' }
  ]
})

// 加载状态
const loading = ref(false)
const saving = ref(false)

// 新增求职意向输入
const newIntention = ref('')

// 头像上传相关
const avatarUrl = ref('')

// 前端网站基础 URL（用于显示头像）
const FRONTEND_BASE_URL = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173'

/**
 * 获取完整的头像 URL
 * 如果是相对路径，则拼接前端网站地址
 */
function getFullAvatarUrl(avatar: string): string {
  if (!avatar) return ''
  
  // 如果已经是完整 URL 或 data URL，直接返回
  if (avatar.startsWith('http') || avatar.startsWith('data:')) {
    return avatar
  }
  
  // 相对路径，拼接前端网站地址
  return `${FRONTEND_BASE_URL}${avatar}`
}

/**
 * 加载个人信息
 */
async function loadProfile() {
  loading.value = true
  try {
    const res = await getProfile() as any
    if (res.profile) {
      Object.assign(formData, {
        name: res.profile.name || '',
        title: res.profile.title || '',
        phone: res.profile.phone || '',
        email: res.profile.email || '',
        avatar: res.profile.avatar || '',
        summary: res.profile.summary || '',
        jobIntentions: res.profile.jobIntentions || res.profile.job_intentions || []
      })
      // 使用完整 URL 显示头像
      avatarUrl.value = getFullAvatarUrl(formData.avatar)
    }
  } catch (error) {
    console.error('加载个人信息失败:', error)
    ElMessage.error('加载个人信息失败')
  } finally {
    loading.value = false
  }
}

/**
 * 保存个人信息
 */
async function handleSave() {
  // 表单验证
  if (!formRef.value) return
  
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) {
    ElMessage.warning('请正确填写表单信息')
    return
  }
  
  saving.value = true
  try {
    // 转换字段名以匹配后端
    const data = {
      name: formData.name,
      title: formData.title,
      phone: formData.phone,
      email: formData.email,
      avatar: formData.avatar,
      summary: formData.summary,
      job_intentions: formData.jobIntentions
    }
    await updateProfile(data)
    ElMessage.success('保存成功')
    emit('saved')
  } catch (error) {
    console.error('保存个人信息失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

/**
 * 添加求职意向
 */
function addIntention() {
  const intention = newIntention.value.trim()
  if (!intention) {
    ElMessage.warning('请输入求职意向')
    return
  }
  if (formData.jobIntentions.includes(intention)) {
    ElMessage.warning('该求职意向已存在')
    return
  }
  formData.jobIntentions.push(intention)
  newIntention.value = ''
}

/**
 * 删除求职意向
 */
function removeIntention(index: number) {
  formData.jobIntentions.splice(index, 1)
}

/**
 * 处理头像上传
 */
function handleAvatarUpload(file: File) {
  // 验证文件类型
  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    ElMessage.error('只支持 JPG、PNG、WebP 格式的图片')
    return false
  }
  
  // 验证文件大小（最大 5MB）
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 5MB')
    return false
  }
  
  // 创建预览 URL
  const reader = new FileReader()
  reader.onload = (e) => {
    avatarUrl.value = e.target?.result as string
    formData.avatar = avatarUrl.value
  }
  reader.readAsDataURL(file)
  
  return false // 阻止默认上传行为
}

/**
 * 清除头像
 */
function clearAvatar() {
  ElMessageBox.confirm('确定要清除头像吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    avatarUrl.value = ''
    formData.avatar = ''
  }).catch(() => {})
}

// 组件挂载时加载数据
onMounted(() => {
  loadProfile()
})
</script>

<template>
  <div class="profile-form" v-loading="loading">
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="100px" label-position="top">
      <!-- 基本信息区域 -->
      <div class="form-section">
        <h3 class="section-title">基本信息</h3>
        
        <el-row :gutter="20">
          <!-- 头像上传 -->
          <el-col :span="8">
            <el-form-item label="头像">
              <div class="avatar-uploader">
                <el-upload
                  class="avatar-upload"
                  :show-file-list="false"
                  :before-upload="handleAvatarUpload"
                  accept="image/jpeg,image/png,image/webp"
                >
                  <div v-if="avatarUrl" class="avatar-preview">
                    <img :src="avatarUrl" alt="头像" />
                    <div class="avatar-actions">
                      <el-button type="primary" size="small" circle>
                        <el-icon><Plus /></el-icon>
                      </el-button>
                      <el-button type="danger" size="small" circle @click.stop="clearAvatar">
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                  </div>
                  <div v-else class="avatar-placeholder">
                    <el-icon class="avatar-icon"><Plus /></el-icon>
                    <span>上传头像</span>
                  </div>
                </el-upload>
              </div>
              <div class="avatar-tip">支持 JPG、PNG、WebP，最大 5MB</div>
            </el-form-item>
          </el-col>
          
          <!-- 基本信息表单 -->
          <el-col :span="16">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="姓名" prop="name" required>
                  <el-input v-model="formData.name" placeholder="请输入姓名" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="职位" prop="title" required>
                  <el-input v-model="formData.title" placeholder="请输入职位" />
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="电话" prop="phone">
                  <el-input v-model="formData.phone" placeholder="请输入电话" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="邮箱" prop="email">
                  <el-input v-model="formData.email" placeholder="请输入邮箱" type="email" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-col>
        </el-row>
      </div>
      
      <!-- 个人简介区域 -->
      <div class="form-section">
        <h3 class="section-title">个人简介</h3>
        <el-form-item>
          <el-input
            v-model="formData.summary"
            type="textarea"
            :rows="6"
            placeholder="请输入个人简介，支持多行文本"
          />
        </el-form-item>
      </div>
      
      <!-- 求职意向区域 -->
      <div class="form-section">
        <h3 class="section-title">求职意向</h3>
        
        <!-- 添加新意向 -->
        <div class="intention-input">
          <el-input
            v-model="newIntention"
            placeholder="输入求职意向，按回车添加"
            @keyup.enter="addIntention"
          >
            <template #append>
              <el-button @click="addIntention">
                <el-icon><Plus /></el-icon>
                添加
              </el-button>
            </template>
          </el-input>
        </div>
        
        <!-- 意向列表（支持拖拽排序） -->
        <div class="intention-list" v-if="formData.jobIntentions.length > 0">
          <draggable
            v-model="formData.jobIntentions"
            :item-key="(item: string) => item"
            handle=".drag-handle"
            animation="200"
          >
            <template #item="{ element, index }: { element: string; index: number }">
              <div class="intention-item">
                <el-icon class="drag-handle"><Rank /></el-icon>
                <span class="intention-text">{{ element }}</span>
                <el-button
                  type="danger"
                  size="small"
                  circle
                  @click="removeIntention(index)"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </template>
          </draggable>
        </div>
        <el-empty v-else description="暂无求职意向" :image-size="60" />
      </div>
      
      <!-- 保存按钮 -->
      <div class="form-actions">
        <el-button type="primary" size="large" :loading="saving" @click="handleSave">
          保存修改
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<style lang="scss" scoped>
.profile-form {
  padding: 20px;
}

.form-section {
  margin-bottom: 30px;
  padding: 20px;
  background: var(--card-bg);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
}

.section-title {
  margin: 0 0 20px;
  padding-bottom: 10px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
}

// 头像上传样式
.avatar-uploader {
  .avatar-upload {
    :deep(.el-upload) {
      border: 1px dashed #d9d9d9;
      border-radius: 8px;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: border-color 0.3s;
      
      &:hover {
        border-color: #409eff;
      }
    }
  }
}

.avatar-preview {
  width: 150px;
  height: 150px;
  position: relative;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
  }
  
  .avatar-actions {
    position: absolute;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 10px;
    opacity: 0;
    transition: opacity 0.3s;
  }
  
  &:hover .avatar-actions {
    opacity: 1;
  }
}

.avatar-placeholder {
  width: 150px;
  height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8c939d;
  
  .avatar-icon {
    font-size: 28px;
    margin-bottom: 8px;
  }
}

.avatar-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

// 求职意向样式
.intention-input {
  margin-bottom: 15px;
}

.intention-list {
  .intention-item {
    display: flex;
    align-items: center;
    padding: 10px 15px;
    margin-bottom: 8px;
    background: var(--bg-color-page);
    border-radius: 6px;
    transition: background 0.3s;
    
    &:hover {
      background: var(--info-card-bg);
    }
    
    .drag-handle {
      cursor: move;
      color: var(--text-secondary);
      margin-right: 12px;
      font-size: 16px;
    }
    
    .intention-text {
      flex: 1;
      font-size: 14px;
      color: var(--text-primary);
    }
  }
}

// 表单操作按钮
.form-actions {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}
</style>
