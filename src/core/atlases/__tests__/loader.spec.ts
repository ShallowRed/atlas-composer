import type { JSONAtlasConfig } from '#types'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { loadAtlasConfig } from '@/core/atlases/loader'

const southAfrica = JSON.parse(readFileSync('configs/atlases/south-africa.json', 'utf8')) as JSONAtlasConfig

describe('loadAtlasConfig', () => {
  it('keeps the name of each territory in every language of the file', () => {
    const { territories } = loadAtlasConfig(southAfrica, undefined)

    expect(territories.all.find(territory => territory.code === 'ZA-MAIN')?.name).toEqual({
      en: 'Mainland South Africa',
      fr: 'Afrique du Sud continentale',
    })
  })
})
