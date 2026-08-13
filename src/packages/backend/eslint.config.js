import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import globals from 'globals';

export default [
  js.configs.recommended,
  stylistic.configs.customize({
    indent: 2,
    quotes: 'single',
    semi: true,
    commaDangle: 'always-multiline',
    arrowParens: true,
    braceStyle: '1tbs',
  }),
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.builtin,
      },
    },
    rules: {
      // Break only longer chains (3+ calls); short ones like expect().toBe() stay inline.
      '@stylistic/newline-per-chained-call': ['error', { ignoreChainWithDepth: 2 }],
      // Multi-property objects and destructuring patterns: one property per line.
      '@stylistic/object-property-newline': ['error', { allowAllPropertiesOnSameLine: false }],
      '@stylistic/object-curly-newline': ['error', {
        ObjectExpression: { multiline: true, minProperties: 2, consistent: true },
        ObjectPattern: { multiline: true, minProperties: 2, consistent: true },
      }],
      // Prefer arrow functions.
      'func-style': ['error', 'expression', { allowArrowFunctions: true }],
      'prefer-arrow-callback': 'error',
      // Breakpoint-friendly bodies: arrow body on its own line, return objects
      // with an explicit block+return (not `=> ({...})`), and no shorthands.
      '@stylistic/implicit-arrow-linebreak': ['error', 'below'],
      'arrow-body-style': ['error', 'as-needed', { requireReturnForObjectLiteral: true }],
      'object-shorthand': ['error', 'never'],
      // Ternary always on three lines: condition / ? then / : else.
      '@stylistic/multiline-ternary': ['error', 'always'],
      // Array elements one per line, unless the array is small (< 3 items).
      '@stylistic/array-element-newline': ['error', { multiline: true, minItems: 3 }],
      '@stylistic/array-bracket-newline': ['error', { multiline: true, minItems: 3 }],
      // Interface stubs and overrides keep intentionally unused params.
      'no-unused-vars': ['error', { args: 'none' }],
    },
  },
];
