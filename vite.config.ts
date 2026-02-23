import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // Cast Receiver 部署到 GitHub Pages 或自有域名時的 base path
  // 如果部署到 https://kentchiu666.github.io/cast-squat/，設定為 '/cast-squat/'
  // 本地開發時不需要設定
  base: './',
})
