import antfu from '@antfu/eslint-config'

export default antfu({

  rules: {
    'no-console': 'off',
    'no-debugger': 'off',
    'eslint-comments/no-unlimited-disable': 'off',
    'ts/ban-ts-comment': 'off',
  },
})
