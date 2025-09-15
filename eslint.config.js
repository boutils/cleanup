import jsLint from '@eslint/js';
import prettier from 'eslint-plugin-prettier/recommended';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import ts from 'typescript-eslint';

/**
 * ESLint configuration
 * @type {import('eslint').Linter.Config[]}
 */
export default [
  // Rules sets
  jsLint.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs['flat/essential'],
  prettier,

  // Custom definitions
  {
    files: ['**/*.{js,mjs,cjs,ts,vue}'],
    languageOptions: {
      parserOptions: { parser: ts.parser },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-var': 'error',
      'no-restricted-globals': 'error',
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Ignored files and directories
  {
    ignores: ['**/.*/', '**/dist/'],
  },
];
