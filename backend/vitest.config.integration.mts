import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config.mjs";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ["**/*.integration.test.{js,ts}"],
      fileParallelism: false,
      coverage: {
        enabled: false,
      },
    },
  }),
);
