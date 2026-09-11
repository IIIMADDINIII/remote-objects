import accessPrivates from "rolldown-plugin-access-privates";
import { defineConfig } from "vite-plus";

export default defineConfig(({ mode }) => ({
  plugins: mode === "test" ? [accessPrivates()] : [],
  pack: {
    entry: ["./src/index.ts", "./src/RequestHandler.ts", "./src/ObjectStore.ts"],
    dts: true,
    exports: true,
    format: ["esm", "cjs"],
  },
  test: {
    coverage: {
      enabled: true,
    },
    execArgv: ["--expose-gc"],
    typecheck: {
      enabled: true,
    },
  },
  lint: {
    ignorePatterns: ["/mise/"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    ignorePatterns: ["/mise/"],
    sortImports: true,
    printWidth: 300,
    jsdoc: {
      descriptionWithDot: true,
      lineWrappingStyle: "balance",
    },
  },
}));
