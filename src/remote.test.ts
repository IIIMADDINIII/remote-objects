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
    await R({});
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
        set m(_value: number) {}
        get n() {
          return 1 as number;
        }
        set o(_value: number) {}
        readonly p: number = 1;
        q?: number = 1;
      })(),
    );
    // Working
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
    // @ts-expect-error
    await r.a[SET]("test");
    // @ts-expect-error
    await r.b[SET](true);
    // @ts-expect-error
    await r.c[SET](null);
    // @ts-expect-error
    await r.d[SET](1);
    // @ts-expect-error
    await r.e[SET](1);
    // @ts-expect-error
    await r.f[SET](null);
    // @ts-expect-error
    await r.g[SET]("abc");
    // @ts-expect-error
    await r.i[SET](undefined);
    // @ts-expect-error
    await r.j[SET]("test");
    // @ts-expect-error
    await r.k[SET]("test");
    // @ts-expect-error
    await r.l[SET]("test");
    // @ts-expect-error
    await r.p[SET](2);
    // Failing and types should fail
    // @ts-expect-error
    await expect(async () => await r.n[SET](1)).rejects.toThrow("Cannot set property n of #<Test> which has only a getter");
  });
  test("get primitive Values", async () => {
    const r = R(
      new (class Test {
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
        get m(): number {
          return 1;
        }
        set m(_value: number) {}
        get n(): number {
          return 1;
        }
        set o(_value: number) {}
        readonly p: number = 1;
        q?: number = 1;
      })(),
    );
    // Working
    await expect((async () => (await r.a) satisfies number)()).resolves.toBe(1);
    await expect((async () => (await r.b) satisfies string)()).resolves.toBe("");
    await expect((async () => (await r.c) satisfies boolean)()).resolves.toBe(true);
    await expect((async () => (await r.d) satisfies null)()).resolves.toBe(null);
    await expect((async () => (await r.e) satisfies undefined)()).resolves.toBe(undefined);
    await expect((async () => (await r.f) satisfies bigint)()).resolves.toBe(10n);
    await expect((async () => (await r.g) satisfies symbol)()).resolves.toBeTypeOf("symbol");
    await expect((async () => (await r.g) satisfies symbol)()).resolves.toBe(await r.g);
    await expect((async () => (await r.h) satisfies unknown)()).resolves.toBe(1);
    await expect((async () => (await r.i) satisfies number | string | boolean)()).resolves.toBe(1);
    await expect((async () => (await r.j) satisfies number | undefined | null)()).resolves.toBe(1);
    await expect((async () => (await r.k) satisfies bigint | number)()).resolves.toBe(1n);
    await expect((async () => (await r.l) satisfies undefined | symbol)()).resolves.toBe(undefined);
    await expect((async () => (await r.m) satisfies number)()).resolves.toBe(1);
    await expect((async () => (await r.n) satisfies number)()).resolves.toBe(1);
    await expect((async () => (await r.p) satisfies number)()).resolves.toBe(1);
    await expect((async () => (await r.q) satisfies number | undefined)()).resolves.toBe(1);
    // reading a value with no getter defined yields undefined
    // type is number because typescript does not recognize a setter without a getter
    await expect((async () => (await r.o) satisfies number)()).resolves.toBe(undefined);
  });
  test("calling functions with primitive values", async () => {
    const i = new (class Test {
      av: number = 0;
      a(value: number): number {
        this.av = value;
        return value;
      }
      bv: string = "abc";
      b(value: string): string {
        this.bv = value;
        return value;
      }
      cv: boolean = true;
      c(value: boolean): boolean {
        this.cv = value;
        return value;
      }
      dv: null | undefined = undefined;
      d(value: null): null {
        this.dv = value;
        return value;
      }
      ev: undefined | null = null;
      e(value: undefined): undefined {
        this.ev = value;
        return value;
      }
      fv: bigint = 0n;
      f(value: bigint): bigint {
        this.fv = value;
        return value;
      }
      gv: symbol = Symbol();
      g(value: symbol): symbol {
        this.gv = value;
        return value;
      }
    })();
    const r = R(i);
    const testSymbol = Symbol();
    // Working
    await expect((async () => (await r.a(1)) satisfies number)()).resolves.toBe(1);
    expect(i.av).toBe(1);
    await expect((async () => (await r.b("")) satisfies string)()).resolves.toBe("");
    expect(i.bv).toBe("");
    await expect((async () => (await r.c(false)) satisfies boolean)()).resolves.toBe(false);
    expect(i.cv).toBe(false);
    await expect((async () => (await r.d(null)) satisfies null)()).resolves.toBe(null);
    expect(i.dv).toBe(null);
    await expect((async () => (await r.e(undefined)) satisfies undefined)()).resolves.toBe(undefined);
    expect(i.ev).toBe(undefined);
    await expect((async () => (await r.f(10n)) satisfies bigint)()).resolves.toBe(10n);
    expect(i.fv).toBe(10n);
    await expect((async () => (await r.g(testSymbol)) satisfies symbol)()).resolves.toBe(testSymbol);
    const remoteSymbol = i.gv;
    expect(remoteSymbol).toBeTypeOf("symbol");
    expect(remoteSymbol).not.toBe(testSymbol);
    await expect((async () => (await r.g(testSymbol)) satisfies symbol)()).resolves.toBe(testSymbol);
    expect(i.gv).toBe(remoteSymbol);
  });
});
