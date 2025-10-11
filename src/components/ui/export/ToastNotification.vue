<script setup lang="ts">
interface Props {
  message: string | null
  type?: 'error' | 'success' | 'warning' | 'info'
  position?: 'top-start' | 'top-center' | 'top-end' | 'bottom-start' | 'bottom-center' | 'bottom-end'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'error',
  position: 'top-end',
})

const emit = defineEmits<{
  close: []
}>()

const alertClass = {
  error: 'alert-error',
  success: 'alert-success',
  warning: 'alert-warning',
  info: 'alert-info',
}

const iconClass = {
  error: 'ri-error-warning-line',
  success: 'ri-checkbox-circle-line',
  warning: 'ri-alert-line',
  info: 'ri-information-line',
}

const toastClass = props.position.split('-').map(p => `toast-${p}`).join(' ')
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-300"
      leave-active-class="transition-all duration-300"
      enter-from-class="opacity-0 translate-y-2"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="message"
        class="toast"
        :class="toastClass"
      >
        <div
          class="alert"
          :class="alertClass[type]"
        >
          <i :class="iconClass[type]" />
          <span>{{ message }}</span>
          <button
            class="btn btn-sm btn-ghost"
            @click="emit('close')"
          >
            <i class="ri-close-line" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast {
  z-index: 1000;
}
</style>
