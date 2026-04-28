#!/usr/bin/env -S deno run --node-modules-dir=none --no-lock --allow-all
//MISE description="Build the project using Vite"

import { clean } from "./clean.ts";
import { Ctx, pnpm, task, vp } from "./common.ts";

export const buildCi = task("Build CI", async (ctx) => {
  await clean(ctx);
  await pnpm.install(ctx, { frozenLockfile: true });
  await vp.fmt(ctx);
  await vp.lint(ctx);
  await vp.test(ctx);
  await vp.pack(ctx);
});

if (import.meta.main) {
  Ctx.run(buildCi);
}
