#!/usr/bin/env -S deno run --node-modules-dir=none --no-lock --allow-all
//MISE description="Run tests for the project"

import { Ctx, pnpm, task, vp } from "./common.ts";

export const test = task("Run tests", async (ctx) => {
  await pnpm.install(ctx);
  await vp.test(ctx);
  await vp.check(ctx);
});

if (import.meta.main) {
  Ctx.run(test);
}
