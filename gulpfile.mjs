import { tasks, tools } from "@iiimaddiniii/js-build-tool";

/**
 * @type import("@iiimaddiniii/js-build-tool").ConfigOpts
 */
const buildOptions = {
  bundleDeclarationPackages: ["typed-emitter"],
};

export const clean = tools.exitAfter(
  tasks.cleanWithGit());

export const build = tools.exitAfter(
  tasks.installDependencies(),
  tasks.rollup.build(buildOptions));

export const buildCi = tools.exitAfter(
  tasks.cleanWithGit(),
  tasks.prodInstallDependencies(),
  tasks.rollup.buildAndRunTests(buildOptions));

export const test = tools.exitAfter(
  tasks.installDependencies(),
  tasks.rollup.buildAndRunTests(buildOptions));
