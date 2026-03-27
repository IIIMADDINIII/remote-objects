/// <reference types="vitest/config" />
import { defineConfig } from "vite";

export default defineConfig({
  test: {
    ui: true,
    coverage: {
      enabled: true,
      provider: "istanbul",
    },
    include: ["src/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    execArgv: ["--expose-gc"],
  },
});
