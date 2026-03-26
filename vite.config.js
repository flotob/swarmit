import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Relative paths so the build works from any Swarm bzz:// URL
  base: './',
  build: {
    outDir: 'dist',
  },
})
