<script setup lang="ts">
interface Props {
  title?: string
  icon?: string
  width?: string
  bordered?: boolean
  shadow?: boolean
}

withDefaults(defineProps<Props>(), {
  title: undefined,
  icon: undefined,
  width: undefined,
  bordered: true,
  shadow: true,
})
</script>

<template>
  <div
    class="card bg-base-100 h-min"
    :class="[
      bordered && 'card-border border-base-300',
      shadow && 'shadow-lg',
      width,
    ]"
  >
    <div class="card-body">
      <h2 v-if="title" class="card-title text-2xl mb-4">
        <i v-if="icon" class="text-xl" :class="icon" />
        {{ title }}
      </h2>
      <slot />
    </div>
  </div>
</template>
