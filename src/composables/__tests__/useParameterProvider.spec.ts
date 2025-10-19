import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useParameterStore } from '@/stores/parameters'

import { useParameterProvider } from '../useParameterProvider'

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
    parameterStore.setTerritoryParameter('TEST', 'scale', 1000)

    // Get through provider
    const params = parameterProvider.getEffectiveParameters('TEST')

    expect(params).toBeDefined()
    expect(params.scale).toBe(1000)
  })

  it('should delegate to parameter store for exportable parameters', () => {
    const parameterStore = useParameterStore()
    const { parameterProvider } = useParameterProvider()

    // Set a test parameter override
    parameterStore.setTerritoryParameter('TEST', 'rotate', [5, 10])

    // Get through provider
    const params = parameterProvider.getExportableParameters('TEST')

    expect(params).toBeDefined()
    expect(params.rotate).toEqual([5, 10])
  })

  it('should return consistent provider instance', () => {
    const { parameterProvider: provider1 } = useParameterProvider()
    const { parameterProvider: provider2 } = useParameterProvider()

    // Should be functionally equivalent (accessing same store)
    const parameterStore = useParameterStore()
    parameterStore.setTerritoryParameter('TEST', 'scale', 2000)

    expect(provider1.getEffectiveParameters('TEST').scale)
      .toBe(provider2.getEffectiveParameters('TEST').scale)
  })

  it('should handle empty territory parameters', () => {
    const { parameterProvider } = useParameterProvider()

    // Get parameters for non-existent territory
    const params = parameterProvider.getEffectiveParameters('NON_EXISTENT')

    // Should return empty or default parameters
    expect(params).toBeDefined()
  })
})
