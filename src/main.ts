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
 *
 * ─── Class hierarchy ───
 *   import { createApp } from 'vue'
 *   import { router } from './router'
 *   import App from './App.vue'
 *   import ElementPlus from 'element-plus'
 *
 *   const app = createApp(App)
 *   app.use(router)
 *   app.use(ElementPlus)
 *   app.mount('#app')
 *
 * 启动顺序(每步不可颠倒):
 *   1. createApp(App)         创建根实例
 *   2. app.use(router)        注册 vue-router(必须早于 mount,否则首屏路由未注册)
 *   3. app.use(ElementPlus)   全局注册 Element Plus(不引 unplugin-auto-import,显式 use)
 *   4. app.mount('#app')      挂载到 index.html 的 #app
 *
 * 样式加载顺序(import 副作用,先于 app 创建):
 *   1. './style.css'              全局 reset + .page* 共享布局类
 *   2. 'element-plus/dist/...'    Element Plus 主题 CSS
 *
 * 入口文件 — 不应在此添加业务逻辑(组件/路由/状态/工具),保持纯粹启动。
 */
import { createApp } from 'vue'
import { router } from './router'
import App from './App.vue'

import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'

const app = createApp(App)
app.use(router)
app.use(ElementPlus)
app.mount('#app')
