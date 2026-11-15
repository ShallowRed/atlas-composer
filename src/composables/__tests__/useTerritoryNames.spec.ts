import type { AtlasId } from '@/types/branded'
import { afterEach, describe, expect, it } from 'vitest'
import { startApplication } from '@/__tests__/composite-utils'
import { withSetup } from '@/__tests__/test-utils'
import { useTerritoryNames } from '@/composables/useTerritoryNames'
import i18n from '@/i18n'

describe('useTerritoryNames', () => {
  afterEach(() => {
    i18n.global.locale.value = 'en'
  })

  it('gives the name of the atlas file in the current locale', async () => {
    await startApplication('south-africa' as AtlasId)
    const { territoryName } = withSetup(useTerritoryNames)

    i18n.global.locale.value = 'en'
    expect(territoryName('ZA-MAIN', 'South Africa')).toBe('Mainland South Africa')

    i18n.global.locale.value = 'fr'
    expect(territoryName('ZA-MAIN', 'South Africa')).toBe('Afrique du Sud continentale')
  })

  it('gives the name of the geographic data for a territory that the atlas file leaves out', async () => {
    await startApplication('world' as AtlasId)
    const { territoryName } = withSetup(useTerritoryNames)

    expect(territoryName('WD-250', 'France')).toBe('France')
  })
})
