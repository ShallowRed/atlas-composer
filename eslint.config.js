import antfu from '@antfu/eslint-config'

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
})
