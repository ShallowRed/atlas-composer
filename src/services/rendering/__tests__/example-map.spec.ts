import type { GeometryCollection, Topology } from 'topojson-specification'
import type { ExampleFrame } from '@/core/examples'
import { readFileSync } from 'node:fs'
import { feature } from 'topojson-client'
import { describe, expect, it } from 'vitest'
import { readCompositeSources } from '@/__tests__/test-utils'
import { EXAMPLES } from '@/core/examples'
import { renderExampleMap } from '@/services/rendering/example-map'

const TERRITORY_OF_CODE: Record<string, Record<string, string>> = {
  'france-density': { 971: 'FR-GP', 972: 'FR-MQ', 973: 'FR-GF', 974: 'FR-RE', 976: 'FR-YT' },
  // The portugal atlas names the Azores PT-30 and Madeira PT-20
  'portugal-density': { PT200: 'PT-30', PT300: 'PT-20' },
}
const MAINLAND: Record<string, string> = { 'france-density': 'FR-MET', 'portugal-density': 'PT-CONT' }

const COMPOSITE_SOURCES = readCompositeSources()

function pathExtent(d: string): [number, number, number, number] {
  const numbers = d.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g)!.map(Number)
  const xs = numbers.filter((_, index) => index % 2 === 0)
  const ys = numbers.filter((_, index) => index % 2 === 1)
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

function contains(frame: ExampleFrame, [x0, y0, x1, y1]: [number, number, number, number]): boolean {
  const tolerance = 1
  return x0 >= frame.x - tolerance && y0 >= frame.y - tolerance
    && x1 <= frame.x + frame.width + tolerance && y1 <= frame.y + frame.height + tolerance
}

describe('renderExampleMap', () => {
  it.each(EXAMPLES.map(example => [example.id, example] as const))('%s draws each feature in the frame of its territory, and the borders', (_id, example) => {
    const topology = JSON.parse(readFileSync(`src/public/${example.dataPath}`, 'utf8')) as Topology
    const config = COMPOSITE_SOURCES.find(source => source.presetId === example.presetId)!.config
    const map = renderExampleMap(config, topology, example)
    const frameOf = new Map(map.frames.map(frame => [frame.code, frame]))
    const entities = feature(topology, topology.objects.entities as GeometryCollection<{ code: string }>).features

    expect(map.features).toHaveLength(entities.length)
    expect(map.borders.inner).not.toBe('')
    expect(map.borders.group).not.toBe('')
    expect(map.borders.outline).not.toBe('')
    entities.forEach((entity, index) => {
      const code = String(entity.properties?.code)
      const territory = TERRITORY_OF_CODE[example.id]![code] ?? MAINLAND[example.id]!
      expect(contains(frameOf.get(territory)!, pathExtent(map.features[index]!.path)), `${code} in ${territory}`).toBe(true)
    })
  })
})
