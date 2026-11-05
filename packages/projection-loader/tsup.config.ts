import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'd3-projection-helpers': 'src/d3-projection-helpers.ts',
  },
  format: ['esm'],
  dts: { resolve: ['@atlas-composer/specification'] },
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  external: ['d3-geo'],
})
