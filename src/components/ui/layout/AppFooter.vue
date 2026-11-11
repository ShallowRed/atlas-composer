<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <footer class="border-t border-base-300 bg-base-100">
    <div class="page-column flex flex-col gap-1 py-6 text-sm text-base-content/70 sm:flex-row sm:justify-between">
      <p>{{ t('footer.builtWith') }}</p>
      <p>
        {{ t('footer.license') }}
        <a
          href="https://github.com/shallowred/atlas-composer/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
          class="link link-hover"
        >{{ t('footer.licenseName') }}</a>
      </p>
    </div>
  </footer>
</template>
