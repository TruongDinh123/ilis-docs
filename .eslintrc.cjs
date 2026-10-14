module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
  plugins: ["import"],
  settings: { react: { version: "detect" } },
  ignorePatterns: ["dist", "node_modules"],
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    // Quy tắc ranh giới kiến trúc — tham chiếu bulletproof-react (alan2207/bulletproof-react,
    // docs/project-structure.md): ngăn import chéo giữa các feature và ngăn shared/app đảo chiều.
    "import/no-restricted-paths": [
      "error",
      {
        zones: [
          {
            target: "./src/features/documents",
            from: "./src/features",
            except: ["./documents"],
          },
          {
            target: "./src/features/portal",
            from: "./src/features",
            except: ["./portal"],
          },
          {
            target: "./src/features",
            from: "./src/app",
          },
          {
            target: ["./src/components", "./src/hooks", "./src/lib", "./src/config"],
            from: ["./src/features", "./src/app"],
          },
        ],
      },
    ],
    "import/no-cycle": "error",
  },
};
