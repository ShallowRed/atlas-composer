import type { ExampleDefinition } from '@/core/examples'
import type { PresetError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import type { ExampleMapSource } from '@/stores/examples'
import { useAsyncState } from '@vueuse/core'
import { computed } from 'vue'
import { renderExampleMap } from '@/services/rendering/example-map'
import { useExamplesStore } from '@/stores/examples'

export function useExampleMap(example: ExampleDefinition) {
  const examplesStore = useExamplesStore()
  const { state, isLoading } = useAsyncState<Result<ExampleMapSource, PresetError> | null>(() => examplesStore.loadExampleMap(example), null, { throwError: true })

  const map = computed(() => state.value?.ok ? renderExampleMap(state.value.value.config, state.value.value.topology, example) : null)
  const error = computed(() => state.value && !state.value.ok ? state.value.error : null)

  return { map, error, isLoading }
}
