import accessPrivates from "rolldown-plugin-access-privates";
import { defineConfig } from "vite-plus";

export default defineConfig((env) => {
  return {
    plugins: env.mode === "test" ? [accessPrivates()] : [],
    pack: {
      entry: ["./src/index.ts", "./src/RequestHandler.ts", "./src/ObjectStore.ts"],
      dts: true,
      exports: true,
      platform: "neutral",
      format: ["esm", "cjs"],
      failOnWarn: true,
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
      jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
      rules: { "vite-plus/prefer-vite-plus-imports": "error" },
      ignorePatterns: ["/**/mise/", "/**/declarations.d.ts"],
      options: {
        typeAware: true,
        typeCheck: true,
        denyWarnings: true,
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
  };
});
