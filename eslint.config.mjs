// ESLint flat config. Rules here catch likely bugs; formatting is left to
// Prettier (.prettierrc.json), so no stylistic rules are turned on.
import js from '@eslint/js';
import angular from 'angular-eslint';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/', 'coverage/', 'playwright-report/', 'test-results/', '.angular/', 'db/']
  },

  // Node: API server, chemistry library, build scripts and browser tests.
  {
    files: ['**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node }
    },
    rules: {
      // Express error handlers need all four parameters even when unused.
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      'no-var': 'error',
      'prefer-const': 'error'
    }
  },
  {
    files: ['**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.node }
    }
  },
  // The API server: TypeScript run by Node as it is (server/tsconfig.json).
  {
    files: ['server/**/*.ts'],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.node }
    },
    rules: {
      // Express error handlers need all four parameters even when unused.
      '@typescript-eslint/no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }]
    }
  },
  {
    files: ['server/test/**/*.ts'],
    languageOptions: { globals: { ...globals.mocha } }
  },
  {
    // The shared chemistry module also runs in the browser bundle.
    files: ['lib/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } }
  },

  // Angular client: TypeScript and component templates.
  {
    files: ['client/**/*.ts'],
    extends: [...tseslint.configs.recommended, ...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'gc', style: 'kebab-case' }],
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'gc', style: 'camelCase' }]
    }
  },
  {
    // Specs reach protected members through a loose type on purpose.
    files: ['client/**/*.spec.ts', 'client/app/testing/**/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' }
  },
  {
    files: ['client/**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility]
  }
);
