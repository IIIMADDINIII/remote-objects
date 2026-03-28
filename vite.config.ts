/// <reference types="vitest/config" />
import { type Plugin } from "rolldown";
import { withMagicString } from "rolldown-string";
import { Visitor } from "rolldown/utils";
import { ConfigEnv, type UserConfig } from "vite";

export default async function (env: ConfigEnv): Promise<UserConfig> {
  return {
    plugins: env.mode === "test" ? [vitestAccessPrivates()] : [],
    test: {
      ui: true,
      coverage: {
        enabled: true,
        provider: "istanbul",
      },
      include: ["src/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
      execArgv: ["--expose-gc"],
    },
  };
}

/**
 * A Vite plugin to generate accessors for private fields to allow testing them.
 * This plugin will generate getter and setter methods for private fields and methods, allowing you to access them in your tests.
 * For example, if you have a private field `#foo`, the plugin will generate `fooPrivate` getter and setter.
 * Also automatically exports all top-level variables, functions, and classes in the module, allowing you to import them in your tests without needing to use `export` in your source code.
 * @param options - Options for the plugin.
 * @returns 
 */
function vitestAccessPrivates({
  suffix = "Private"
}: {
  /**
   * The suffix to use for the generated accessors. Defaults to "Private". For example, if you have a private field `#foo`, the plugin will generate `fooPrivate` getter and setter.
   * @default "Private"
   */
  suffix?: string | ((name: string) => string) | undefined;
} = {}): Plugin {
  function rename(name: string) {
    if (typeof suffix === "function") {
      return suffix(name);
    }
    return name + suffix;
  }
  return {
    name: "rolldown-plugin-access-privates",
    transform: {
      filter: { id: /\.[jt]sx?$/ },
      handler: withMagicString(function (code, id, meta) {
        const lang = id.endsWith('.tsx') ? 'tsx'
          : id.endsWith('.ts') ? 'ts'
            : id.endsWith('.jsx') ? 'jsx'
              : 'js';
        const ast = meta.ast ?? this.parse(code.original, { lang });
        new Visitor({
          Program(node) {
            for (const child of node.body) {
              if (child.type !== "VariableDeclaration" && child.type !== "FunctionDeclaration" && child.type !== "ClassDeclaration" || child.declare) continue;
              code.appendLeft(child.start, "export ");
            }
          },
          PropertyDefinition(node) {
            if (node.type !== "PropertyDefinition" || node.key.type !== "PrivateIdentifier" || node.declare || node.override) return;
            const name = rename(node.key.name);
            code.appendRight(node.end, `\n${node.static ? "static " : ""}get ["${name}"]() {return this.#${node.key.name};}`);
            code.appendRight(node.end, `\n${node.static ? "static " : ""}set ["${name}"](value) {this.#${node.key.name} = value;}`);
          },
          MethodDefinition(node) {
            if (node.type !== "MethodDefinition" || node.key.type !== "PrivateIdentifier" || node.override) return;
            const name = rename(node.key.name);
            switch (node.kind) {
              case "method":
                code.appendRight(node.end, `\n${node.static ? "static " : ""}get ["${name}"]() {return this.#${node.key.name};}`);
                code.appendRight(node.end, `\n${node.static ? "static " : ""}set ["${name}"](value) {this.#${node.key.name} = value;}`);
                break;
              case "get":
                code.appendRight(node.end, `\n${node.static ? "static " : ""}get ["${name}"]() {return this.#${node.key.name};}`);
                break;
              case "set":
                code.appendRight(node.end, `\n${node.static ? "static " : ""}set ["${name}"](value) {this.#${node.key.name} = value;}`);
                break;
            }
          }
        }).visit(ast);
      }),
    },
  };
}
