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
  test("set primitive Values", async () => {
    const i = new (class Test {
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
      #m: number = 1;
      get m() {
        return this.#m;
      }
      set m(value: number) {
        this.#m = value;
      }
      get n() {
        return 1 as number;
      }
      ov: number = 1;
      set o(value: number) {
        this.ov = value;
      }
      readonly p: number = 1;
      q?: number = 1;
    })();
    const r = R(i);
    // Working
    await r.a[SET](2);
    expect(i.a).toBe(2);
    await r.b[SET]("test");
    expect(i.b).toBe("test");
    await r.c[SET](true);
    expect(i.c).toBe(true);
    await r.d[SET](null);
    expect(i.d).toBe(null);
    await r.e[SET](undefined);
    expect(i.e).toBe(undefined);
    await r.f[SET](1n);
    expect(i.f).toBe(1n);
    await r.g[SET](Symbol());
    expect(i.g).toBeTypeOf("symbol");
    await r.h[SET]("test");
    expect(i.h).toBe("test");
    await r.h[SET](2);
    expect(i.h).toBe(2);
    await r.h[SET](undefined);
    expect(i.h).toBe(undefined);
    await r.h[SET](null);
    expect(i.h).toBe(null);
    await r.i[SET](1);
    expect(i.i).toBe(1);
    await r.i[SET]("test");
    expect(i.i).toBe("test");
    await r.i[SET](true);
    expect(i.i).toBe(true);
    await r.j[SET](1);
    expect(i.j).toBe(1);
    await r.j[SET](undefined);
    expect(i.j).toBe(undefined);
    await r.j[SET](null);
    expect(i.j).toBe(null);
    await r.k[SET](1n);
    expect(i.k).toBe(1n);
    await r.k[SET](1);
    expect(i.k).toBe(1);
    await r.l[SET](undefined);
    expect(i.l).toBe(undefined);
    await r.l[SET](Symbol());
    expect(i.l).toBeTypeOf("symbol");
    await r.m[SET](2);
    expect(i.m).toBe(2);
    await r.o[SET](2);
    expect(i.ov).toBe(2);
    await r.q[SET](2);
    expect(i.q).toBe(2);
    await r.q[SET](undefined);
    expect(i.q).toBe(undefined);
    // Working but types should fail
    // @ts-expect-error
    await r.a[SET]("test");
    expect(i.a).toBe("test");
    // @ts-expect-error
    await r.b[SET](true);
    expect(i.b).toBe(true);
    // @ts-expect-error
    await r.c[SET](null);
    expect(i.c).toBe(null);
    // @ts-expect-error
    await r.d[SET](1);
    expect(i.d).toBe(1);
    // @ts-expect-error
    await r.e[SET](1);
    expect(i.e).toBe(1);
    // @ts-expect-error
    await r.f[SET](null);
    expect(i.f).toBe(null);
    // @ts-expect-error
    await r.g[SET]("abc");
    expect(i.g).toBe("abc");
    // @ts-expect-error
    await r.i[SET](undefined);
    expect(i.i).toBe(undefined);
    // @ts-expect-error
    await r.j[SET]("test");
    expect(i.j).toBe("test");
    // @ts-expect-error
    await r.k[SET]("test");
    expect(i.k).toBe("test");
    // @ts-expect-error
    await r.l[SET]("test");
    expect(i.l).toBe("test");
    // @ts-expect-error
    await r.p[SET](2);
    expect(i.p).toBe(2);
    // Failing and types should fail
    // @ts-expect-error
    await expect(async () => await r.n[SET](1)).rejects.toThrow("Cannot set property n of #<Test> which has only a getter");
  });
  test("set functions", async () => {
    const i = new (class Test {
      a: () => Promise<void> = async () => {};
      b: (value: number) => Promise<void> = async (_value) => {};
      c: () => Promise<number> = async () => 1;
      d: () => void = () => {};
      e: () => void = () => {
        test++;
      };
    })();
    const r = R(i);
    // Working
    let test = 0;
    await r.a[SET](() => {
      test++;
    });
    (await r.a()) satisfies void;
    expect(test).toBe(1);
    await r.a[SET](async () => {
      test++;
    });
    (await r.a()) satisfies void;
    expect(test).toBe(2);
    await r.b[SET]((v) => {
      test += v;
    });
    (await r.b(1)) satisfies void;
    expect(test).toBe(3);
    await r.b[SET](async (v) => {
      test += v;
    });
    (await r.b(1)) satisfies void;
    expect(test).toBe(4);
    await r.c[SET](() => {
      test++;
      return 2;
    });
    expect((await r.c()) satisfies number).toBe(2);
    expect(test).toBe(5);
    await r.c[SET](async () => {
      test++;
      return 2;
    });
    expect((await r.c()) satisfies number).toBe(2);
    expect(test).toBe(6);
    await r.d[SET](r.e);
    (await r.d()) satisfies void;
    expect(test).toBe(7);
    // Working but types should fail
    test = 0;
    // @ts-expect-error
    await r.a[SET]((_: number) => {
      test++;
    });
    (await r.a()) satisfies void;
    expect(test).toBe(1);
    // @ts-expect-error
    await r.a[SET](async (_: number) => {
      test++;
    });
    (await r.a()) satisfies void;
    expect(test).toBe(2);
    // @ts-expect-error
    await r.b[SET]((_: string) => {
      test++;
    });
    (await r.b(1)) satisfies void;
    expect(test).toBe(3);
    // @ts-expect-error
    await r.b[SET](async (_: string) => {
      test++;
    });
    (await r.b(1)) satisfies void;
    expect(test).toBe(4);
    // @ts-expect-error
    await r.c[SET](() => {
      test++;
      return "test";
    });
    expect((await r.c()) satisfies number).toBe("test");
    expect(test).toBe(5);
    // @ts-expect-error
    await r.c[SET](async () => {
      test++;
      return "test";
    });
    expect((await r.c()) satisfies number).toBe("test");
    expect(test).toBe(6);
    // @ts-expect-error
    await r.d[SET](() => {
      test++;
    });
    (await r.d()) satisfies void;
    expect(test).toBe(7);
    // @ts-expect-error
    await r.d[SET](async () => {
      test++;
    });
    (await r.d()) satisfies void;
    expect(test).toBe(8);
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
      hv: string | number | boolean = 0;
      h(value: string | number | boolean): string | number | boolean {
        this.hv = value;
        return value;
      }
      iv: number = 0;
      async i(value: number): Promise<number> {
        this.iv = value;
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
    await expect((async () => (await r.h(1)) satisfies string | number | boolean)()).resolves.toBe(1);
    expect(i.hv).toBe(1);
    await expect((async () => (await r.h("")) satisfies string | number | boolean)()).resolves.toBe("");
    expect(i.hv).toBe("");
    await expect((async () => (await r.h(false)) satisfies string | number | boolean)()).resolves.toBe(false);
    expect(i.hv).toBe(false);
    await expect((async () => (await r.i(1)) satisfies number)()).resolves.toBe(1);
    expect(i.iv).toBe(1);
    // Working but types should fail
    // @ts-expect-error
    await expect((async () => await r.a("test"))()).resolves.toBe("test");
    expect(i.av).toBe("test");
    // @ts-expect-error
    await expect((async () => await r.b(true))()).resolves.toBe(true);
    expect(i.bv).toBe(true);
    // @ts-expect-error
    await expect((async () => await r.c(null))()).resolves.toBe(null);
    expect(i.cv).toBe(null);
    // @ts-expect-error
    await expect((async () => await r.d(1))()).resolves.toBe(1);
    expect(i.dv).toBe(1);
    // @ts-expect-error
    await expect((async () => await r.e(1))()).resolves.toBe(1);
    expect(i.ev).toBe(1);
    // @ts-expect-error
    await expect((async () => await r.f(null))()).resolves.toBe(null);
    expect(i.fv).toBe(null);
    // @ts-expect-error
    await expect((async () => await r.g(1))()).resolves.toBe(1);
    expect(i.gv).toBe(1);
    // @ts-expect-error
    await expect((async () => await r.h(undefined))()).resolves.toBe(undefined);
    expect(i.hv).toBe(undefined);
    // @ts-expect-error
    await expect((async () => await r.i("test"))()).resolves.toBe("test");
    expect(i.iv).toBe("test");
  });
});
