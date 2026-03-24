#!/usr/bin/env -S deno run --node-modules-dir=none --no-lock --allow-all
//MISE description="Build the project using Vite"

import { execa } from "npm:execa@9.6.1";
import { Ctx, pnpm, task } from "./common.ts";

export const build = task("Build project", async (ctx) => {
  await pnpm.install(ctx);
  await execa({ verbose: ctx.execaVerbose() })`pnpm exec vite build`;
});

if (import.meta.main) {
  await build(new Ctx());
}
