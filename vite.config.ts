import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import eslint from 'vite-plugin-eslint'
import { contentSecurityPolicyPlugin, notFoundPagePlugin, serveConfigsPlugin } from './scripts/vite-plugins'

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
    rolldownOptions: {
      output: {
        // Vendor chunks, which change less often than the application
        codeSplitting: {
          groups: [
            { name: 'd3', test: /node_modules[\\/](d3|d3-[^\\/]+)[\\/]/ },
            { name: 'vue-core', test: /node_modules[\\/](vue|@vue[\\/][^\\/]+|vue-router|pinia)[\\/]/ },
            { name: 'geo-data', test: /node_modules[\\/]topojson-client[\\/]/ },
          ],
        },
      },
    },
  },
  plugins: [
    vue(),
    tailwindcss(),
    serveConfigsPlugin(), // Serve configs folder as public assets
    contentSecurityPolicyPlugin(),
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
