// ESLint flat config (ESLint v9+/v10). Replaces the legacy .eslintrc + `--ext` setup.
// Lints the TypeScript sources under src/ and tests/ with the typescript-eslint
// recommended ruleset. Run with: npm run lint
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    // Build artifacts and reports are never linted.
    ignores: [
      'node_modules/**',
      'dist/**',
      'playwright-report/**',
      'allure-report/**',
      'allure-results/**',
      'blob-report/**',
      'test-results/**',
      'server/**',
      'mocks/**',
    ],
  },
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // Tests intentionally use non-null assertions and flexible typing for fixtures.
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // The agent layer interops with CJS-only libraries (pdf-parse, mammoth).
      '@typescript-eslint/no-require-imports': 'off',
      // `_`-prefixed names mark deliberately-unused params/vars (e.g. ignored
      // callback args in the orchestrator simulation).
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
];
