import type { AtlasId } from '@/types/branded'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { startApplication } from '@/__tests__/composite-utils'
import { withSetup } from '@/__tests__/test-utils'
import { useMapWatchers } from '@/composables/useMapWatchers'
import { useUIStore } from '@/stores/ui'
import { useViewStore } from '@/stores/view'
import { createTerritoryCode } from '@/types/branded'

function watchMap() {
  const callbacks = {
    onProjectionParamsChange: vi.fn(async () => {}),
    onCanvasDimensionsChange: vi.fn(async () => {}),
    onReferenceScaleChange: vi.fn(async () => {}),
    onDependenciesChange: vi.fn(async () => {}),
    onBasemapChange: vi.fn(),
  }
  withSetup(() => useMapWatchers({ mode: 'composite' }, callbacks))
  return callbacks
}

describe('useMapWatchers', () => {
  beforeEach(async () => {
    await startApplication('france' as AtlasId)
  })

  it('redraws the basemap only for another basemap or another theme', async () => {
    const uiStore = useUIStore()
    uiStore.basemap = 'relief'
    const callbacks = watchMap()

    uiStore.basemap = 'imagery'
    await nextTick()
    uiStore.theme = 'dark'
    await nextTick()

    expect(callbacks.onBasemapChange).toHaveBeenCalledTimes(2)
    expect(callbacks.onDependenciesChange).not.toHaveBeenCalled()
  })

  it('draws the map again when the territories gain or lose their fill', async () => {
    const uiStore = useUIStore()
    const callbacks = watchMap()

    uiStore.basemap = 'relief'
    await nextTick()
    uiStore.basemap = 'none'
    await nextTick()

    expect(callbacks.onDependenciesChange).toHaveBeenCalledTimes(2)
    expect(callbacks.onBasemapChange).not.toHaveBeenCalled()
  })

  it('draws the map again when an active territory replaces another', async () => {
    const viewStore = useViewStore()
    viewStore.setActiveTerritories(['FR-MET', 'FR-RE'].map(createTerritoryCode))
    const callbacks = watchMap()

    viewStore.setActiveTerritories(['FR-MET', 'FR-GP'].map(createTerritoryCode))
    await nextTick()

    expect(callbacks.onDependenciesChange).toHaveBeenCalledOnce()
  })
})
