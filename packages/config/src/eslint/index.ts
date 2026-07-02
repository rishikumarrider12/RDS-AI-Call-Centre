export const eslintConfig = {
  files: ['**/*.{ts,tsx}'],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    globals: {
      console: 'readonly',
      process: 'readonly',
      setTimeout: 'readonly',
      clearTimeout: 'readonly',
      setInterval: 'readonly',
      clearInterval: 'readonly',
      fetch: 'readonly',
      URL: 'readonly',
      URLSearchParams: 'readonly',
    },
    parser: require('@typescript-eslint/parser').parse,
    parserOptions: {
      ecmaFeatures: { jsx: true },
      project: './tsconfig.json',
    },
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
}

export default eslintConfig
