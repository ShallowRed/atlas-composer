import type { LoadedAtlasConfig } from '@/core/atlases/loader'
import type { CompositeProjectionConfig } from '@/types'
import type { AtlasId, TerritoryCode } from '@/types/branded'
import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'

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

export function setupTestPinia() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}

export function mockAtlasRegistry(atlasConfig: LoadedAtlasConfig = createMockAtlasConfig()) {
  const atlasRegistry = require('@/core/atlases/registry')

  const originalLoadAtlasAsync = atlasRegistry.loadAtlasAsync
  const originalGetLoadedConfig = atlasRegistry.getLoadedConfig

  atlasRegistry.loadAtlasAsync = async (_atlasId: AtlasId) => {
    return atlasConfig
  }

  atlasRegistry.getLoadedConfig = (_atlasId: AtlasId) => {
    return atlasConfig
  }

  return () => {
    atlasRegistry.loadAtlasAsync = originalLoadAtlasAsync
    atlasRegistry.getLoadedConfig = originalGetLoadedConfig
  }
}

export function createTestApp() {
  const app = createApp({})
  const pinia = createPinia()
  app.use(pinia)
  setActivePinia(pinia)
  return { app, pinia }
}

export function withSetup<T>(composable: () => T): [T, { app: any, unmount: () => void }] {
  const { app } = createTestApp()

  app.mount(document.createElement('div'))
  const result = composable()

  return [
    result!,
    {
      app,
      unmount: () => {
        app.unmount()
      },
    },
  ]
}
