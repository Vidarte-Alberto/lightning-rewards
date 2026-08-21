import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config.mjs";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ["**/*.unit.test.{js,ts}"],
      coverage: {
        enabled: true,
        provider: "v8",
        reportsDirectory: "coverage/unit",
        include: [
          "**/db/**/*.ts",
          "**/libs/**/*.ts",
          "**/middlewares/**/*.ts",
          "**/routes/**/*.ts",
          "**/services/**/*.ts",
          "**/utils/**/*.ts",
        ],
        exclude: ["node_modules/**"],
      },
    },
  }),
);
