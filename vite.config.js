// ====================
// 文件：vite.config.js
// ====================
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  // 根据当前工作模式（development 或 production）加载对应的 .env 文件
  const env = loadEnv(mode, process.cwd())

  return {
    base: './', // ✨ 修复白屏 2：强制使用相对路径，确保桌面端资源被正确引入
    plugins: [vue()],
    server: {
      // 这里的端口是前端 Vue 项目运行的端口，不用动
      port: 5173, 
      
      // 设置反向代理，解决跨域问题
      proxy: {
        '/api': {
          // ✨ 核心改进：不再写死 3000，而是动态读取 .env 文件中的 VITE_API_TARGET
          target: env.VITE_API_TARGET, 
          
          changeOrigin: true,
          // 发送请求时去掉 /api 前缀，因为后端 Node 服务通常不带这个前缀
          rewrite: (path) => path.replace(/^\/api/, '') 
        }
      }
    }
  }
})