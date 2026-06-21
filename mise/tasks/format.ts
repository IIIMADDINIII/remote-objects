#!/usr/bin/env -S deno run --allow-all
//MISE description="Format all files in the project"

import { Ctx, pnpm, task, vp } from "@iiimaddiniii/task-utils";

export const build = task("Build project", async (ctx) => {
  await pnpm.install(ctx);
  await vp.fmt(ctx, { check: false });
});

if (import.meta.main) {
  Ctx.run(build);
}
