import type { AtlasId } from '@/types/branded'
import { beforeEach, describe, expect, it } from 'vitest'
import { startApplication } from '@/__tests__/composite-utils'
import { useTerritoryVisibility } from '@/composables/useTerritoryVisibility'
import { useAppStore } from '@/stores/app'

describe('useTerritoryVisibility', () => {
  beforeEach(async () => {
    await startApplication('france' as AtlasId)
  })

  it('shows no empty state while the application loads, before the territories arrive', () => {
    useAppStore().startLoadingAtlas()

    expect(useTerritoryVisibility().shouldShowEmptyState.value).toBe(false)
  })

  it('shows the empty state of a loaded atlas without active territory', () => {
    useAppStore().setReady()

    expect(useTerritoryVisibility().shouldShowEmptyState.value).toBe(true)
  })
})
