import type { CompositionEntry, EntryProvider } from '@/types/territory'

import { defineStore } from 'pinia'
import { markRaw, ref } from 'vue'
import { entryName, insertInCatalogueOrder } from '@/core/presets/composition-state'
import { useAtlasStore } from '@/stores/atlas'

// The ordered entries of the custom composite, empty in the other views. Only the actions of src/stores/composition.ts
// write them, so that each active code of the composite-custom view has an entry.
export const useCompositionEntriesStore = defineStore('compositionEntries', () => {
  const atlasStore = useAtlasStore()
  const entries = ref<CompositionEntry[]>([])

  function setEntries(next: readonly CompositionEntry[]) {
    entries.value = next.map(entry => ({ ...entry }))
  }

  function hasEntry(code: string): boolean {
    return entries.value.some(entry => entry.code === code)
  }

  // An existing entry keeps its name and its bounds
  function addEntry(entry: CompositionEntry, catalogueCodes: readonly string[]) {
    if (!hasEntry(entry.code)) {
      entries.value = insertInCatalogueOrder(entries.value, entry, catalogueCodes)
    }
  }

  function clear() {
    entries.value = []
  }

  // The entries with the translated name of the catalogue for a code that it declares, which the composite reads at each build
  const entryProvider: EntryProvider = markRaw({
    getEntries: () => entries.value.map(entry => ({ ...entry, name: entryName(entry.code, entry.name, atlasStore.territories) })),
  })

  return { entries, hasEntry, setEntries, addEntry, clear, entryProvider }
})
