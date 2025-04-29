import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tseslintParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';

export default [
  eslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    ignores: ['**/dist/**', '**/*.config.js', '**/.eslintrc.js'],
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'prettier': prettier,
      'import': importPlugin,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      'import/prefer-default-export': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'import/extensions': [
        'error',
        'ignorePackages',
        {
          js: 'never',
          ts: 'never',
        },
      ],
      'prettier/prettier': 'error',
      // Node.js specific rules
      'no-console': 'off',
      'no-process-exit': 'off',
      'no-underscore-dangle': 'off',
      // TypeScript specific rules
      '@typescript-eslint/no-var-requires': 'off',
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.ts'],
        },
      },
    },
  },
]; 