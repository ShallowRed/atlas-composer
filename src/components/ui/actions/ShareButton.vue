<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUrlState } from '@/composables/useUrlState'
import { useUIStore } from '@/stores/ui'

const { t } = useI18n()
const uiStore = useUIStore()
const { shareableUrl, copyShareableUrl } = useUrlState()

const isOpen = ref(false)
const copied = ref(false)

async function handleCopy() {
  const success = await copyShareableUrl()
  if (success) {
    copied.value = true
    uiStore.showToast(t('share.copied'), 'success')
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
  else {
    uiStore.showToast(t('share.copyFailed'), 'error')
  }
}

function toggleModal() {
  isOpen.value = !isOpen.value
  if (!isOpen.value) {
    copied.value = false
  }
}
</script>

<template>
  <div>
    <button
      class="btn btn-ghost btn-sm"
      @click="toggleModal"
    >
      <i class="ri-share-line" />
      <span class="hidden sm:inline">{{ t('share.button') }}</span>
    </button>

    <dialog
      :class="{ 'modal-open': isOpen }"
      class="modal"
    >
      <div class="modal-box">
        <h3 class="text-lg font-bold mb-4">
          {{ t('share.title') }}
        </h3>

        <p class="text-sm text-base-content/70 mb-4">
          {{ t('share.description') }}
        </p>

        <div class="bg-base-200 rounded p-3 mb-4 break-all text-sm font-mono">
          {{ shareableUrl }}
        </div>

        <div class="modal-action">
          <button
            class="btn btn-primary"
            :class="{ 'btn-success': copied }"
            @click="handleCopy"
          >
            <i :class="copied ? 'ri-check-line' : 'ri-file-copy-line'" />
            {{ copied ? t('share.copiedButton') : t('share.copyButton') }}
          </button>
          <button
            class="btn btn-ghost"
            @click="toggleModal"
          >
            {{ t('common.close') }}
          </button>
        </div>
      </div>

      <div
        class="modal-backdrop"
        @click="toggleModal"
      />
    </dialog>
  </div>
</template>
