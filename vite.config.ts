import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import eslint from 'vite-plugin-eslint'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.resolve(__dirname, 'src')
const outDir = path.resolve(__dirname, 'dist')

export default defineConfig(env => ({
  root: srcDir,
  base: env.mode === 'production' ? '/atlas-composer/' : '/',
  build: {
    outDir,
  },
  plugins: [
    vue(),
    tailwindcss(),
    eslint({
      failOnError: false,
      failOnWarning: false,
    }),
  ],
  resolve: {
    alias: {
      '@': srcDir,
      '@configs': path.resolve(__dirname, 'configs'),
    },
  },
}))
