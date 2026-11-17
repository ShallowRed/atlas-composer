import { fileURLToPath } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['src/__tests__/setup.ts'],
    globals: true,
    // The worktrees of other agent sessions hold copies of the tests without their dependencies
    exclude: [...configDefaults.exclude, '.claude/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/**/*.d.ts',
        'src/main.ts',
        'scripts/',
        '**/*.config.*',
      ],
    },
  },
  optimizeDeps: {
    include: ['d3-composite-projections'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '#configs': fileURLToPath(new URL('./configs', import.meta.url)),
      '#package': fileURLToPath(new URL('./package.json', import.meta.url)),
    },
  },
})
