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
      '@stylistic/object-curly-newline': [
        'error',
        {
          ObjectExpression: {
            multiline: true,
            minProperties: 2,
            consistent: true,
          },
          ObjectPattern: {
            multiline: true,
            minProperties: 2,
            consistent: true,
          },
        },
      ],
      // Prefer arrow functions.
      'func-style': [
        'error',
        'expression',
        { allowArrowFunctions: true },
      ],
      'prefer-arrow-callback': 'error',
      // Breakpoint-friendly bodies: arrow body on its own line, return objects
      // with an explicit block+return (not `=> ({...})`), and no shorthands.
      '@stylistic/implicit-arrow-linebreak': ['error', 'below'],
      'arrow-body-style': [
        'error',
        'as-needed',
        { requireReturnForObjectLiteral: true },
      ],
      'object-shorthand': ['error', 'never'],
      // Ternary always on three lines: condition / ? then / : else.
      '@stylistic/multiline-ternary': ['error', 'always'],
      // Array elements: all inline or all one-per-line (never a mix). 3+ items
      // break by default; a shorter array may break too when a line runs long
      // (see max-len below) - 'consistent' allows that without forcing it.
      '@stylistic/array-element-newline': [
        'error',
        {
          multiline: true,
          minItems: 3,
        },
      ],
      '@stylistic/array-bracket-newline': [
        'error',
        {
          multiline: true,
          minItems: 3,
        },
      ],
      // Keep lines readable. A long array line breaks one-element-per-line by
      // hand (max-len is not auto-fixable). Strings/URLs/comments are exempt.
      '@stylistic/max-len': [
        'error',
        {
          code: 80,
          ignoreComments: true,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
        },
      ],
      // Interface stubs and overrides keep intentionally unused params.
      'no-unused-vars': ['error', { args: 'none' }],
    },
  },
];
