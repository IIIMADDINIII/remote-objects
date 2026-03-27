#!/usr/bin/env -S deno run --node-modules-dir=none --no-lock --allow-all
//MISE description="Run tests for the project"

import { execa } from "npm:execa@9.6.1";
import { Ctx, pnpm, task } from "./common.ts";

export const test = task("Run tests", async (ctx) => {
  await pnpm.install(ctx);
  await execa({
    verbose: ctx.execaVerbose(),
  })`pnpm exec vitest run --coverage --no-ui`;
});

if (import.meta.main) {
  await test(new Ctx());
}
