import { describe, expect, test } from "vitest";

import { ObjectStore, type RemoteObject, type RemoteObjectAble } from "./index.js";

describe("Remote<T>", () => {
  function R<T extends RemoteObjectAble>(api: T): RemoteObject<T> {
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
    // @ts-expect-error
    await expect(async () => await R(10)).rejects.toThrow("Only objects and functions can be exposed as remote objects.");
    // @ts-expect-error
    await expect(async () => await R("")).rejects.toThrow("Only objects and functions can be exposed as remote objects.");
    // @ts-expect-error
    await expect(async () => await R(Symbol())).rejects.toThrow("Only objects and functions can be exposed as remote objects.");
    // @ts-expect-error
    await expect(async () => await R(undefined)).rejects.toThrow("Only objects and functions can be exposed as remote objects.");
    // @ts-expect-error
    await expect(async () => await R(true)).rejects.toThrow("Only objects and functions can be exposed as remote objects.");
    await R({});
    await R(() => {});
    await R(class T {});
  });
  test("set Values", async () => {
    const r = R({
      a: 1,
      b(): void {},
      async c(): Promise<void> {},
      d: {},
    });
    // @ts-expect-error
    await expect(async () => await r.set({})).rejects.toThrow("Cannot write to a RemoteObject or Return Value. Only properties can be set.");
    await r.a.set(2);
    // @ts-expect-error
    await r.a.set(undefined);
    // @ts-expect-error
    await r.b.set(() => {});
    await r.c.set(() => {});
    await r.b.set(r.b);
  });
});
