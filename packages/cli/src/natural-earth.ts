import type { NaturalEarthResolution, NaturalEarthSource } from '@atlas-composer/preset-library'
import type { Topology } from 'topojson-specification'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createNaturalEarthSource } from '@atlas-composer/preset-library'
import { feature } from 'topojson-client'

const require = createRequire(import.meta.url)

function readCountries(path: string) {
  const topology = JSON.parse(readFileSync(path, 'utf8')) as Topology
  return feature(topology, topology.objects.countries!)
}

// Literal calls of require.resolve, which knip reads as uses of world-atlas
const COUNTRIES: Record<NaturalEarthResolution, () => ReturnType<typeof readCountries>> = {
  '10m': () => readCountries(require.resolve('world-atlas/countries-10m.json')),
  '50m': () => readCountries(require.resolve('world-atlas/countries-50m.json')),
  '110m': () => readCountries(require.resolve('world-atlas/countries-110m.json')),
}

/** Reads the countries of the Natural Earth topology of world-atlas 2.0.2, which the extraction rules of the atlases count on */
export function naturalEarthSource(resolution: string): NaturalEarthSource {
  // createNaturalEarthSource refuses an unknown resolution and names it
  const countries = Object.hasOwn(COUNTRIES, resolution) ? COUNTRIES[resolution as NaturalEarthResolution]() : []
  return createNaturalEarthSource(countries, resolution)
}
