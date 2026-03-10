import type { UserConfig } from '@commitlint/types'

const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat',
      'fix',
      'docs',
      'style',
      'refactor',
      'perf',
      'test',
      'chore',
      'ci',
      'build',
      'revert',
    ]],
    'scope-enum': [1, 'always', [
      'web',
      'api',
      'docker',
      'docs',
      'deps',
    ]],
    'subject-empty': [2, 'never'],
    'type-empty': [2, 'never'],
  },
}

export default config
