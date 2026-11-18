<script setup lang="ts">
import type { TerritoryCode } from '@/types/branded'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTerritoryNames } from '@/composables/useTerritoryNames'
import { useCompositionStore } from '@/stores/composition'
import { useGeoDataStore } from '@/stores/geoData'
import { useViewStore } from '@/stores/view'

const emit = defineEmits<{
  open: [territoryCode: TerritoryCode]
}>()

const { t } = useI18n()
const { territoryName } = useTerritoryNames()
const compositionStore = useCompositionStore()
const geoDataStore = useGeoDataStore()
const viewStore = useViewStore()

interface Row {
  code: TerritoryCode
  name: string
  placement: 'inside' | 'outside' | 'moved'
}

const rows = computed<Row[]>(() => geoDataStore.territoriesData.map(territory => ({
  code: territory.code,
  name: territoryName(territory.code, territory.name),
  placement: compositionStore.geographicPlacement[territory.code] ?? 'inside',
})))

const isActive = (code: TerritoryCode) => viewStore.activeTerritoryCodes.has(code)

const groups = computed(() => [
  { key: 'inside', title: t('territory.geographic.inside'), rows: rows.value.filter(row => isActive(row.code) && row.placement !== 'outside') },
  { key: 'outside', title: t('territory.geographic.outside'), rows: rows.value.filter(row => isActive(row.code) && row.placement === 'outside') },
  { key: 'hidden', title: t('territory.geographic.hidden'), rows: rows.value.filter(row => !isActive(row.code)) },
].filter(group => group.rows.length > 0))

function detach(code: TerritoryCode) {
  if (compositionStore.detachTerritory(code)) {
    emit('open', code)
  }
}
</script>

<template>
  <section
    v-for="group in groups"
    :key="group.key"
    class="mb-4"
  >
    <h4 class="text-xs font-semibold text-base-content/70 mb-1 px-2">
      {{ group.title }}
      <span class="font-normal">· {{ group.rows.length }}</span>
    </h4>
    <ul>
      <li
        v-for="row in group.rows"
        :key="row.code"
        class="flex items-center gap-1"
      >
        <button
          v-if="group.key !== 'hidden'"
          type="button"
          class="flex-1 min-w-0 flex items-center gap-2 rounded-field px-2 py-1.5 text-left hover:bg-base-200 focus-visible:outline-2 focus-visible:outline-primary"
          :data-territory="row.code"
          @click="emit('open', row.code)"
        >
          <span class="flex-1 min-w-0">
            <span class="block text-sm font-medium truncate">{{ row.name }}</span>
            <span
              v-if="row.placement === 'moved'"
              class="flex items-center gap-1 text-xs text-primary"
            >
              <i class="ri-picture-in-picture-2-line" />
              {{ t('territory.geographic.inset') }}
            </span>
            <span
              v-else
              class="block text-xs opacity-70"
            >
              {{ t('territory.geographic.real') }}
            </span>
          </span>
        </button>
        <span
          v-else
          class="flex-1 min-w-0 px-2 py-1.5 text-sm truncate opacity-60"
        >
          {{ row.name }}
        </span>

        <button
          v-if="row.placement === 'outside' && group.key === 'outside'"
          type="button"
          class="btn btn-ghost btn-xs shrink-0"
          :disabled="!compositionStore.hasFreeInsetSlot"
          :title="compositionStore.hasFreeInsetSlot ? undefined : t('territory.geographic.noSlot')"
          @click="detach(row.code)"
        >
          <i class="ri-picture-in-picture-2-line" />
          {{ t('territory.geographic.detach') }}
        </button>
        <button
          v-else-if="row.placement === 'moved' && group.key === 'inside'"
          type="button"
          class="btn btn-ghost btn-xs shrink-0"
          @click="compositionStore.reattachTerritory(row.code)"
        >
          <i class="ri-map-pin-line" />
          {{ t('territory.geographic.reattach') }}
        </button>

        <button
          v-if="group.key === 'hidden'"
          type="button"
          class="btn btn-ghost btn-xs shrink-0"
          @click="compositionStore.addTerritoryToComposite(row.code)"
        >
          <i class="ri-eye-line" />
          {{ t('territory.geographic.show') }}
        </button>
        <button
          v-else
          type="button"
          class="btn btn-ghost btn-xs btn-square shrink-0"
          :title="t('territory.geographic.hide')"
          :aria-label="t('territory.geographic.hide')"
          @click="viewStore.removeTerritoryFromComposite(row.code)"
        >
          <i class="ri-eye-off-line" />
        </button>
      </li>
    </ul>
  </section>
</template>
