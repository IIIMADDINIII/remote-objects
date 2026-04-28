#!/usr/bin/env -S deno run --node-modules-dir=none --no-lock --allow-all
//MISE description="Build the project using Vite"

import { Ctx, pnpm, task, vp } from "./common.ts";

export const build = task("Build project", async (ctx) => {
  await pnpm.install(ctx);
  await vp.fmt(ctx, { check: false });
  await vp.lint(ctx);
  await vp.pack(ctx);
});

if (import.meta.main) {
  Ctx.run(build);
}
