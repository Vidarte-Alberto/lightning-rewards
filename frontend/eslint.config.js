import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";
import pluginVitest from "@vitest/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs,jsx}"], plugins: { js }, extends: ["js/recommended"] },
  { files: ["**/*.{js,mjs,cjs,jsx}"], languageOptions: { globals: { ...globals.browser, ...pluginVitest.environments.env.globals } } },
  pluginReact.configs.flat.recommended,
  {
    files: ["__tests__/**"],
    ...pluginVitest.configs.recommended,
  },
  {
		rules: {
			"react/react-in-jsx-scope": 0,
      "react/jsx-uses-react": 0,
      "react/prop-types": 0
		},
	},
  {
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  globalIgnores(["**/coverage/**", "**/dist/**"]),
]);
