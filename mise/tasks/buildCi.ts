#!/usr/bin/env -S deno run --node-modules-dir=none --no-lock --allow-all
//MISE description="Build the project using Vite"

import { execa } from "npm:execa@^9.6.1";
import { clean } from "./clean.ts";
import { Ctx, pnpm, task } from "./common.ts";

export const buildCi = task("Build CI", async (ctx) => {
  await clean(ctx);
  await pnpm.install(ctx, { frozenLockfile: true });
  await execa({ verbose: ctx.execaVerbose() })`pnpm exec tsgo`;
});

if (import.meta.main) {
  await buildCi(new Ctx());
}
