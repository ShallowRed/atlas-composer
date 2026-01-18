/**
 * Generic Backend Config Adapter
 * Transforms unified JSON configs to backend extraction format
 *
 * NOTE: This is a backend script for data extraction, not frontend display.
 * It resolves i18n objects to English strings for consistent data processing.
 * Frontend uses src/core/atlases/loader.ts which resolves i18n based on user locale.
 */

import type { BackendConfig, BackendTerritory, JSONAtlasConfig } from '#types'

export type { BackendConfig, BackendTerritory }

export function createBackendConfig(unifiedConfig: JSONAtlasConfig): BackendConfig {
  const territories: Record<string, BackendTerritory> = {}

  if (unifiedConfig.territories === '*') {
    return {
      name: typeof unifiedConfig.name === 'string' ? unifiedConfig.name : unifiedConfig.name.en,
      description: typeof unifiedConfig.description === 'string' ? unifiedConfig.description : unifiedConfig.description.en,
      territories: {},
    }
  }

  for (const territory of unifiedConfig.territories) {
    const backendTerritory: BackendTerritory = {
      name: typeof territory.name === 'string' ? territory.name : territory.name.en,
      code: territory.code,
      iso: territory.iso,
    }
    if (territory.extraction?.extractFrom) {
      backendTerritory.extractFrom = Number.parseInt(territory.extraction.extractFrom)
    }

    if (territory.extraction?.polygonIndices) {
      backendTerritory.polygonIndices = territory.extraction.polygonIndices
    }

    if (territory.extraction?.polygonBounds) {
      backendTerritory.bounds = territory.extraction.polygonBounds
    }
    else if (territory.bounds) {
      backendTerritory.bounds = territory.bounds
    }

    if (territory.extraction?.duplicateFrom) {
      backendTerritory.duplicateFrom = territory.extraction.duplicateFrom
    }

    territories[territory.id] = backendTerritory
  }

  return {
    name: typeof unifiedConfig.name === 'string' ? unifiedConfig.name : unifiedConfig.name.en,
    description: typeof unifiedConfig.description === 'string' ? unifiedConfig.description : unifiedConfig.description.en,
    territories,
    outputName: unifiedConfig.id,
  }
}
