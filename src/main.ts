import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'
import { initAnalytics } from './utils/analytics'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')

// 初始化访问统计（在应用挂载后）
// 需求: 2.1.1 - 上报页面访问
// 需求: 2.2.3 - 上报设备信息、浏览器信息
initAnalytics(router)
