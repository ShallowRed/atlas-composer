<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface Option {
  value: string
  label: string
  /** If true, label is already translated and should not be passed through $t(). Defaults to false (label is a translation key) */
  translated?: boolean
}

interface OptionGroup {
  key?: string
  label?: string
  category?: string
  options?: Option[]
}

interface Props {
  label: string
  icon?: string
  modelValue?: string
  disabled?: boolean
  options?: Option[]
  optionGroups?: OptionGroup[]
}

const props = withDefaults(defineProps<Props>(), {
  icon: undefined,
  modelValue: undefined,
  disabled: false,
  options: undefined,
  optionGroups: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [value: string]
}>()

const { t } = useI18n()

const localValue = computed({
  get: () => props.modelValue,
  set: (value: string | undefined) => {
    if (value !== undefined) {
      emit('update:modelValue', value)
      emit('change', value)
    }
  },
})

// Translate category to label
function getCategoryLabel(group: OptionGroup): string {
  // If label is provided, use it directly
  if (group.label) {
    return group.label
  }

  // If category is provided, translate it
  if (group.category) {
    const translationKey = `projections.categories.${group.category}`
    return t(translationKey)
  }

  return ''
}
</script>

<template>
  <fieldset class="fieldset form-control flex flex-col">
    <!-- Select with Option Groups -->
    <template v-if="optionGroups">
      <legend class="fieldset-legend text-xl">
        <span class="label-text flex items-center gap-2">
          <i
            v-if="icon"
            :class="icon"
          />
          {{ label }}
        </span>
      </legend>
      <select
        v-model="localValue"
        class="select cursor-pointer border bg-base-200/30"
        :disabled="disabled"
      >
        <optgroup
          v-for="group in optionGroups"
          :key="group.key || group.category"
          :label="getCategoryLabel(group)"
        >
          <option
            v-for="option in group.options || []"
            :key="option.value"
            :value="option.value"
          >
            {{ option.translated ? option.label : $t(option.label) }}
          </option>
        </optgroup>
      </select>
    </template>

    <!-- Select with Simple Options -->
    <template v-else-if="options">
      <legend class="fieldset-legend text-sm">
        <span class="label-text flex items-center gap-2">
          <i
            v-if="icon"
            :class="icon"
          />
          {{ label }}
        </span>
      </legend>
      <select
        v-model="localValue"
        class="select cursor-pointer border bg-base-200/30"
        :disabled="disabled"
      >
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
        >
          {{ option.translated ? option.label : $t(option.label) }}
        </option>
      </select>
    </template>

    <!-- Select with Default Slot -->
    <template v-else>
      <legend class="fieldset-legend text-sm">
        <span class="label-text flex items-center gap-2">
          <i
            v-if="icon"
            :class="icon"
          />
          {{ label }}
        </span>
      </legend>
      <select
        v-model="localValue"
        class="select cursor-pointer border bg-base-200/30"
        :disabled="disabled"
      >
        <slot />
      </select>
    </template>
  </fieldset>
</template>
