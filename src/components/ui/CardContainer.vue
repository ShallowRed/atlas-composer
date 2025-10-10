<script setup lang="ts">
interface Props {
  title?: string
  icon?: string
  bordered?: boolean
  shadow?: boolean
  hasOverflow?: boolean
}

withDefaults(defineProps<Props>(), {
  title: undefined,
  icon: undefined,
  bordered: true,
  shadow: true,
  hasOverflow: false,
})
</script>

<template>
  <div
    class="card card-sm bg-base-100"
    :class="[
      bordered && 'card-border border-base-300',
      shadow && 'shadow-lg',
    ]"
  >
    <div
      class="card-body" :class="[{
        'overflow-hidden': hasOverflow,
      }]"
    >
      <h2 v-if="title" class="card-title px-2">
        <i v-if="icon" :class="icon" />
        {{ title }}
      </h2>
      <div class="overflow-y-auto p-2">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-body.overflow-hidden {
  position: relative;
}
.card-body.overflow-hidden::after {
  --p: var(--card-p, 1.5rem);
  content: '';
  position: absolute;
  bottom: var(--p);
  left: var(--p);
  right: var(--p);
  height: 2rem;
  pointer-events: none;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(255, 255, 255, 1));
}
</style>
