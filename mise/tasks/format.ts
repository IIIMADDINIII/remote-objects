#!/usr/bin/env -S deno run --node-modules-dir=none --no-lock --allow-all
//MISE description="Format all files in the project"

import { Ctx, pnpm, task, vp } from "./common.ts";

export const build = task("Build project", async (ctx) => {
  await pnpm.install(ctx);
  await vp.fmt(ctx, { check: false });
});

if (import.meta.main) {
  Ctx.run(build);
}
