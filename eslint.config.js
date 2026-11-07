import antfu from '@antfu/eslint-config'

// Architecture boundaries (AGENTS.md). A later block replaces the options of an
// earlier one for the same rule, so each folder lists all its restrictions.
// A `**/` pattern matches the alias `@/` and the relative paths alike.
function folders(...names) {
  return names.flatMap(name => [`**/${name}`, `**/${name}/*`])
}

const AJV = {
  group: ['ajv', 'ajv/*', 'ajv-formats'],
  message: 'Composite configurations are validated by validateConfig of @atlas-composer/specification.',
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
  AJV,
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
  // Use cases in store actions
  'src/core/atlases/i18n-utils.ts',
  'src/core/atlases/registry.ts',
  'src/services/initialization/initialization-service.ts',
  'src/services/presets/preset-application-service.ts',
  'src/services/territory/territory-data-service.ts',
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

// Options of @antfu/eslint-config for these rules
const ANTFU_RESTRICTED_SYNTAX = ['TSEnumDeclaration[const=true]', 'TSExportAssignment']
const ANTFU_VUE_RESTRICTED_SYNTAX = ['DebuggerStatement', 'LabeledStatement', 'WithStatement']

const DEPRECATED_POSITIONING_KEYS = /focusLongitude|focusLatitude|rotateGamma/.source
const DEPRECATED_POSITIONING_MESSAGE = 'Positioning is stored as d3 parameters (rotate, center); deprecated forms are converted in src/core/positioning/.'
const DEPRECATED_POSITIONING = [
  `Identifier[name=/${DEPRECATED_POSITIONING_KEYS}/]`,
  `Literal[value=/${DEPRECATED_POSITIONING_KEYS}/]`,
  `TemplateElement[value.raw=/${DEPRECATED_POSITIONING_KEYS}/]`,
].map(selector => ({ selector, message: DEPRECATED_POSITIONING_MESSAGE }))

const DEFAULT_REFERENCE_SCALE = {
  selector: 'Literal[value=2700]',
  message: 'The default reference scale is DEFAULT_REFERENCE_SCALE of @atlas-composer/specification.',
}

export default antfu({
  ignores: [
    'src/public/data',
    // Code blocks in docs/ are excerpts, not compiled sources
    'docs/**/*.md',
    // Generated from the schema by the build of the specification
    'packages/specification/src/generated',
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
  files: ['src/**', 'packages/*/src/**'],
  ignores: ['**/__tests__/**'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [AJV] }],
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
    'no-restricted-imports': ['error', { patterns: [AJV, UI, STORES_FROM_IO] }],
  },
}, {
  files: ['src/stores/**'],
  ignores: ['**/__tests__/**'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [AJV, UI] }],
  },
}, {
  files: ['src/composables/**'],
  ignores: ['**/__tests__/**'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [
      AJV,
      { group: folders('components', 'views'), message: UI.message },
      SERVICES_FROM_COMPOSABLES,
    ] }],
  },
}, {
  files: ['src/components/**', 'src/views/**'],
  ignores: ['**/__tests__/**'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [AJV, SERVICES_FROM_UI] }],
  },
}, {
  files: BOUNDARY_EXCEPTIONS,
  rules: {
    'no-restricted-imports': ['error', { patterns: [AJV] }],
    'no-restricted-globals': ['error', ...ANTFU_GLOBALS],
  },
}, {
  files: ['src/**/*.ts', 'src/**/*.vue'],
  ignores: ['src/core/positioning/**', '**/__tests__/**', '**/*.d.ts'],
  rules: {
    'no-restricted-syntax': ['error', ...ANTFU_RESTRICTED_SYNTAX, ...DEPRECATED_POSITIONING, DEFAULT_REFERENCE_SCALE],
    'vue/no-restricted-syntax': ['error', ...ANTFU_VUE_RESTRICTED_SYNTAX, ...DEPRECATED_POSITIONING, DEFAULT_REFERENCE_SCALE],
  },
}, {
  files: ['packages/projection-loader/src/**'],
  rules: {
    'no-restricted-syntax': ['error', ...ANTFU_RESTRICTED_SYNTAX, DEFAULT_REFERENCE_SCALE],
  },
})
