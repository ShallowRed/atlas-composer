import { copyFile, mkdir, readdir } from 'node:fs/promises'
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
  // The `$schema` of each atlas configuration, ../schemas/atlas.schema.json, resolves in dist/ too
  async onSuccess() {
    await mkdir('dist/atlases', { recursive: true })
    await mkdir('dist/schemas', { recursive: true })
    for (const file of await readdir('../../configs/atlases')) {
      await copyFile(`../../configs/atlases/${file}`, `dist/atlases/${file}`)
    }
    await copyFile('../../configs/schemas/atlas.schema.json', 'dist/schemas/atlas.schema.json')
  },
})
