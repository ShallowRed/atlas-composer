<script setup lang="ts">
import type { Arrangement, ScaleMode } from '@/core/territories/proposal'
import { useI18n } from 'vue-i18n'
import DropdownControl from '@/components/ui/forms/DropdownControl.vue'
import { useProposalOptions } from '@/composables/useProposalOptions'

defineProps<{
  arrangement: Arrangement
  scaleMode: ScaleMode
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:arrangement': [value: Arrangement]
  'update:scaleMode': [value: ScaleMode]
}>()

const { t } = useI18n()
const { arrangementOptions, scaleModeOptions } = useProposalOptions()
</script>

<template>
  <div class="flex flex-col gap-3">
    <DropdownControl
      :model-value="arrangement"
      :label="t('proposal.arrangement')"
      :options="arrangementOptions"
      icon="ri-layout-right-line"
      :disabled="disabled"
      @update:model-value="emit('update:arrangement', $event as Arrangement)"
    />
    <DropdownControl
      :model-value="scaleMode"
      :label="t('proposal.scaleMode')"
      :options="scaleModeOptions"
      icon="ri-zoom-in-line"
      :disabled="disabled"
      @update:model-value="emit('update:scaleMode', $event as ScaleMode)"
    />
  </div>
</template>
