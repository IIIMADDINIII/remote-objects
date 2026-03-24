#!/usr/bin/env -S deno run --node-modules-dir=none --no-lock --allow-all
//MISE description="Clean the project directory"

import { cleanup, Ctx } from "./common.ts";

export const clean = cleanup.gitIgnored;

if (import.meta.main) {
  await clean(new Ctx());
}
