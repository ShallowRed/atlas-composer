import type { ExampleDefinition, ExampleMap } from '@/core/examples'
import type { PresetError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import { useAsyncState } from '@vueuse/core'
import { computed } from 'vue'
import { useExamplesStore } from '@/stores/examples'

export function useExampleMap(example: ExampleDefinition) {
  const examplesStore = useExamplesStore()
  const { state, isLoading } = useAsyncState<Result<ExampleMap, PresetError> | null>(() => examplesStore.loadExampleMap(example), null, { throwError: true })

  const map = computed(() => state.value?.ok ? state.value.value : null)
  const error = computed(() => state.value && !state.value.ok ? state.value.error : null)

  return { map, error, isLoading }
}
