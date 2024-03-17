import { describe, expect, jest, test } from '@jest/globals';
import { createProxy, type RequestFunction } from "./RemoteObject.js";




/* istanbul ignore next */
describe('RemoteObject.ts', () => {

  function getObject(cb?: RequestFunction) {
    return createProxy<{ test?: string; }>({
      rootObject: 10,
      awaitPath: [],
      async request(rootObject, awaitPath) {
        if (!cb) return;
        return await cb(rootObject, awaitPath);
      },
    });
  }

  describe('createProxy', () => {
    test("awaiting should invoke request Function", async () => {
      const fn = jest.fn<RequestFunction>();
      const t = getObject(fn);
      await t;
      expect(fn).toBeCalledTimes(1);
      expect(fn).nthCalledWith(1, 10, []);
    });

    test("awaiting key should invoke request Function", async () => {
      const fn = jest.fn<RequestFunction>();
      const t = getObject(fn);
      await t.test;
      expect(fn).toBeCalledTimes(1);
      expect(fn).nthCalledWith(1, 10, [{ type: "prop", name: "test" }]);
    });

    test("symbol key should fail", () => {
      const t = getObject();
      //@ts-ignore
      expect(() => t[Symbol()]).toThrow("symbol key is currently not Supported by RemoteObject");
    });
    test("construct should fail", () => {
      const t = getObject();
      //@ts-ignore
      expect(() => new t()).toThrow("construct is currently not Supported by RemoteObject");
    });
    test("getPrototypeOf should fail", () => {
      const t = getObject();
      expect(() => Object.getPrototypeOf(t)).toThrow("getPrototypeOf is currently not Supported by RemoteObject");
    });
    test("has should fail", () => {
      const t = getObject();
      expect(() => "test" in t).toThrow("has is currently not Supported by RemoteObject");
    });
    test("ownKeys should fail", () => {
      const t = getObject();
      expect(() => Object.getOwnPropertyNames(t)).toThrow("ownKeys is currently not Supported by RemoteObject");
    });
    test("defineProperty should fail", () => {
      const t = getObject();
      expect(() => Object.defineProperty(t, "test", { value: "test" })).toThrow("'defineProperty' on proxy: trap returned falsish for property 'test'");
    });
    test("deleteProperty should fail", () => {
      const t = getObject();
      expect(() => delete t.test).toThrow("'deleteProperty' on proxy: trap returned falsish for property 'test'");
    });
    test("getOwnPropertyDescriptor should fail", () => {
      const t = getObject();
      expect(() => Object.getOwnPropertyDescriptor(t, "test")).toThrow("getOwnPropertyDescriptor is currently not Supported by RemoteObject");
    });
    test("isExtensible should fail", () => {
      const t = getObject();
      expect(() => Object.isExtensible(t)).toThrow("isExtensible is not Supported by RemoteObject");
    });
    test("preventExtensions should fail", () => {
      const t = getObject();
      expect(() => Object.preventExtensions(t)).toThrow("'preventExtensions' on proxy: trap returned falsish");
    });
    test("set should fail", () => {
      const t = getObject();
      //@ts-ignore
      expect(() => t.test = "test").toThrow("'set' on proxy: trap returned falsish for property 'test'");
    });
    test("setPrototypeOf should fail", () => {
      const t = getObject();
      expect(() => Object.setPrototypeOf(t, {})).toThrow("'setPrototypeOf' on proxy: trap returned falsish for property 'undefined'");
    });
  });
});