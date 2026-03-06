/**
 * Element Plus 类型声明补充
 */

// 声明 Element Plus 中文语言包模块
declare module 'element-plus/dist/locale/zh-cn.mjs' {
  const zhCn: {
    name: string
    el: Record<string, any>
  }
  export default zhCn
}

// 声明 vuedraggable 模块
declare module 'vuedraggable' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<any, any, any>
  export default component
}
