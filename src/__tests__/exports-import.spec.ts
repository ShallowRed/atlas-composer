import type { Point } from '@/__tests__/composite-utils'
import type { ExportedCompositeConfig } from '@/types/export-config'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { distance, importIntoApplication } from '@/__tests__/composite-utils'

const TOLERANCE = 1e-6

// Files exported by the application at commit b36ab99, and one written by hand
// in the same format, with the coordinates their import gives on that commit.
const coordinates: Record<string, Record<string, Array<[Point, Point]>>> = JSON.parse(readFileSync('src/__tests__/fixtures/exports-coordinates.json', 'utf8'))

describe.each(Object.entries(coordinates))('import of %s', (name, territories) => {
  it('gives the coordinates of the application that wrote it', async () => {
    const config = JSON.parse(readFileSync(`src/__tests__/fixtures/exports/${name}.json`, 'utf8')) as ExportedCompositeConfig

    const application = await importIntoApplication(config)

    for (const [code, points] of Object.entries(territories)) {
      for (const [point, expected] of points) {
        expect(distance(application.project(code, point), expected), `${code} ${point}`).toBeLessThanOrEqual(TOLERANCE)
      }
    }
  })
})
