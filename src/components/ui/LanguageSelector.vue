<script setup lang="ts">
import type { SupportedLocale } from '@/i18n'
import { useI18n } from 'vue-i18n'
import { setLocale, SUPPORTED_LOCALES } from '@/i18n'

const { locale } = useI18n()

function changeLanguage(newLocale: SupportedLocale) {
  setLocale(newLocale)
}
</script>

<template>
  <div class="dropdown dropdown-end">
    <div tabindex="0" role="button" class="btn btn-ghost">
      <i class="ri-translate-2" />
    </div>
    <ul
      tabindex="0"
      class="menu dropdown-content z-[1] mt-1 w-52 rounded-box bg-base-100 shadow border border-base-300"
    >
      <li
        v-for="(label, code) in SUPPORTED_LOCALES"
        :key="code"
      >
        <a
          :class="{ active: locale === code }"
          @click="changeLanguage(code as SupportedLocale)"
        >
          {{ label }}
        </a>
      </li>
    </ul>
  </div>
</template>
