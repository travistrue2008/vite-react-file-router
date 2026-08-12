import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

const varDecl = ['const', 'let', 'var']

const multilineTypes = [
  'multiline-block-like',
  'multiline-expression',
  'multiline-const',
  'multiline-let',
  'multiline-var',
]

/**
 * Flat config never reads .gitignore, and every routes.jsx in the repo is
 * generated: src/routes.jsx by vite.config.ts, plus one per integration fixture
 * while the dev-server tests run.
 */
const ignores = [
  'coverage/**',
  'dist/**',
  '**/dist/**',
  'node_modules/**',
  '**/routes.jsx',
]

const styleRules = {
  'comma-dangle': [
    'error',
    'always-multiline',
  ],
  'indent': [
    'error',
    2,
    { SwitchCase: 1 },
  ],
  'max-len': [
    'error',
    { code: 80 },
  ],
  'no-trailing-spaces': ['error'],
  'object-curly-newline': [
    'error',
    {
      ExportDeclaration: {
        multiline: true,
        consistent: true,
      },
      ImportDeclaration: {
        multiline: true,
        consistent: true,
      },
      ObjectExpression: {
        multiline: true,
        consistent: true,
        minProperties: 2,
      },
      ObjectPattern: {
        multiline: true,
        consistent: true,
      },
    },
  ],
  'object-property-newline': [
    'error',
    {
      allowAllPropertiesOnSameLine: false,
    },
  ],
  'quotes': [
    'error',
    'single',
    {
      allowTemplateLiterals: true,
      avoidEscape: true,
    },
  ],
  'space-before-function-paren': [
    'error',
    {
      anonymous: 'ignore',
      asyncArrow: 'ignore',
      named: 'always',
    },
  ],
  'semi': ['error', 'never'],
  'padding-line-between-statements': [
    'error',
    {
      blankLine: 'always',
      prev: '*',
      next: varDecl,
    },
    {
      blankLine: 'always',
      prev: varDecl,
      next: '*',
    },
    {
      blankLine: 'any',
      prev: varDecl,
      next: varDecl,
    },
    ...multilineTypes.map(type => ({
      blankLine: 'always',
      prev: type,
      next: '*',
    })),
    ...multilineTypes.map(type => ({
      blankLine: 'always',
      prev: '*',
      next: type,
    })),
  ],
}

export default [
  { ignores },
  {
    // espree, unlike the TS parser, needs to be told about JSX. 404.jsx is the
    // only source file that reaches this block.
    files: ['**/*.{js,mjs,cjs,jsx}'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: styleRules,
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      ...styleRules,
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Listed rule by rule rather than spread from the plugin's `recommended`,
    // which now carries the whole React Compiler rule set. Scoped to components
    // so the plugin's own Node-side sources never pay for it.
    files: ['**/*.{jsx,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
]
