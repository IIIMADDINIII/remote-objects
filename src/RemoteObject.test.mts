import { describe, expect, jest, test } from '@jest/globals';
import { createRemoteObject, type RequestFunction } from "./RemoteObject.js";




/* istanbul ignore next */
describe('RemoteObject.ts', () => {

  describe("isProxy", () => {
    test("should return true on a Proxy", () => {
      const t = getObject();
      expect(isProxy(t)).toBe(true);
    });
    test("should return false on anything but a Proxy", () => {
      expect(isProxy(true)).toBe(false);
      expect(isProxy(null)).toBe(false);
      expect(isProxy(undefined)).toBe(false);
      expect(isProxy({})).toBe(false);
      expect(isProxy(10)).toBe(false);
      expect(isProxy("test")).toBe(false);
      expect(isProxy(new Proxy({}, {}))).toBe(false);
      expect(isProxy(() => { })).toBe(false);
    });
  });

  describe('createRemoteObject', () => {
    test("awaiting should invoke request Function", async () => {
      const fn = jest.fn<RequestFunction>();
      const t = createRemoteObject(fn);
      await t;
      expect(fn).toBeCalledTimes(1);
      expect(fn).nthCalledWith(1, 10, []);
    });




    test("awaiting should invoke request Function", async () => {
      const fn = jest.fn<RequestFunction>();
      const t = createRemoteObject(fn);
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
    test("awaiting call should invoke request Function", async () => {
      const fn = jest.fn<RequestFunction>();
      const t = getObject(fn);
      //@ts-ignore
      await t(15, "test");
      expect(fn).toBeCalledTimes(1);
      expect(fn).nthCalledWith(1, 10, [{ type: "call", args: [15, "test"] }]);
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