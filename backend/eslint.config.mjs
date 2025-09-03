// eslint.config.mjs
import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // 1. Ignore generated/build stuff
  {
    ignores: [
      ".aws-sam/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**"
    ],
  },

  // 2. Base JS recommended rules
  js.configs.recommended,

  // 3. Your backend Node rules
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,         // ✅ allows process, __dirname
        ...globals.es2021,
        console: "readonly",     // ✅ allows console.log
        TextDecoder: "readonly", // ✅ allows TextDecoder (Node 18+)
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": "warn",
      "eqeqeq": ["error", "always"],
      "semi": ["error", "always"],
      "quotes": ["error", "double"]
    }
  }
]);
