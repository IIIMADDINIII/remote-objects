#!/usr/bin/env -S deno run --allow-all
//MISE description="Run tests for the project"

import { Ctx, pnpm, task, vp } from "@iiimaddiniii/task-utils";

export const test = task("Run tests", async (ctx) => {
  await pnpm.install(ctx);
  await vp.test(ctx);
  await vp.check(ctx);
});

if (import.meta.main) {
  Ctx.run(test);
}
