<script setup lang="ts">
import { useI18n } from 'vue-i18n'

export type AlertType = 'info' | 'success' | 'warning' | 'error'

interface Props {
  type?: AlertType
  soft?: boolean
  icon?: string
  size?: 'xs' | 'sm' | 'md'
  dismissible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  soft: true,
  icon: undefined,
  size: undefined,
  dismissible: false,
})

const emit = defineEmits<{
  dismiss: []
}>()

const { t } = useI18n()

// Written in full, since Tailwind generates only the classes it finds in the code
const typeClasses = { info: 'alert-info', success: 'alert-success', warning: 'alert-warning', error: 'alert-error' }
const textSizes = { xs: 'text-xs', sm: 'text-sm', md: 'text-base' }

const defaultIcons = {
  info: 'ri-information-line',
  success: 'ri-checkbox-circle-line',
  warning: 'ri-alert-line',
  error: 'ri-error-warning-line',
}

const displayIcon = props.icon || defaultIcons[props.type]
</script>

<template>
  <div
    class="alert items-start [&_.btn-sm]:-my-1.5"
    :class="[
      { 'alert-soft': soft },
      typeClasses[type],
      size ? textSizes[size] : '',
    ]"
  >
    <i
      v-if="displayIcon"
      :class="displayIcon"
    />
    <div class="flex-1">
      <slot />
    </div>
    <button
      v-if="dismissible"
      class="btn btn-sm btn-ghost btn-square"
      :aria-label="t('actions.close')"
      @click="emit('dismiss')"
    >
      <i class="ri-close-line" />
    </button>
  </div>
</template>
