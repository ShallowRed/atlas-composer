import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import { describe, expect, it } from 'vitest'
import { createAtlasId } from '@/types/branded'
import { checkAtlasCompatibility } from '../composite-config'

const config = {
  metadata: {
    atlasId: 'france',
    atlasName: 'France',
    exportDate: '2025-10-10T12:00:00.000Z',
    createdWith: 'Atlas composer v1.0',
  },
} as CompositeProjectionConfig

describe('checkAtlasCompatibility', () => {
  it('should pass when atlas IDs match', () => {
    expect(checkAtlasCompatibility(config, createAtlasId('france'))).toEqual([])
  })

  it('should warn when atlas IDs do not match', () => {
    const warnings = checkAtlasCompatibility(config, createAtlasId('portugal'))

    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('exported for atlas')
  })
})
