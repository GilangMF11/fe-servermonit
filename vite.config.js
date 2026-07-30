import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'https://iotapi.ump.ac.id',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
