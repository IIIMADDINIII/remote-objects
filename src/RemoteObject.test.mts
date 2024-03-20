import { describe, expect, jest, test } from '@jest/globals';
import { createRemoteObject, getObjectDescription, type RequestFunction } from "./RemoteObject.js";




/* istanbul ignore next */
describe('RemoteObject.ts', () => {
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
      const o = {
        test: class { }
      };
      const ro = createRemoteObject<typeof o>(getObjectDescription(o), fn);
      await new ro.test(10);
      expect(fn).toBeCalledTimes(1);
      expect(fn).nthCalledWith(1, { root: expect.anything(), path: [{ type: "get", name: "test" }, { type: "call", args: [10] }] });
    });
  });
});