import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginVitest from "@vitest/eslint-plugin";

export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**", "src/generated/**"]
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off"
    }
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...pluginVitest.environments.env.globals
      }
    }
  },
  {
    files: ["unit/**", "integration/**"],
    ...pluginVitest.configs.recommended,
  }
);
