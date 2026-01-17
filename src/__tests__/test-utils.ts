/**
 * Test Utilities
 *
 * Centralized utilities for testing, including:
 * - Mock atlas registry data
 * - Store initialization helpers
 * - Common test fixtures
 */

import type { LoadedAtlasConfig } from '@/core/atlases/loader'
import type { CompositeProjectionConfig } from '@/types'
import type { AtlasId, TerritoryCode } from '@/types/branded'
import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'

/**
 * Mock atlas configuration for testing
 */
export function createMockAtlasConfig(atlasId: AtlasId = 'france' as AtlasId): LoadedAtlasConfig {
  const atlasConfig = {
    id: atlasId,
    name: 'France',
    geoDataConfig: {
      dataPath: '/data/france-territories-50m.json',
      metadataPath: '/data/france-metadata-50m.json',
      topologyObjectName: 'territories',
      territories: [
        {
          code: 'FR-MET' as TerritoryCode,
          name: 'France Metropolitaine',
          center: [2.5, 46.5] as [number, number],
          bounds: [[-5, 41], [10, 51]] as [[number, number], [number, number]],
        },
        {
          code: 'FR-GP' as TerritoryCode,
          name: 'Guadeloupe',
          center: [-61.46, 16.14] as [number, number],
          bounds: [[-61.81, 15.83], [-61, 16.52]] as [[number, number], [number, number]],
        },
      ],
    },
  }

  const atlasSpecificConfig = {
    splitModeConfig: {
      territoriesTitle: 'territory.territories',
    },
    territoryCollections: {
      all: {
        label: 'All territories',
        type: 'mutually-exclusive' as const,
        territories: ['FR-GP' as TerritoryCode],
      },
    },
    compositeProjectionConfig: undefined,
  }

  const territories = {
    'FR-MET': {
      code: 'FR-MET' as TerritoryCode,
      name: 'France Métropolitaine',
      center: [2.5, 46.5] as [number, number],
      bounds: [[-5, 41], [10, 51]] as [[number, number], [number, number]],
    },
    'FR-GP': {
      code: 'FR-GP' as TerritoryCode,
      name: 'Guadeloupe',
      center: [-61.46, 16.14] as [number, number],
      bounds: [[-61.81, 15.83], [-61, 16.52]] as [[number, number], [number, number]],
    },
  }

  return {
    atlasConfig,
    atlasSpecificConfig,
    territories,
  } as unknown as LoadedAtlasConfig
}

/**
 * Mock composite projection config for testing
 */
export function createMockCompositeConfig(): CompositeProjectionConfig {
  return {
    territories: [
      {
        code: 'FR-MET' as TerritoryCode,
        name: 'France Metropolitaine',
        center: [2.5, 46.5],
        bounds: [[-5, 41], [10, 51]],
      },
      {
        code: 'FR-GP' as TerritoryCode,
        name: 'Guadeloupe',
        center: [-61.46, 16.14],
        bounds: [[-61.81, 15.83], [-61, 16.52]],
      },
    ],
  }
}

/**
 * Setup Pinia for tests
 * Creates a fresh Pinia instance and sets it as active
 */
export function setupTestPinia() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}

/**
 * Mock the atlas registry to avoid network requests
 * Returns a function to restore the original implementation
 */
export function mockAtlasRegistry(atlasConfig: LoadedAtlasConfig = createMockAtlasConfig()) {
  // eslint-disable-next-line ts/no-require-imports
  const atlasRegistry = require('@/core/atlases/registry')

  const originalLoadAtlasAsync = atlasRegistry.loadAtlasAsync
  const originalGetLoadedConfig = atlasRegistry.getLoadedConfig

  // Mock loadAtlasAsync to return promise with config
  atlasRegistry.loadAtlasAsync = async (_atlasId: AtlasId) => {
    return atlasConfig
  }

  // Mock getLoadedConfig to return config immediately
  atlasRegistry.getLoadedConfig = (_atlasId: AtlasId) => {
    return atlasConfig
  }

  // Return cleanup function
  return () => {
    atlasRegistry.loadAtlasAsync = originalLoadAtlasAsync
    atlasRegistry.getLoadedConfig = originalGetLoadedConfig
  }
}

/**
 * Create a test app with Pinia
 * Useful for composable testing
 */
export function createTestApp() {
  const app = createApp({})
  const pinia = createPinia()
  app.use(pinia)
  setActivePinia(pinia)
  return { app, pinia }
}

/**
 * Helper to run a composable in a proper Vue context
 */
export function withSetup<T>(composable: () => T): [T, { app: any, unmount: () => void }] {
  const { app } = createTestApp()

  // Setup composable and mount
  app.mount(document.createElement('div'))
  const result = composable()

  return [
    result!,
    {
      app,
      unmount: () => {
        app.unmount()
        // Pinia dispose is not available in current version
      },
    },
  ]
}
