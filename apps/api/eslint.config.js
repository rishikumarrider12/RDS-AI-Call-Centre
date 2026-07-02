{
  "files": ["**/*.{ts,tsx}"],
  "languageOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "globals": {
      "console": "readonly",
      "process": "readonly",
      "setTimeout": "readonly",
      "clearTimeout": "readonly",
      "setInterval": "readonly",
      "clearInterval": "readonly"
    }
  },
  "rules": {
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }]
  }
}
