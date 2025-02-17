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

export async function version() {
  let arg = process.argv.at(-1);
  if (arg === undefined || !arg.startsWith("--")) arg = "--patch";
  arg = arg.slice(2);
  await tools.exec`pnpm version -f --no-git-tag-version ${arg}`;
  const version = await tools.getPackageVersion(undefined, false);
  await tools.createCommit({ message: `v${version}` });
}

export async function publish() {
  await tools.cleanWithGit();
  await tools.prodInstallDependencies();
  await tools.rollup.buildAndRunTests(buildOptions);
  await tools.ensureGitIsClean();
  await version();
  await tools.exec`pnpm -r publish`;
  await tools.exec`git push`;
}