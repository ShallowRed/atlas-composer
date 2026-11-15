import type { Ref } from 'vue'
import type { Earthquake } from '@/core/examples'
import type { AtlasConfigError, PresetError } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import type { CompositionDemoSource } from '@/stores/examples'
import type { PresetId } from '@/types/branded'
import { TransitionPresets, usePreferredReducedMotion, useTransition } from '@vueuse/core'
import { computed, ref, shallowRef, watch } from 'vue'
import { interpolate } from '@/core/examples'
import { renderCompositionDemo } from '@/services/rendering/composition-demo'
import { useExamplesStore } from '@/stores/examples'

const TRANSITION_MS = 1200

export function useCompositionDemo(presetId: Ref<PresetId>) {
  const store = useExamplesStore()
  const source = shallowRef<Result<CompositionDemoSource, PresetError | AtlasConfigError> | null>(null)
  const earthquakes = shallowRef<Earthquake[]>([])
  const isLoading = ref(false)

  watch(presetId, async (id) => {
    isLoading.value = true
    const result = await store.loadCompositionDemo(id)
    // A preset chosen while this one loads replaces it
    if (id === presetId.value) {
      source.value = result
      isLoading.value = false
    }
  }, { immediate: true })
  store.loadEarthquakes().then((list) => {
    earthquakes.value = list
  })

  const demo = computed(() => source.value?.ok ? renderCompositionDemo(source.value.value.input, earthquakes.value) : null)
  const territoryNames = computed(() => source.value?.ok ? source.value.value.territoryNames : new Map())
  const contours = computed(() => source.value?.ok ? source.value.value.input.territories.features : [])
  const error = computed(() => source.value && !source.value.ok ? source.value.error : null)

  // The slider moves the demo at once; the button plays the move to the other end
  const target = ref(1)
  const playing = ref(false)
  const reducedMotion = usePreferredReducedMotion()
  const progress = useTransition(target, {
    duration: TRANSITION_MS,
    transition: TransitionPresets.easeInOutCubic,
    disabled: computed(() => !playing.value || reducedMotion.value === 'reduce'),
    onFinished: () => {
      playing.value = false
    },
  })

  function setProgress(value: number) {
    playing.value = false
    target.value = value
  }

  function play() {
    playing.value = true
    target.value = target.value < 0.5 ? 1 : 0
  }

  const territories = computed(() => demo.value?.territoriesAt(progress.value) ?? [])
  const marks = computed(() => (demo.value?.marks ?? []).map(mark => ({ ...mark, position: interpolate(mark.raw, mark.composite, progress.value) })))

  return { demo, territories, marks, contours, territoryNames, error, isLoading, progress, target, setProgress, play, earthquakesUnavailable: computed(() => store.earthquakesUnavailable) }
}
