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
import { squircleDirective } from './directives/squircle.js' // ✨ 引入 Apple 连续曲率指令
import AppIcon from './components/common/AppIcon.vue' // ✨ 引入全局统一图标组件

if (typeof window !== 'undefined') {
  const hash = String(window.location?.hash || '');
  const pathname = String(window.location?.pathname || '');
  if (hash.startsWith('#/desktop-lyric') || pathname.includes('desktop-lyric')) {
    document.documentElement.classList.add('desktop-lyric-window');
  }
  if (hash.startsWith('#/tray-menu') || pathname.includes('tray-menu')) {
    document.documentElement.classList.add('tray-menu-window');
  }
}

initTheme()
const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router) 
app.directive('tooltip', tooltipDirective) // ✨ 注册全局 v-tooltip 指令
app.directive('squircle', squircleDirective) // ✨ 注册全局 v-squircle 指令
app.component('AppIcon', AppIcon) // ✨ 注册全局 AppIcon 组件
app.mount('#app')
