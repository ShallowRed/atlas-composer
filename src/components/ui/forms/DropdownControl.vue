<script setup lang="ts">
import { computed, ref } from 'vue'

interface Option {
  value: string
  label: string
  icon?: string
  badge?: string
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

const isOpen = ref(false)

const localValue = computed({
  get: () => props.modelValue,
  set: (value: string | undefined) => {
    if (value !== undefined) {
      emit('update:modelValue', value)
      emit('change', value)
      isOpen.value = false
    }
  },
})

// Get the selected option label and icon for display
const selectedOption = computed(() => {
  if (!localValue.value)
    return null

  if (props.options) {
    return props.options.find(opt => opt.value === localValue.value)
  }

  if (props.optionGroups) {
    for (const group of props.optionGroups) {
      const found = group.options?.find(opt => opt.value === localValue.value)
      if (found)
        return found
    }
  }

  return null
})

function selectOption(value: string) {
  localValue.value = value
}

function handleBlur() {
  setTimeout(() => {
    isOpen.value = false
  }, 200)
}
</script>

<template>
  <fieldset class="fieldset form-control flex flex-col">
    <legend class="fieldset-legend text-xl">
      <span class="label-text flex items-center gap-2">
        <i
          v-if="icon"
          :class="icon"
        />
        {{ label }}
      </span>
    </legend>

    <div
      class="dropdown w-full"
      :class="{ 'dropdown-open': isOpen }"
    >
      <div
        tabindex="0"
        role="button"
        class="btn w-full justify-between border bg-base-200/30"
        :class="{ 'btn-disabled': disabled }"
        @focus="isOpen = true"
        @blur="handleBlur"
      >
        <span
          v-if="selectedOption"
          class="flex items-center gap-2"
        >
          <i
            v-if="selectedOption.icon"
            :class="selectedOption.icon"
          />
          <span
            v-if="selectedOption.badge"
            class="badge badge-primary badge-sm"
          >{{ selectedOption.badge }}</span>
          {{ selectedOption.label }}
        </span>
        <span
          v-else
          class="text-base-content/50"
        >Select...</span>
        <i class="ri-arrow-down-s-line text-lg" />
      </div>

      <!-- Dropdown with Option Groups -->
      <ul
        v-if="optionGroups"
        tabindex="0"
        class="dropdown-content menu bg-base-100 rounded-box z-[100] w-full max-h-96 overflow-y-auto p-2 shadow-lg border border-base-300"
        @focus="isOpen = true"
      >
        <template
          v-for="group in optionGroups"
          :key="group.key || group.category"
        >
          <li class="menu-title">
            {{ group.label || group.category }}
          </li>
          <li
            v-for="option in group.options || []"
            :key="option.value"
          >
            <button
              :class="{ active: localValue === option.value }"
              @click="selectOption(option.value)"
            >
              <i
                v-if="option.icon"
                :class="option.icon"
              />
              <span
                v-if="option.badge"
                class="badge badge-primary badge-sm"
              >{{ option.badge }}</span>
              {{ $t(option.label) }}
            </button>
          </li>
        </template>
      </ul>

      <!-- Dropdown with Simple Options -->
      <ul
        v-else-if="options"
        tabindex="0"
        class="dropdown-content menu bg-base-100 rounded-box z-[100] w-full max-h-96 overflow-y-auto p-2 shadow-lg border border-base-300"
        @focus="isOpen = true"
      >
        <li
          v-for="option in options"
          :key="option.value"
        >
          <button
            :class="{ active: localValue === option.value }"
            @click="selectOption(option.value)"
          >
            <i
              v-if="option.icon"
              :class="option.icon"
            />
            <span
              v-if="option.badge"
              class="badge badge-primary badge-sm"
            >{{ option.badge }}</span>
            {{ option.label }}
          </button>
        </li>
      </ul>
    </div>
  </fieldset>
</template>
