import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm'],
  dts: { entry: 'src/index.ts', resolve: ['@atlas-composer/specification'] },
  clean: true,
  minify: false,
  sourcemap: true,
  treeshake: true,
  splitting: false,
})
