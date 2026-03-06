<script setup lang="ts">
/**
 * 登录页面
 * 提供用户名密码登录功能
 */
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { login } from '@/api/auth'
import { setAuthToken } from '@/api/request'

const router = useRouter()
const route = useRoute()

// 表单引用
const loginFormRef = ref<FormInstance>()

// 表单数据
const loginForm = reactive({
  username: '',
  password: ''
})

// 加载状态
const loading = ref(false)

// 表单验证规则
const rules = reactive<FormRules>({
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度应为 2-20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 32, message: '密码长度应为 6-32 个字符', trigger: 'blur' }
  ]
})

// 登录处理
const handleLogin = async () => {
  // 表单验证
  if (!loginFormRef.value) return
  
  const valid = await loginFormRef.value.validate().catch(() => false)
  if (!valid) {
    ElMessage.warning('请正确填写登录信息')
    return
  }
  
  loading.value = true
  
  try {
    // 调用登录 API
    const response = await login({
      username: loginForm.username,
      password: loginForm.password
    })
    
    // 使用 setAuthToken 保存 token（同时更新内存缓存和 localStorage）
    // 这样可以确保 axios 请求拦截器立即能获取到 token，避免竞态条件
    setAuthToken(response.token)
    
    console.log('[Login] Token 已通过 setAuthToken 保存')
    
    ElMessage.success('登录成功')
    
    // 使用 await 确保路由导航完成后再继续
    const redirect = route.query.redirect as string
    console.log('[Login] 准备跳转到:', redirect || '/')
    await router.push(redirect || '/')
  } catch (error: any) {
    // 处理不同类型的错误
    if (error.response?.status === 423) {
      // 账户锁定
      const lockInfo = error.response?.data?.details?.lockInfo
      if (lockInfo) {
        ElMessage.error(`账户已被锁定，请 ${lockInfo.remainingMinutes} 分钟后重试`)
      } else {
        ElMessage.error('账户已被锁定，请稍后重试')
      }
    } else if (error.response?.status === 401) {
      ElMessage.error('用户名或密码错误')
    } else {
      ElMessage.error(error.response?.data?.message || error.message || '登录失败')
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h1>后台管理系统</h1>
        <p>个人作品集网站管理平台</p>
      </div>
      
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="rules"
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            size="large"
            :prefix-icon="User"
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="login-button"
            native-type="submit"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.login-container {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--gradient-primary);
}

.login-box {
  width: 400px;
  padding: 40px;
  background: var(--bg-color);
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
  
  h1 {
    font-size: 24px;
    color: var(--text-primary);
    margin-bottom: 8px;
  }
  
  p {
    font-size: 14px;
    color: var(--text-secondary);
  }
}

.login-form {
  .el-form-item {
    margin-bottom: 24px;
  }
}

.login-button {
  width: 100%;
}

/* 响应式适配 */
@media screen and (max-width: 480px) {
  .login-box {
    width: 90%;
    padding: 30px 20px;
  }
}
</style>
