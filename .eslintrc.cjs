/**
 * 👋 Hi!  Happy linting! 💖
 */
 module.exports = {
  "env": {
    "browser": true,
    "es6": true,
    "node": true
  },
  "extends": [
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "tsconfig.json",
    "sourceType": "module"
  },
  "plugins": [
    "eslint-plugin-jsdoc",
    "eslint-plugin-prefer-arrow",
    "@typescript-eslint"
  ],
  "rules": {
    "require-await": "off",
    "@typescript-eslint/require-await": "warn",
    "restrict-template-expressions": "off",
    "@typescript-eslint/restrict-template-expressions": [
      "warn",
      {
        "allowNumber": true,
        "allowBoolean": true,
        "allowNullish": true
      }
    ]
  }
};