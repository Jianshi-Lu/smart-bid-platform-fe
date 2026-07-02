/**
 * Vue 应用入口。
 *
 * 启动顺序:
 *   1. createApp(App)         创建根实例
 *   2. app.use(router)        注册 vue-router (见 src/router/index.ts)
 *   3. app.use(ElementPlus)   全局注册 Element Plus (不引 unplugin-auto-import)
 *   4. app.mount('#app')      挂载到 index.html 的 #app
 *
 * 样式加载:
 *   - './style.css'              全局 reset / 基础样式
 *   - 'element-plus/dist/...'    Element Plus 主题 CSS(若需自定义主题,改此处)
 */
import { createApp } from 'vue'
import { router } from './router'
import './style.css'
import App from './App.vue'

import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

const app = createApp(App)
app.use(router)
app.use(ElementPlus)
app.mount('#app')