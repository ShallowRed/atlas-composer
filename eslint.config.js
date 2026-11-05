import antfu from '@antfu/eslint-config'

// Architecture boundaries (AGENTS.md). A later block replaces the options of an
// earlier one for the same rule, so each folder lists all its restrictions.
// A `**/` pattern matches the alias `@/` and the relative paths alike.
function folders(...names) {
  return names.flatMap(name => [`**/${name}`, `**/${name}/*`])
}

const UI = {
  group: folders('components', 'views', 'composables'),
  message: 'Components, views and composables are the interface: pass the value they need as an argument, or move the logic to src/core/ or a store action.',
}

const STORES_FROM_IO = {
  group: [...folders('stores'), 'pinia'],
  message: 'Services hold no application state: the use case that reads or writes a store is an action of src/stores/, which passes the values to the service. Shared types go to src/types/.',
}

const CORE_RESTRICTIONS = [
  UI,
  {
    group: [...folders('stores', 'i18n'), 'pinia', 'vue', 'vue-i18n'],
    message: 'src/core/ is the framework-free domain: a store or a component passes reactive state and translations as arguments.',
  },
  {
    group: folders('services'),
    message: 'src/core/ has no I/O: a service in src/services/ loads or renders, and calls src/core/.',
  },
]

const SERVICES_FROM_UI = {
  group: folders('services'),
  message: 'Components reach services through a store action, and rendering through a composable of src/composables/.',
}

const SERVICES_FROM_COMPOSABLES = {
  regex: '^(?:@|\\.{1,2})/(?:[^/]+/)*services/(?!rendering/)',
  message: 'Composables call src/services/rendering/ only: reach the other services through a store action.',
}

const ANTFU_GLOBALS = [
  { name: 'global', message: 'Use `globalThis` instead.' },
  { name: 'self', message: 'Use `globalThis` instead.' },
]

const CORE_GLOBALS = [
  ...ANTFU_GLOBALS,
  { name: 'fetch', message: 'src/core/ has no I/O: load the data in src/services/ and pass it as an argument.' },
  { name: 'localStorage', message: 'src/core/ has no I/O: read the stored value in a store and pass it as an argument.' },
]

// Files that break a boundary on the current code, grouped by the change that
// brings them into line. Remove a file from this list when it complies.
const BOUNDARY_EXCEPTIONS = [
  // Application state in d3 parameters
  'src/composables/useParameterProvider.ts',
  // Validation by @atlas-composer/specification
  'src/core/presets/validator.ts',
  // Use cases in store actions
  'src/core/atlases/i18n-utils.ts',
  'src/core/atlases/registry.ts',
  'src/services/initialization/initialization-service.ts',
  'src/services/presets/preset-application-service.ts',
  'src/services/territory/territory-data-service.ts',
  'src/services/data/territory-filter-service.ts',
  'src/services/data/territory-data-loader.ts',
  'src/stores/atlas.ts',
  'src/stores/view.ts',
  'src/composables/useAtlasData.ts',
  'src/composables/useTerritoryData.ts',
  'src/composables/useTerritoryReset.ts',
  'src/composables/useTerritoryVisibility.ts',
  'src/composables/useUrlState.ts',
  'src/composables/useViewState.ts',
  'src/components/MapRenderer.vue',
  'src/components/ui/export/CompositeExportDialog.vue',
  'src/components/ui/import/ImportModal.vue',
  'src/components/ui/presets/PresetSelector.vue',
]

export default antfu({
  ignores: [
    'src/public/data',
    // Code blocks in docs/ are excerpts, not compiled sources
    'docs/**/*.md',
    // Copy of configs/presets, linted at its source
    'packages/preset-library/presets',
  ],

  rules: {
    'no-console': 'off',
    'no-debugger': 'off',
    'eslint-comments/no-unlimited-disable': 'off',
    'ts/ban-ts-comment': 'off',
  },
}, {
  files: ['**/*.vue'],
  rules: {
    'vue/max-attributes-per-line': [
      'error',
      {
        singleline: {
          max: 1,
        },
        multiline: {
          max: 1,
        },
      },
    ],
  },
}, {
  files: ['src/core/**'],
  ignores: ['**/__tests__/**'],
  rules: {
    'no-restricted-imports': ['error', { patterns: CORE_RESTRICTIONS }],
    'no-restricted-globals': ['error', ...CORE_GLOBALS],
  },
}, {
  files: ['src/services/**'],
  ignores: ['**/__tests__/**'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [UI, STORES_FROM_IO] }],
  },
}, {
  files: ['src/stores/**'],
  ignores: ['**/__tests__/**'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [UI] }],
  },
}, {
  files: ['src/composables/**'],
  ignores: ['**/__tests__/**'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [
      { group: folders('components', 'views'), message: UI.message },
      SERVICES_FROM_COMPOSABLES,
    ] }],
  },
}, {
  files: ['src/components/**', 'src/views/**'],
  ignores: ['**/__tests__/**'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [SERVICES_FROM_UI] }],
  },
}, {
  files: BOUNDARY_EXCEPTIONS,
  rules: {
    'no-restricted-imports': 'off',
    'no-restricted-globals': ['error', ...ANTFU_GLOBALS],
  },
})
