import { describe, expect, jest, test } from '@jest/globals';
import { createRemoteObject, getObjectDescription, getProxyData, type RequestFunction } from "./RemoteObject.js";




/* istanbul ignore next */
describe('RemoteObject.ts', () => {
  describe("getProxyData", () => {
    test("should return undefined if it is not a proxy", () => {
      expect(getProxyData(null)).toEqual(undefined);
      expect(getProxyData({})).toEqual(undefined);
      expect(getProxyData(true)).toEqual(undefined);
      expect(getProxyData("test")).toEqual(undefined);
      expect(getProxyData(() => { })).toEqual(undefined);
    });
    test("should return data if it is a Proxy", () => {
      const fn = async () => { };
      const o = { test: "test" };
      const ro = createRemoteObject<typeof o>(getObjectDescription(o), fn);
      expect(getProxyData(ro)).toEqual({ root: { "hasKeys": [], "isFunction": false, "ownKeys": ["test"], "prototype": {}, "request": fn }, path: [] });
    });
  });
  describe('getObjectDescription', () => {
    test("should describe a function", () => {
      const fn = () => { };
      const od = getObjectDescription(fn);
      expect(od.isFunction).toEqual(true);
      expect(od.hasKeys).toEqual([]);
      expect(od.ownKeys).toEqual(["length", "name"]);
      expect(od.prototype).toEqual(Object.getPrototypeOf(fn));
    });
    test("should describe a object", () => {
      const o = { test: "test" };
      const od = getObjectDescription(o);
      expect(od.isFunction).toEqual(false);
      expect(od.hasKeys).toEqual([]);
      expect(od.ownKeys).toEqual(["test"]);
      expect(od.prototype).toEqual(Object.getPrototypeOf(o));
    });
    test("option none should have no hasKeys and prototype", () => {
      const o = { test: "test" };
      const od = getObjectDescription(o, "none");
      expect(od.isFunction).toEqual(false);
      expect(od.hasKeys).toEqual([]);
      expect(od.ownKeys).toEqual(["test"]);
      expect(od.prototype).toEqual(null);
    });
    test("option keysOnly should have hasKeys and no prototype", () => {
      const base = { a: "base" };
      const o = { test: "test" };
      Object.setPrototypeOf(o, base);
      const od = getObjectDescription(o, "keysOnly");
      expect(od.isFunction).toEqual(false);
      for (const key of [...od.hasKeys, "", "test2", "___"]) {
        expect(od.hasKeys.includes(key)).toEqual(key in o);
      }
      expect(od.ownKeys).toEqual(["test"]);
      expect(od.prototype).toEqual(null);
    });
  });

  describe('createRemoteObject', () => {
    test("typeof function should be function", async () => {
      const ro = createRemoteObject<() => void>(getObjectDescription(() => { }), async () => { });
      expect(typeof ro).toBe("function");
    });
    test("typeof object should be object", async () => {
      const ro = createRemoteObject<() => void>(getObjectDescription({}), async () => { });
      expect(typeof ro).toBe("object");
    });
    test("prototype should not be null", () => {
      const base = { a: "test" };
      const o = { test: "test" };
      Object.setPrototypeOf(o, base);
      const ro = createRemoteObject<() => void>(getObjectDescription(o), async () => { });
      expect(Object.getPrototypeOf(ro)).toBe(base);
    });
    test("prototype should be null if description does not include one", () => {
      const base = { a: "test" };
      const o = { test: "test" };
      Object.setPrototypeOf(o, base);
      const ro = createRemoteObject<() => void>(getObjectDescription(o, "keysOnly"), async () => { });
      expect(Object.getPrototypeOf(ro)).toBe(null);
    });
    test("own keys should reflect keys", () => {
      const ro = createRemoteObject<() => void>(getObjectDescription({ test: "test" }), async () => { });
      expect(Reflect.ownKeys(ro)).toEqual(["test"]);
    });
    test("with option none only own keys should return true", () => {
      const base = { a: "test" };
      const o = { test: "test" };
      Object.setPrototypeOf(o, base);
      const ro = createRemoteObject<() => void>(getObjectDescription(o, "none"), async () => { });
      expect("test" in ro).toEqual(true);
      expect("a" in ro).toEqual(false);
    });
    test("with option keysOnly only own keys and parents keys should return true", () => {
      const base = { a: "test" };
      const o = { test: "test" };
      Object.setPrototypeOf(o, base);
      const ro = createRemoteObject<() => void>(getObjectDescription(o, "keysOnly"), async () => { });
      expect("test" in ro).toEqual(true);
      expect("a" in ro).toEqual(true);
    });
    test("with option full only own keys and parents keys should return true", () => {
      const base = { a: "test" };
      const o = { test: "test" };
      Object.setPrototypeOf(o, base);
      const ro = createRemoteObject<() => void>(getObjectDescription(o, "full"), async () => { });
      expect("test" in ro).toEqual(true);
      expect("a" in ro).toEqual(true);
    });
    // Testing request Handler Calls
    test("awaiting object should invoke Request Handler", async () => {
      const fn = jest.fn<RequestFunction>(async () => { });
      const o = { test: "test" };
      const ro = createRemoteObject<typeof o>(getObjectDescription(o), fn);
      await ro;
      expect(fn).toBeCalledTimes(1);
      expect(fn).nthCalledWith(1, { root: expect.anything(), path: [] });
    });
    test("awaiting object key should invoke Request Handler with path", async () => {
      const fn = jest.fn<RequestFunction>(async () => { });
      const o = { test: "test" };
      const ro = createRemoteObject<typeof o>(getObjectDescription(o), fn);
      await ro.test;
      expect(fn).toBeCalledTimes(1);
      expect(fn).nthCalledWith(1, { root: expect.anything(), path: [{ type: "get", name: "test" }] });
    });
    test("awaiting function call should invoke Request Handler with path", async () => {
      const fn = jest.fn<RequestFunction>(async () => { });
      const o = {
        test(_a: number) { return "test"; }
      };
      const ro = createRemoteObject<typeof o>(getObjectDescription(o), fn);
      await ro.test(10);
      expect(fn).toBeCalledTimes(1);
      expect(fn).nthCalledWith(1, { root: expect.anything(), path: [{ type: "get", name: "test" }, { type: "call", args: [10] }] });
    });
    test("awaiting construction call should invoke Request Handler with path", async () => {
      const fn = jest.fn<RequestFunction>(async () => { });
      const o = { test: class { constructor(_n: number) { } } };
      const ro = createRemoteObject<typeof o>(getObjectDescription(o), fn);
      await new ro.test(10);
      expect(fn).toBeCalledTimes(1);
      expect(fn).nthCalledWith(1, { root: expect.anything(), path: [{ type: "get", name: "test" }, { type: "new", args: [10] }] });
    });
    test("awaiting a call to set should invoke Request Handler with path", async () => {
      const fn = jest.fn<RequestFunction>(async () => { });
      const o = { test: "test" };
      const ro = createRemoteObject<typeof o>(getObjectDescription(o), fn);
      await ro.test.set("a");
      expect(fn).toBeCalledTimes(1);
      expect(fn).nthCalledWith(1, { root: expect.anything(), path: [{ type: "set", name: "test", value: "a" }] });
    });
    test("set on RemoteObject should fail", async () => {
      const o = { test: "test" };
      const ro = createRemoteObject<typeof o>(getObjectDescription(o), async () => { });
      expect(async () => await (ro as any).set("a")).rejects.toThrow("Cannot write to a RemoteObject or Return Value. Only properties can be set.");
    });
    test("set on return value should fail", async () => {
      const o = { test() { return 10; } };
      const ro = createRemoteObject<typeof o>(getObjectDescription(o), async () => { });
      expect(async () => await (ro.test() as any).set("a")).rejects.toThrow("Cannot write to a RemoteObject or Return Value. Only properties can be set.");
    });
    // Testing unsupported handlers
    test("getPrototypeOf should fail on Proxy (not RemoteObject)", () => {
      const o = { test: "test" };
      const ro = createRemoteObject<typeof o>(getObjectDescription(o), async () => { });
      expect(() => { Object.getPrototypeOf(ro.test); }).toThrow("getPrototypeOf is currently not Supported by RemoteObject");
    });
    test("has should fail on Proxy (not RemoteObject)", () => {
      const o = { test: { a: "test" } };
      const ro = createRemoteObject<typeof o>(getObjectDescription(o), async () => { });
      expect(() => { "a" in ro.test; }).toThrow("has is currently not Supported by RemoteObject");
    });
    test("ownKeys should fail on Proxy (not RemoteObject)", () => {
      const o = { test: "test" };
      const ro = createRemoteObject<typeof o>(getObjectDescription(o), async () => { });
      expect(() => { Object.getOwnPropertyNames(ro.test); }).toThrow("ownKeys is currently not Supported by RemoteObject");
    });
    test("defineProperty should fail", () => {
      const o = { test: "test" };
      const ro = createRemoteObject<typeof o>(getObjectDescription(o), async () => { });
      expect(() => { Object.defineProperty(ro, "a", { value: "test" }); }).toThrow("'defineProperty' on proxy: trap returned falsish for property 'a'");
    });
    test("deleteProperty should fail", () => {
      const o: { test?: string; } = { test: "test" };
      const ro = createRemoteObject<typeof o>(getObjectDescription(o), async () => { });
      expect(() => { delete ro.test; }).toThrow("'deleteProperty' on proxy: trap returned falsish for property 'test'");
    });
    test("getOwnPropertyDescriptor should fail", () => {
      const o = { test: "test" };
      const ro = createRemoteObject<typeof o>(getObjectDescription(o), async () => { });
      expect(() => Object.getOwnPropertyDescriptor(ro, "test")).toThrow("getOwnPropertyDescriptor is currently not Supported by RemoteObject");
    });
    test("isExtensible should fail", () => {
      const o = { test: "test" };
      const ro = createRemoteObject<typeof o>(getObjectDescription(o), async () => { });
      expect(() => Object.isExtensible(ro)).toThrow("isExtensible is not Supported by RemoteObject");
    });
    test("preventExtensions should fail", () => {
      const o = { test: "test" };
      const ro = createRemoteObject<typeof o>(getObjectDescription(o), async () => { });
      expect(() => { Object.preventExtensions(ro); }).toThrow("'preventExtensions' on proxy: trap returned falsish");
    });
    test("set should fail", () => {
      const o = { test: "test" };
      const ro = createRemoteObject<typeof o>(getObjectDescription(o), async () => { });
      expect(() => { ro.test = ro.test; }).toThrow("'set' on proxy: trap returned falsish for property 'test'");
    });
    test("setPrototypeOf should fail", () => {
      const o = { test: "test" };
      const ro = createRemoteObject<typeof o>(getObjectDescription(o), async () => { });
      expect(() => { Object.setPrototypeOf(ro, o); }).toThrow("'setPrototypeOf' on proxy: trap returned falsish for property 'undefined'");
    });
  });
});