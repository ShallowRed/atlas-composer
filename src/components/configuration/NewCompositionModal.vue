<script setup lang="ts">
import type { SuggestedArrangement, SuggestedScaleMode } from '@/core/territories/suggested-composition'
import type { TerritoryCode } from '@/types/branded'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import Modal from '@/components/ui/primitives/Modal.vue'
import { useCollectionSet } from '@/composables/useCollectionSet'
import { useLocalizedName } from '@/composables/useLocalizedName'
import { useSuggestionOptions } from '@/composables/useSuggestionOptions'
import { useTerritoryNames } from '@/composables/useTerritoryNames'
import { getAtlasSpecificConfig, isAtlasLoaded } from '@/core/atlases/registry'
import { useAtlasStore } from '@/stores/atlas'
import { useCompositionStore } from '@/stores/composition'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { t } = useI18n()
const { localize } = useLocalizedName()
const { territoryName } = useTerritoryNames()
const { arrangementOptions, scaleModeOptions } = useSuggestionOptions()
const atlasStore = useAtlasStore()
const compositionStore = useCompositionStore()
const collectionSetKey = useCollectionSet('territoryManager', 'mutually-exclusive')

const checked = ref(new Set<TerritoryCode>())
const arrangement = ref<SuggestedArrangement>('insets-right')
const scaleMode = ref<SuggestedScaleMode>('readable')

interface TerritoryGroup {
  id: string
  label: string
  territories: { code: TerritoryCode, name: string }[]
}

const groups = computed((): TerritoryGroup[] => {
  const territories = atlasStore.territories.map(territory => ({
    code: territory.code,
    name: territoryName(territory.code, territory.code),
  }))
  const atlasId = atlasStore.selectedAtlasId
  const collectionSet = collectionSetKey.value && isAtlasLoaded(atlasId)
    ? getAtlasSpecificConfig(atlasId).territoryCollections?.[collectionSetKey.value]
    : undefined
  if (!collectionSet) {
    return [{ id: 'all', label: t('territory.territories'), territories }]
  }

  const byCode = new Map(territories.map(territory => [territory.code as string, territory]))
  return collectionSet.collections
    .filter(collection => collection.codes !== '*')
    .map(collection => ({
      id: collection.id,
      label: localize(collection.label),
      territories: (collection.codes as string[]).flatMap(code => byCode.get(code) ?? []),
    }))
    .filter(group => group.territories.length > 0)
})

function isGroupChecked(group: TerritoryGroup): boolean {
  return group.territories.every(({ code }) => checked.value.has(code))
}

function toggleGroup(group: TerritoryGroup) {
  const next = new Set(checked.value)
  const check = !isGroupChecked(group)
  for (const { code } of group.territories) {
    if (check) {
      next.add(code)
    }
    else {
      next.delete(code)
    }
  }
  checked.value = next
}

function toggleTerritory(code: TerritoryCode) {
  const next = new Set(checked.value)
  if (!next.delete(code)) {
    next.add(code)
  }
  checked.value = next
}

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    checked.value = new Set()
  }
})

function close() {
  emit('update:modelValue', false)
}

function compose() {
  compositionStore.startSuggestedComposition([...checked.value], {
    arrangement: arrangement.value,
    scaleMode: scaleMode.value,
  })
  close()
}
</script>

<template>
  <Modal
    :model-value="modelValue"
    :title="t('suggestion.title')"
    max-width="2xl"
    @update:model-value="close"
  >
    <p class="text-sm text-base-content/70 mb-4">
      {{ t('suggestion.description') }}
    </p>

    <div class="flex flex-col gap-4">
      <section
        v-for="group in groups"
        :key="group.id"
      >
        <div
          class="flex items-center justify-between gap-2 mb-1"
        >
          <h4 class="text-sm font-semibold">
            {{ group.label }}
          </h4>
          <button
            type="button"
            class="btn btn-ghost btn-xs"
            @click="toggleGroup(group)"
          >
            {{ isGroupChecked(group) ? t('suggestion.uncheckAll') : t('suggestion.checkAll') }}
          </button>
        </div>
        <ul class="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <li
            v-for="territory in group.territories"
            :key="territory.code"
          >
            <label class="label cursor-pointer justify-start gap-3 py-1.5 text-base-content whitespace-normal">
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                :checked="checked.has(territory.code)"
                @change="toggleTerritory(territory.code)"
              >
              <span class="text-sm">{{ territory.name }}</span>
            </label>
          </li>
        </ul>
      </section>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 mt-4 pt-2 border-t border-base-300">
      <DropdownControl
        :model-value="arrangement"
        :label="t('suggestion.arrangement')"
        :options="arrangementOptions"
        icon="ri-layout-right-line"
        @update:model-value="arrangement = $event as SuggestedArrangement"
      />
      <DropdownControl
        :model-value="scaleMode"
        :label="t('suggestion.scaleMode')"
        :options="scaleModeOptions"
        icon="ri-zoom-in-line"
        @update:model-value="scaleMode = $event as SuggestedScaleMode"
      />
    </div>

    <template #actions>
      <span class="text-sm text-base-content/70 mr-auto self-center">
        {{ t('suggestion.selectedCount', checked.size) }}
      </span>
      <button
        type="button"
        class="btn btn-primary btn-outline"
        @click="close"
      >
        {{ t('common.cancel') }}
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="checked.size === 0"
        @click="compose"
      >
        <i class="ri-check-line" />
        {{ t('suggestion.compose') }}
      </button>
    </template>
  </Modal>
</template>
