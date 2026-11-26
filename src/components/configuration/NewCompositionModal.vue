<script setup lang="ts">
import type { TerritoryGroup } from '@/composables/useTerritoryGroups'
import type { Arrangement, ScaleMode } from '@/core/territories/proposal'
import type { TerritoryCode } from '@/types/branded'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ProposalOptionsControls from '@/components/configuration/ProposalOptionsControls.vue'
import Modal from '@/components/ui/primitives/Modal.vue'
import { useCollectionSet } from '@/composables/useCollectionSet'
import { useTerritoryGroups } from '@/composables/useTerritoryGroups'
import { useCompositionStore } from '@/stores/composition'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { t } = useI18n()
const compositionStore = useCompositionStore()
const groups = useTerritoryGroups(useCollectionSet('territoryManager', 'mutually-exclusive'))

const checked = ref(new Set<TerritoryCode>())
const arrangement = ref<Arrangement>('insets-right')
const scaleMode = ref<ScaleMode>('readable')

function isGroupChecked(group: TerritoryGroup): boolean {
  return group.territories.every(({ code }) => checked.value.has(code))
}

function toggleGroup(group: TerritoryGroup) {
  const check = !isGroupChecked(group)
  const next = new Set(checked.value)
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

// Each opening starts from no territory checked and from the starting options
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    checked.value = new Set()
    arrangement.value = 'insets-right'
    scaleMode.value = 'readable'
  }
})

function close() {
  emit('update:modelValue', false)
}

function compose() {
  compositionStore.startProposal([...checked.value], { arrangement: arrangement.value, scaleMode: scaleMode.value })
  close()
}
</script>

<template>
  <Modal
    :model-value="modelValue"
    :title="t('proposal.title')"
    max-width="2xl"
    @update:model-value="close"
  >
    <p class="text-sm text-base-content/70 mb-4">
      {{ t('proposal.description') }}
    </p>

    <div class="flex flex-col gap-4">
      <section
        v-for="group in groups"
        :key="group.id"
      >
        <div class="flex items-center justify-between gap-2 mb-1">
          <h4 class="text-sm font-semibold">
            {{ group.label || t('territory.territories') }}
          </h4>
          <button
            v-if="group.territories.length > 1"
            type="button"
            class="btn btn-ghost btn-xs"
            @click="toggleGroup(group)"
          >
            {{ isGroupChecked(group) ? t('proposal.uncheckAll') : t('proposal.checkAll') }}
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

    <ProposalOptionsControls
      v-model:arrangement="arrangement"
      v-model:scale-mode="scaleMode"
      class="mt-4 pt-2 border-t border-base-300"
    />

    <template #actions>
      <span class="text-sm text-base-content/70 mr-auto self-center">
        {{ t('proposal.checkedCount', checked.size) }}
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
        {{ t('proposal.compose') }}
      </button>
    </template>
  </Modal>
</template>
