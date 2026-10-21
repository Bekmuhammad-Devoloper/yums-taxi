// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // O'zbek tilida apostrof (o', g') har qadamda uchraydi — RN <Text> ichida xavfsiz
    rules: { 'react/no-unescaped-entities': 'off' },
  },
]);
