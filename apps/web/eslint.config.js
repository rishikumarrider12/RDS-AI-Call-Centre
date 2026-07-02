import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const tsConfigPath = require.resolve('typescript-eslint/tsconfig.json')

const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tsConfigPath],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
]
