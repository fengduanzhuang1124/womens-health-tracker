module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    sourceType: "module",
    ecmaVersion: 2020,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "quotes": ["error", "double"],
    "max-len": 0,
    "linebreak-style": 0,
    "import/no-unresolved": 0,
    "require-jsdoc": 0,
    "no-multiple-empty-lines": ["error", { "max": 2 }],
    "new-cap": 0,
    "no-undef": 0
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
