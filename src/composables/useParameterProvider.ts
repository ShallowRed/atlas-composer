import { useParameterStore } from '@/stores/parameters'

export function useParameterProvider() {
  return {
    parameterProvider: useParameterStore().parameterProvider,
  }
}
