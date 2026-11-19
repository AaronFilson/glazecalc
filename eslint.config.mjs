// ESLint flat config. Rules here catch likely bugs; formatting is left to
// Prettier (.prettierrc.json), so no stylistic rules are turned on.
import js from '@eslint/js';
import angular from 'angular-eslint';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Glazecalc reaches the core and the catalog only through their indexes and the catalog's data folder, never a
// file inside them: the indexes are the libraries' public surfaces. Each library has one (lib/core/index.ts,
// lib/catalog/index.ts), each area one (lib/core/recipe/index.ts), and finer ones (lib/catalog/host/index.ts,
// lib/core/recipe/basics/index.ts) let a bundle take only what it needs, since a CommonJS require of an index
// takes the whole of it. Inside the libraries, and in their own tests, any file is fair.
const PAST_INDEX = '(?!(?:[a-z-]+\\x2F)*index\\.ts$|data\\x2F)';
const libraryFile = (prefix) => `${prefix}(?:core|catalog)\\x2F${PAST_INDEX}`;
const boundary = (sources) => {
  const pattern = sources.map(libraryFile).join('|');
  const message = 'Import the core or the catalog through an index (lib/core/index.ts, lib/catalog/host/index.ts, …).';
  return {
    'no-restricted-imports': ['error', { patterns: [{ regex: pattern.replaceAll('\\x2F', '/'), message }] }],
    'no-restricted-syntax': [
      'error',
      { selector: `CallExpression[callee.name='require'] > Literal[value=/${pattern}/]`, message },
      { selector: `ImportExpression > Literal[value=/${pattern}/]`, message }
    ]
  };
};

export default tseslint.config(
  {
    ignores: [
      'dist/',
      'coverage/',
      'playwright-report/',
      'test-results/',
      'test-results-linux/',
      '.angular/',
      'db/',
      '.claude/',
      'scratch/',
      // CDK's synthesized templates and the forwarder's copy (deploy/cdk).
      'deploy/cdk/cdk.out/'
    ]
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
  // The mail forwarder's tests (npm run test:forwarder).
  {
    files: ['deploy/aws/mail-forwarder/test/**/*.mjs'],
    languageOptions: { globals: { ...globals.mocha } }
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
  // The AWS setup as CDK stacks: TypeScript run by Node as it is, as the
  // server is (deploy/cdk/tsconfig.json); its tests use node:test.
  {
    files: ['deploy/cdk/**/*.ts'],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.node }
    }
  },
  {
    // The shared chemistry module also runs in the browser bundle.
    files: ['lib/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } }
  },
  // The nameless core (lib/core, docs/adr/0030) and the catalog (lib/catalog, docs/adr/0031): ES modules in
  // TypeScript, with their own tests as ES module JavaScript (node:test). They run in Node and the browser,
  // so they have neither's globals.
  {
    files: ['lib/core/**/*.ts', 'lib/catalog/**/*.ts'],
    extends: [...tseslint.configs.recommended],
    languageOptions: { sourceType: 'module' }
  },
  {
    files: ['lib/core/test/**/*.js', 'lib/catalog/test/**/*.js'],
    languageOptions: { sourceType: 'module' }
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
  },

  // The libraries' public surfaces: from anywhere by a path through lib/, and from Glazecalc's own lib/ folders
  // by ../core/ or ../catalog/ as well.
  {
    files: ['**/*.js', '**/*.mjs', 'server/**/*.ts', 'client/**/*.ts', 'deploy/cdk/**/*.ts'],
    ignores: ['lib/core/**', 'lib/catalog/**'],
    rules: boundary(['(?:^|\\x2F)lib\\x2F'])
  },
  {
    files: ['lib/**/*.js', 'lib/**/*.mjs', 'data/**/*.js'],
    ignores: ['lib/core/**', 'lib/catalog/**'],
    rules: boundary(['(?:^|\\x2F)lib\\x2F', '^\\.\\.\\x2F'])
  }
);
