import { tasks, tools } from "@iiimaddiniii/js-build-tool";

export const clean = tools.exitAfter(
  tasks.cleanWithGit());

export const build = tools.exitAfter(
  tasks.selectPnpmAndInstall(),
  tasks.rollup.build());

export const buildCi = tools.exitAfter(
  tasks.cleanWithGit(),
  tasks.prodSelectPnpmAndInstall(),
  tasks.rollup.buildAndRunTests());

export const test = tools.exitAfter(
  tasks.selectPnpmAndInstall(),
  tasks.rollup.buildAndRunTests());
