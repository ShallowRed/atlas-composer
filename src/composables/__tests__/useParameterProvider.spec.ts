import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useParameterStore } from '@/stores/parameters'
import { createTerritoryCode } from '@/types/branded'

import { useParameterProvider } from '../useParameterProvider'

// Test constants - convert once at top
const TEST_CODE = createTerritoryCode('TEST')
const NON_EXISTENT_CODE = createTerritoryCode('NON_EXISTENT')

describe('useParameterProvider', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should provide parameter provider interface', () => {
    const { parameterProvider } = useParameterProvider()

    expect(parameterProvider).toBeDefined()
    expect(parameterProvider.getEffectiveParameters).toBeDefined()
    expect(parameterProvider.getExportableParameters).toBeDefined()
  })

  it('should delegate to parameter store for effective parameters', () => {
    const parameterStore = useParameterStore()
    const { parameterProvider } = useParameterProvider()

    // Set a test parameter
    parameterStore.setTerritoryParameter(TEST_CODE, 'scale', 1000)

    // Get through provider
    const params = parameterProvider.getEffectiveParameters(TEST_CODE)

    expect(params).toBeDefined()
    expect(params.scale).toBe(1000)
  })

  it('should delegate to parameter store for exportable parameters', () => {
    const parameterStore = useParameterStore()
    const { parameterProvider } = useParameterProvider()

    // Set a test parameter override
    parameterStore.setTerritoryParameter(TEST_CODE, 'rotate', [5, 10])

    // Get through provider
    const params = parameterProvider.getExportableParameters(TEST_CODE)

    expect(params).toBeDefined()
    expect(params.rotate).toEqual([5, 10])
  })

  it('should return consistent provider instance', () => {
    const { parameterProvider: provider1 } = useParameterProvider()
    const { parameterProvider: provider2 } = useParameterProvider()

    // Should be functionally equivalent (accessing same store)
    const parameterStore = useParameterStore()
    parameterStore.setTerritoryParameter(TEST_CODE, 'scale', 2000)

    expect(provider1.getEffectiveParameters(TEST_CODE).scale)
      .toBe(provider2.getEffectiveParameters(TEST_CODE).scale)
  })

  it('should handle empty territory parameters', () => {
    const { parameterProvider } = useParameterProvider()

    // Get parameters for non-existent territory
    const params = parameterProvider.getEffectiveParameters(NON_EXISTENT_CODE)

    // Should return empty or default parameters
    expect(params).toBeDefined()
  })
})
