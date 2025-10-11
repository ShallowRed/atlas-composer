<template>
  <div class="lg:max-h-[calc(100vh-8rem)] grid grid-cols-1 lg:grid-cols-4 lg:grid-rows-[1fr_auto] gap-6 px-2 md:px-4 lg:px-0">
    <section class="lg:col-start-1 lg:col-end-2 row-start-1 lg:row-start-1 lg:row-end-3 flex overflow-y-auto">
      <slot name="left-sidebar" />
    </section>
    <section class="lg:col-start-2 lg:col-end-4 row-start-4 lg:row-start-1 lg:row-end-2 flex overflow-y-auto min-h-0">
      <slot name="main-content" />
    </section>
    <section class="lg:col-start-2 lg:col-end-4 row-start-3 lg:row-start-2 lg:row-end-3 flex min-h-fit">
      <slot name="bottom-bar" />
    </section>
    <section class="lg:col-start-4 lg:col-end-5 row-start-2 lg:row-start-1 lg:row-end-3 flex overflow-y-auto">
      <slot name="right-sidebar" />
    </section>
  </div>
</template>
