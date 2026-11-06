import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: { resolve: ['@atlas-composer/specification'] },
  clean: true,
  minify: false,
  sourcemap: true,
  treeshake: true,
  splitting: false,
})
