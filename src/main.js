// ====================
// 文件：src/main.js
// ====================
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router' 
import './style.css'
import App from './App.vue'
import { initTheme } from './composables/useTheme.js'
import { tooltipDirective } from './utils/tooltip.js' // ✨ 引入指令

initTheme()
const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router) 
app.directive('tooltip', tooltipDirective) // ✨ 注册全局 v-tooltip 指令
app.mount('#app')
