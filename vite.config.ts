import type { Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import eslint from 'vite-plugin-eslint'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.resolve(__dirname, 'src')
const outDir = path.resolve(__dirname, 'dist')
const configsDir = path.resolve(__dirname, 'configs')

/**
 * Vite plugin to serve configs folder as public assets
 * Serves /configs/* files from the root configs directory
 */
function serveConfigsPlugin(): Plugin {
  return {
    name: 'serve-configs',
    configureServer(server) {
      // Serve configs directory in dev mode
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/configs/')) {
          const filePath = path.join(configsDir, req.url.slice('/configs/'.length))
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const content = fs.readFileSync(filePath, 'utf-8')
            res.setHeader('Content-Type', 'application/json')
            res.end(content)
            return
          }
        }
        next()
      })
    },
    generateBundle() {
      // Copy configs to dist in production build
      const distConfigsDir = path.join(outDir, 'configs')

      // Create configs directory in dist
      if (!fs.existsSync(distConfigsDir)) {
        fs.mkdirSync(distConfigsDir, { recursive: true })
      }

      // Recursively copy all JSON files and subdirectories from configs to dist/configs
      function copyRecursive(srcDir: string, destDir: string) {
        const files = fs.readdirSync(srcDir)
        for (const file of files) {
          const srcPath = path.join(srcDir, file)
          const destPath = path.join(destDir, file)

          if (fs.statSync(srcPath).isDirectory()) {
            // Create subdirectory and recurse
            if (!fs.existsSync(destPath)) {
              fs.mkdirSync(destPath, { recursive: true })
            }
            copyRecursive(srcPath, destPath)
          }
          else if (file.endsWith('.json')) {
            fs.copyFileSync(srcPath, destPath)
          }
        }
      }

      copyRecursive(configsDir, distConfigsDir)
    },
  }
}

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
          'plot': ['@observablehq/plot'],
          'geo-data': ['topojson-client'],
        },
      },
    },
  },
  plugins: [
    vue(),
    tailwindcss(),
    serveConfigsPlugin(), // Serve configs folder as public assets
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
