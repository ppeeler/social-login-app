import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import globals from 'globals';
import typescript from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

const compat = new FlatCompat();

export default [
  js.configs.recommended,
  ...compat.config({
    extends: [
      'plugin:@typescript-eslint/recommended',
      'plugin:react/recommended',
      'plugin:react/jsx-runtime',
      'plugin:react-hooks/recommended'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      ecmaFeatures: {
        jsx: true
      }
    },
    plugins: [
      '@typescript-eslint',
      'react',
      'react-hooks',
      'react-refresh'
    ],
    settings: {
      react: {
        version: 'detect'
      }
    }
  }),
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Add any custom rules here
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021
      }
    }
  }
];
