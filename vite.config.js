import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  // Relative paths so the build works from any Swarm bzz:// URL
  base: './',
  build: {
    outDir: 'dist',
  },
})
