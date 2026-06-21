#!/usr/bin/env -S deno run --allow-all
//MISE description="Clean the project directory"

import { cleanup, Ctx } from "@iiimaddiniii/task-utils";

export const clean = cleanup.gitIgnored;

if (import.meta.main) {
  Ctx.run(clean);
}
