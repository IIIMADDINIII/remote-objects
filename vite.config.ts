/// <reference types="vitest/config" />
import accessPrivates from "rolldown-plugin-access-privates";
import { ConfigEnv, type UserConfig } from "vite";

export default async function (env: ConfigEnv): Promise<UserConfig> {
  return {
    plugins: env.mode === "test" ? [accessPrivates()] : [],
    test: {
      ui: true,
      coverage: {
        enabled: true,
        provider: "istanbul",
      },
      include: ["src/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
      execArgv: ["--expose-gc"],
    },
  };
}