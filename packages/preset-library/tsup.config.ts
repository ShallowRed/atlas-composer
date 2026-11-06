import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: { resolve: ['@atlas-composer/specification'] },
  clean: true,
  publicDir: '../../configs/presets',
  minify: false,
  sourcemap: true,
  treeshake: true,
  splitting: false,
})
