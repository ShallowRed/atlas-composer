<script setup lang="ts">
import type { AlertType } from '@/components/ui/primitives/Alert.vue'
import Alert from '@/components/ui/primitives/Alert.vue'

export interface Toast {
  id: string
  message: string
  type: AlertType
}

defineProps<{
  toasts: Toast[]
}>()

const emit = defineEmits<{
  close: [id: string]
}>()
</script>

<template>
  <Teleport to="body">
    <TransitionGroup
      tag="div"
      class="toast toast-top toast-end z-[1000] max-w-[calc(100vw-2rem)] whitespace-normal"
      enter-active-class="transition-all duration-300"
      leave-active-class="transition-all duration-300"
      enter-from-class="opacity-0 -translate-y-2"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <Alert
        v-for="toast in toasts"
        :key="toast.id"
        :type="toast.type"
        :soft="false"
        dismissible
        @dismiss="emit('close', toast.id)"
      >
        {{ toast.message }}
      </Alert>
    </TransitionGroup>
  </Teleport>
</template>
