import type { CompositeProjectionConfig } from '@atlas-composer/specification'
import { describe, expect, it } from 'vitest'
import { err, ok } from '@/core/types/result'
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
    expect(checkAtlasCompatibility(config, createAtlasId('france'))).toEqual(ok(undefined))
  })

  it('should refuse a configuration of another atlas', () => {
    expect(checkAtlasCompatibility(config, createAtlasId('portugal')))
      .toEqual(err({ code: 'IMPORT_ATLAS_MISMATCH', importedAtlasId: 'france', currentAtlasId: 'portugal' }))
  })
})
