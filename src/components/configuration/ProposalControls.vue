<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import NewCompositionModal from '@/components/configuration/NewCompositionModal.vue'
import ProposalOptionsControls from '@/components/configuration/ProposalOptionsControls.vue'
import { useTerritoryTransforms } from '@/composables/useTerritoryTransforms'
import { useAppStore } from '@/stores/app'
import { useCompositionStore } from '@/stores/composition'
import { usePresetDefaultsStore } from '@/stores/presetDefaults'

const { t } = useI18n()
const { differsFromReference } = useTerritoryTransforms()
const appStore = useAppStore()
const compositionStore = useCompositionStore()
const presetDefaults = usePresetDefaultsStore()

const showNewComposition = ref(false)
</script>

<template>
  <div class="flex flex-col gap-3">
    <button
      type="button"
      class="btn btn-soft btn-primary btn-sm w-full"
      :disabled="appStore.showSkeleton"
      @click="showNewComposition = true"
    >
      <i class="ri-add-line" />
      {{ t('proposal.newComposition') }}
    </button>

    <template v-if="presetDefaults.proposal">
      <ProposalOptionsControls
        :arrangement="presetDefaults.proposal.arrangement"
        :scale-mode="presetDefaults.proposal.scaleMode"
        :disabled="differsFromReference"
        @update:arrangement="compositionStore.recomposeProposal({ arrangement: $event })"
        @update:scale-mode="compositionStore.recomposeProposal({ scaleMode: $event })"
      />
      <p
        v-if="differsFromReference"
        class="text-xs text-base-content/70"
      >
        {{ t('proposal.adjusted') }}
      </p>
    </template>

    <NewCompositionModal v-model="showNewComposition" />
  </div>
</template>
