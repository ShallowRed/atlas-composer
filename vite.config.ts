import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import eslint from 'vite-plugin-eslint'
import { notFoundPagePlugin, serveConfigsPlugin } from './scripts/vite-plugins'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.resolve(__dirname, 'src')
const outDir = path.resolve(__dirname, 'dist')

export default defineConfig(env => ({
  root: srcDir,
  publicDir: path.resolve(srcDir, 'public'),
  base: env.mode === 'production' ? '/atlas-composer/' : '/',
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          'd3': ['d3', 'd3-geo', 'd3-geo-projection', 'd3-composite-projections'],
          'vue-core': ['vue', 'vue-router', 'pinia'],
          'geo-data': ['topojson-client'],
        },
      },
    },
  },
  plugins: [
    vue(),
    tailwindcss(),
    serveConfigsPlugin(), // Serve configs folder as public assets
    notFoundPagePlugin(),
    eslint({
      failOnError: false,
      failOnWarning: false,
    }),
    // Bundle analyzer - run with ANALYZE=true
    ...(process.env.ANALYZE
      ? [
          visualizer({
            open: true,
            filename: path.resolve(__dirname, 'dist/stats.html'),
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': srcDir,
      '#configs': path.resolve(__dirname, 'configs'),
      '#types': path.resolve(__dirname, 'types'),
      '#package': path.resolve(__dirname, 'package.json'),
    },
  },
}))
