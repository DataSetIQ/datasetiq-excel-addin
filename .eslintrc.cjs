module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['dist'],
  env: {
    es6: true,
    browser: true
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off'
  }
};
