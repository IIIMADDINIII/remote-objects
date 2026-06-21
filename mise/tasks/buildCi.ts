#!/usr/bin/env -S deno run --allow-all
//MISE description="Build the project using Vite"

import { Ctx, pnpm, task, vp } from "@iiimaddiniii/task-utils";
import { clean } from "./clean.ts";

export const buildCi = task("Build CI", async (ctx) => {
  await clean(ctx);
  await pnpm.install(ctx, { frozenLockfile: true });
  await vp.check(ctx);
  await vp.pack(ctx);
});

if (import.meta.main) {
  Ctx.run(buildCi);
}
