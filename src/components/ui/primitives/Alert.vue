<script setup lang="ts">
interface Props {
  type?: 'info' | 'success' | 'warning' | 'error'
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
    class="alert"
    :class="[
      { 'alert-soft': soft },
      type ? `alert-${type}` : '',
      size ? `alert-${size}` : '',
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
      class="btn btn-sm btn-ghost"
      aria-label="Dismiss"
      @click="emit('dismiss')"
    >
      ✕
    </button>
  </div>
</template>
