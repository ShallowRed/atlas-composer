import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: [
    'src/public/data',
  ],

  rules: {
    'no-console': 'off',
    'no-debugger': 'off',
    'eslint-comments/no-unlimited-disable': 'off',
    'ts/ban-ts-comment': 'off',
  },
})
