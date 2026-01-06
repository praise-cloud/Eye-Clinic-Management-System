import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, '../src'),
  publicDir: resolve(__dirname, '../public'),
  css: {
    postcss: resolve(__dirname, './postcss.config.js')
  },
  build: {
    outDir: resolve(__dirname, '../dist'),
    emptyOutDir: true
  },
  server: {
    port: 3000,
    strictPort: false
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src')
    }
  },
  base: './'
})
