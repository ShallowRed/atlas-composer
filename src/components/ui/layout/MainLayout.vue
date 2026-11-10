<template>
  <div class="grid grid-cols-1 gap-4 lg:min-h-0 lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_22.5rem]">
    <section class="flex min-h-0">
      <slot name="main-content" />
    </section>
    <section class="flex lg:min-h-0">
      <slot name="right-sidebar" />
    </section>
  </div>
</template>
