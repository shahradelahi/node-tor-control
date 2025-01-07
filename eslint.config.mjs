import { defineConfig } from '@shahrad/eslint-config';

export default defineConfig(
  {
    ignores: ['dist/**']
  },

  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      'no-console': 'error',
      '@typescript-eslint/semi': 'off',
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },

  {
    files: ['examples/**/*.ts'],
    rules: {
      'no-console': 'off'
    }
  }
);
