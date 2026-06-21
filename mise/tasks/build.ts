#!/usr/bin/env -S deno run --allow-all
//MISE description="Build the project using Vite"

import { Ctx, pnpm, task, vp } from "@iiimaddiniii/task-utils";

export const build = task("Build project", async (ctx) => {
  await pnpm.install(ctx);
  await vp.fmt(ctx, { check: false });
  await vp.pack(ctx);
});

if (import.meta.main) {
  Ctx.run(build);
}
