import type { CompositionEntry } from '@/core/presets/composition-state'

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { insertInCatalogueOrder } from '@/core/presets/composition-state'

// The ordered entries of the custom composite, empty in the other views. Only the actions of src/stores/composition.ts
// write them, so that each active code of the composite-custom view has an entry.
export const useCompositionEntriesStore = defineStore('compositionEntries', () => {
  const entries = ref<CompositionEntry[]>([])

  function setEntries(next: readonly CompositionEntry[]) {
    entries.value = next.map(entry => ({ ...entry }))
  }

  // An existing entry keeps its name and its bounds
  function addEntry(entry: CompositionEntry, catalogueCodes: readonly string[]) {
    if (!entries.value.some(({ code }) => code === entry.code)) {
      entries.value = insertInCatalogueOrder(entries.value, entry, catalogueCodes)
    }
  }

  function clear() {
    entries.value = []
  }

  return { entries, setEntries, addEntry, clear }
})
