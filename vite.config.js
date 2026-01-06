import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: './src',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  server: {
    port: 3000,
    strictPort: false
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  base: './'
})
