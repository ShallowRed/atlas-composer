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

const LOCALE_FROM_IO = {
  group: [...folders('i18n'), 'vue-i18n'],
  message: 'Services receive the locale as an argument from a store action.',
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

const PROJECTION_LIBRARIES = {
  group: ['d3-geo-projection', 'd3-composite-projections', 'd3-composite-projections/*'],
  message: 'Each definition of src/core/projections/definitions/ holds the function that creates its projection.',
}

const ATLASES_FROM_PROJECTIONS = {
  group: folders('atlases'),
  message: 'A caller passes the projections that an atlas recommends through ProjectionFilterContext.recommended.',
}

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

// Options of @antfu/eslint-config for these rules
const ANTFU_RESTRICTED_SYNTAX = ['TSEnumDeclaration[const=true]', 'TSExportAssignment']
const ANTFU_VUE_RESTRICTED_SYNTAX = ['DebuggerStatement', 'LabeledStatement', 'WithStatement']

const RESULT_FIELDS_MESSAGE = 'A failure is a Result of src/core/types/result.ts: read ok, value and error.'
const RESULT_FIELDS = [
  'MemberExpression[property.name=/^(success|isValid)$/]',
  'TSPropertySignature[key.name=/^(success|isValid)$/]',
  'PropertyDefinition[key.name=/^(success|isValid)$/]',
  'Property[key.name=\'isValid\']',
  'Property[key.value=/^(success|isValid)$/]',
  'Property[key.name=\'success\']:not([value.value=type(string)])',
].map(selector => ({ selector, message: RESULT_FIELDS_MESSAGE }))

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

const SELECTION_WRITES = [
  'AssignmentExpression[left.property.name=/^(selectedAtlasId|viewMode)$/]',
  'VAttribute[directive=true][key.name.name=\'model\'] MemberExpression[property.name=/^(selectedAtlasId|viewMode)$/]',
].map(selector => ({
  selector,
  message: 'The atlas and the view mode change through selectAtlas and selectViewMode of src/stores/composition.ts.',
}))

const RANGE_SLIDER_LITERALS = {
  selector: 'VElement[rawName=\'RangeSlider\'] > VStartTag > VAttribute[directive=true][key.name.name=\'bind\'][key.argument.name=/^(min|max|step)$/][value.expression.type=/^(Literal|UnaryExpression)$/]',
  message: 'The range of a slider comes from the parameter registry: read getNumberRange or getTupleRanges of src/stores/parameters.ts.',
}

const MERCATOR_LITERAL = {
  selector: 'Literal[value=\'mercator\']',
  message: 'The fallback projection is FALLBACK_PROJECTION_ID of src/core/projections/defaults.ts.',
}

const LITERAL_FALLBACK = 'LogicalExpression[operator=/^(\\?\\?|\\|\\|)$/][right.type=/^(Literal|ArrayExpression|UnaryExpression)$/][right.raw!=\'null\']'
const PARAMETER_KEYS = '/^(translateOffset|scaleMultiplier|parallels|clipAngle|precision|pixelClipExtent)$/'
const TUPLE_PARAMETER_KEYS = '/^(translateOffset|parallels)$/'

// A parameter read as x.key, x?.key or (x.key as T), then an element read as x.key?.[0] or x.key[0]
const PARAMETER_DEFAULT_LITERALS = [
  `${LITERAL_FALLBACK}[left.property.name=${PARAMETER_KEYS}]`,
  `${LITERAL_FALLBACK}[left.expression.property.name=${PARAMETER_KEYS}]`,
  `${LITERAL_FALLBACK}[left.expression.object.property.name=${TUPLE_PARAMETER_KEYS}]`,
  `${LITERAL_FALLBACK}[left.object.property.name=${TUPLE_PARAMETER_KEYS}]`,
].map(selector => ({ selector, message: 'The default value of a parameter comes from parameterRegistry.getDefaultValue of src/core/parameters/parameter-registry.ts.' }))

const PARALLELS_LITERALS = [
  'Property[key.name=\'parallels\'][value.type=\'ArrayExpression\']',
  'Property[key.name=\'parallels\'][value.type=\'TSAsExpression\'][value.expression.type=\'ArrayExpression\']',
].map(selector => ({ selector, message: 'The default value of a parameter comes from parameterRegistry.getDefaultValue of src/core/parameters/parameter-registry.ts, imported from @/core/parameters.' }))

const PRESET_COMPARISON = {
  selector: 'Identifier[name=/^(areValuesEqual|areParametersEqual|toRaw)$/]',
  message: 'The comparison with the preset values is a function of src/stores/presetDefaults.ts.',
}

const CARTOGRAPHER_DATA = {
  selector: 'MemberExpression[property.name=\'geoData\']:not([object.name=\'props\'])',
  message: 'The geographic data of the cartographer is read by an action of the geoData store.',
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
  files: ['src/**'],
  ignores: ['**/__tests__/**', 'src/services/data/json-file-loader.ts'],
  rules: {
    'no-restricted-globals': ['error', ...ANTFU_GLOBALS, { name: 'fetch', message: 'src/services/data/json-file-loader.ts reads the JSON files of the site.' }],
  },
}, {
  files: ['src/core/**'],
  ignores: ['**/__tests__/**'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [...CORE_RESTRICTIONS, PROJECTION_LIBRARIES] }],
    'no-restricted-globals': ['error', ...CORE_GLOBALS],
  },
}, {
  files: ['src/core/projections/**'],
  ignores: ['**/__tests__/**'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [...CORE_RESTRICTIONS, PROJECTION_LIBRARIES, ATLASES_FROM_PROJECTIONS] }],
  },
}, {
  files: ['src/core/projections/definitions/**'],
  ignores: ['**/__tests__/**'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [...CORE_RESTRICTIONS, ATLASES_FROM_PROJECTIONS] }],
  },
}, {
  files: ['src/services/**'],
  ignores: ['**/__tests__/**'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [AJV, UI, STORES_FROM_IO, LOCALE_FROM_IO, PROJECTION_LIBRARIES] }],
  },
}, {
  files: ['src/stores/**'],
  ignores: ['**/__tests__/**'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [AJV, UI, PROJECTION_LIBRARIES] }],
  },
}, {
  files: ['src/composables/**'],
  ignores: ['**/__tests__/**'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [
      AJV,
      { group: folders('components', 'views'), message: UI.message },
      SERVICES_FROM_COMPOSABLES,
      PROJECTION_LIBRARIES,
    ] }],
  },
}, {
  files: ['src/components/**', 'src/views/**'],
  ignores: ['**/__tests__/**'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [AJV, SERVICES_FROM_UI, PROJECTION_LIBRARIES] }],
  },
}, {
  files: ['src/**/*.ts', 'src/**/*.vue'],
  ignores: ['src/core/positioning/**', '**/__tests__/**', '**/*.d.ts'],
  rules: {
    'no-restricted-syntax': ['error', ...ANTFU_RESTRICTED_SYNTAX, ...DEPRECATED_POSITIONING, DEFAULT_REFERENCE_SCALE, MERCATOR_LITERAL, ...PARAMETER_DEFAULT_LITERALS, ...RESULT_FIELDS],
    'vue/no-restricted-syntax': ['error', ...ANTFU_VUE_RESTRICTED_SYNTAX, ...DEPRECATED_POSITIONING, DEFAULT_REFERENCE_SCALE, MERCATOR_LITERAL, ...PARAMETER_DEFAULT_LITERALS, ...RESULT_FIELDS],
  },
}, {
  files: ['src/core/positioning/**'],
  ignores: ['**/__tests__/**'],
  rules: {
    'no-restricted-syntax': ['error', ...ANTFU_RESTRICTED_SYNTAX, ...PARAMETER_DEFAULT_LITERALS, ...RESULT_FIELDS],
  },
}, {
  files: ['src/composables/**', 'src/components/**', 'src/views/**'],
  ignores: ['**/__tests__/**', '**/*.d.ts'],
  rules: {
    'no-restricted-syntax': ['error', ...ANTFU_RESTRICTED_SYNTAX, ...DEPRECATED_POSITIONING, DEFAULT_REFERENCE_SCALE, CARTOGRAPHER_DATA, ...SELECTION_WRITES, MERCATOR_LITERAL, ...PARAMETER_DEFAULT_LITERALS, ...RESULT_FIELDS, PRESET_COMPARISON],
    'vue/no-restricted-syntax': ['error', ...ANTFU_VUE_RESTRICTED_SYNTAX, ...DEPRECATED_POSITIONING, DEFAULT_REFERENCE_SCALE, CARTOGRAPHER_DATA, ...SELECTION_WRITES, MERCATOR_LITERAL, ...PARAMETER_DEFAULT_LITERALS, ...RESULT_FIELDS],
  },
}, {
  files: ['src/components/ui/parameters/TerritoryParameterControls.vue', 'src/components/ui/projections/ProjectionParamsControls.vue'],
  rules: {
    'vue/no-restricted-syntax': ['error', ...ANTFU_VUE_RESTRICTED_SYNTAX, ...DEPRECATED_POSITIONING, DEFAULT_REFERENCE_SCALE, CARTOGRAPHER_DATA, ...SELECTION_WRITES, MERCATOR_LITERAL, ...PARAMETER_DEFAULT_LITERALS, ...RESULT_FIELDS, RANGE_SLIDER_LITERALS],
  },
}, {
  files: ['src/core/projections/**'],
  ignores: ['**/__tests__/**'],
  rules: {
    'no-restricted-syntax': ['error', ...ANTFU_RESTRICTED_SYNTAX, ...DEPRECATED_POSITIONING, DEFAULT_REFERENCE_SCALE, ...PARAMETER_DEFAULT_LITERALS, ...RESULT_FIELDS, ...PARALLELS_LITERALS],
  },
}, {
  files: ['packages/projection-loader/src/**'],
  rules: {
    'no-restricted-syntax': ['error', ...ANTFU_RESTRICTED_SYNTAX, DEFAULT_REFERENCE_SCALE],
  },
})
