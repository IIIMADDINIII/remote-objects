import { describe, expect, test } from "vitest";

import { ObjectStore, SET, type RemoteAble, type RemoteObject } from "./index.js";

describe("Remote<T>", () => {
  function R<T extends RemoteAble>(api: T): RemoteObject<T> {
    const a: ObjectStore = new ObjectStore({
      request: (data) => b.requestHandler(data),
    });
    const b: ObjectStore = new ObjectStore({
      request: (data) => a.requestHandler(data),
    });
    a.exposeRemoteObject("api", api);
    return b.getRemoteObject<T>("api");
  }

  test("remote able objects", async () => {
    // Working
    R({});
    await R(() => {});
    await R(class T {});
    // Failing
    await expect(async () => await R(10)).rejects.toThrow("Only objects and functions can be exposed as remote objects.");
    await expect(async () => await R("")).rejects.toThrow("Only objects and functions can be exposed as remote objects.");
    await expect(async () => await R(Symbol())).rejects.toThrow("Only objects and functions can be exposed as remote objects.");
    await expect(async () => await R(undefined)).rejects.toThrow("Only objects and functions can be exposed as remote objects.");
    await expect(async () => await R(true)).rejects.toThrow("Only objects and functions can be exposed as remote objects.");
  });
  test("set primitive Values", async () => {
    const r = R(
      new (class Test {
        test: number | (() => void) | (new () => void) = 1;
        a: number = 1;
        b: string = "";
        c: boolean = true;
        d: null = null;
        e: undefined = undefined;
        f: bigint = 10n;
        g: symbol = Symbol();
        h: unknown = 1;
        i: number | string | boolean = 1;
        j: number | undefined | null = 1;
        k: bigint | number = 1n;
        l: undefined | symbol = undefined;
        get m() {
          return 1 as number;
        }
        set m(value: number) {}
        get n() {
          return 1 as number;
        }
        set o(value: number) {}
        readonly p: number = 1;
        q?: number = 1;
      })(),
    );
    // Working
    r.test;
    await r.a[SET](2);
    await r.b[SET]("test");
    await r.c[SET](true);
    await r.d[SET](null);
    await r.e[SET](undefined);
    await r.f[SET](1n);
    await r.g[SET](Symbol());
    await r.h[SET]("test");
    await r.h[SET](2);
    await r.h[SET](undefined);
    await r.h[SET](null);
    await r.i[SET](1);
    await r.i[SET]("test");
    await r.i[SET](true);
    await r.j[SET](1);
    await r.j[SET](undefined);
    await r.j[SET](null);
    await r.k[SET](1n);
    await r.k[SET](1);
    await r.l[SET](undefined);
    await r.l[SET](Symbol());
    await r.m[SET](2);
    await r.o[SET](2);
    await r.q[SET](2);
    await r.q[SET](undefined);
    // Working but types should fail
    await r.a[SET]("test");
    await r.b[SET](true);
    await r.c[SET](null);
    await r.d[SET](1);
    await r.e[SET](1);
    await r.f[SET](null);
    await r.g[SET]("abc");
    await r.i[SET](undefined);
    await r.j[SET]("test");
    await r.k[SET]("test");
    await r.l[SET]("test");
    await r.n[SET](2);
    await r.p[SET](2);
    // Failing and types should fail
    await expect(async () => await r.n[SET](1)).rejects.toThrow("Only primitive values can be set on a RemoteObject. Received object.");
  });
});
