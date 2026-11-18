<script setup lang="ts">
import type { AxisControl } from '@/core/parameters'
import { computed } from 'vue'
import NumberField from '@/components/ui/forms/NumberField.vue'
import ParameterTrack from '@/components/ui/forms/ParameterTrack.vue'

interface Props {
  label: string
  modelValue: number
  control: AxisControl
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const hasTrack = computed(() => props.control.track !== undefined && 'scale' in props.control.track)
</script>

<template>
  <div>
    <div class="mb-1 flex items-center justify-between gap-3">
      <span class="text-xs font-medium text-base-content/70">{{ label }}</span>
      <div class="w-24 flex-none">
        <NumberField
          :model-value="modelValue"
          :label="label"
          :control="control"
          @update:model-value="(value: number) => emit('update:modelValue', value)"
        />
      </div>
    </div>
    <ParameterTrack
      v-if="hasTrack"
      :model-value="modelValue"
      :label="label"
      :control="control"
      @update:model-value="(value: number) => emit('update:modelValue', value)"
    />
  </div>
</template>
