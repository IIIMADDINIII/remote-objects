import { describe, expect, jest, test } from '@jest/globals';
import type { RequestHandlerFunction } from "./Interfaces.js";
import { ObjectStore } from "./ObjectStore.js";
import type { ObjectStoreOptions } from "./types.js";

/* istanbul ignore next */
describe('RequestHandler.ts', () => {
  describe("ObjectStore", () => {
    function getObjectStorePair(options: ObjectStoreOptions = {}): [ObjectStore, ObjectStore] {
      const a: ObjectStore = new ObjectStore({ request: (data) => b.requestHandler(data) }, options);
      const b: ObjectStore = new ObjectStore({ request: (data) => a.requestHandler(data) }, options);
      return [a, b];
    }

    describe("constructor", () => {
      test("should call setRequestHandler and ", () => {
        const dh = jest.fn();
        const rh = jest.fn();
        const os = new ObjectStore({
          async request() { return ""; },
          setDisconnectedHandler: dh,
          setRequestHandler: rh,
        });
        expect(dh).toBeCalledTimes(1);
        expect(dh).nthCalledWith(1, os.disconnectedHandler);
        expect(rh).toBeCalledTimes(1);
        expect(rh).nthCalledWith(1, os.requestHandler);
      });
    });
    describe("exposeRemoteObject", () => {
      test("Id can not be exposed twice", () => {
        const os = new ObjectStore({ async request() { return ""; } });
        os.exposeRemoteObject("test", {});
        expect(() => os.exposeRemoteObject("test", {})).toThrow("Remote Object with id test is already exposed.");
      });
      test("exposed api should be accessible with requestRemoteObject", async () => {
        const [remote, local] = getObjectStorePair();
        const api = { test: 10 };
        remote.exposeRemoteObject("test", api);
        const value = await local.requestRemoteObject<typeof api>("test");
        expect(typeof value).toEqual("object");
        expect(typeof Object.getPrototypeOf(value)).toEqual("object");
        expect(Object.getPrototypeOf(Object.getPrototypeOf(value))).toEqual(null);
        expect([...Object.keys(value)]).toEqual(["test"]);
        expect("test" in value).toEqual(true);
      });
    });
    describe("requestRemoteObject", () => {
      test("should fail if remote object does not exist", async () => {
        const [_, local] = getObjectStorePair();
        await expect(local.requestRemoteObject("test")).rejects.toThrow("Object with id test is unknown.");
      });
      test("should return exact same Proxy for the same id", async () => {
        const [remote, local] = getObjectStorePair();
        const api = { test: 10 };
        remote.exposeRemoteObject("test", api);
        const value1 = await local.requestRemoteObject<typeof api>("test");
        const value2 = await local.requestRemoteObject<typeof api>("test");
        expect(value1 === value2).toEqual(true);
      });
    });
    describe("getRemoteObject", () => {
      test("should not invoke a Request", () => {
        const request = jest.fn<RequestHandlerFunction>();
        const os = new ObjectStore({ request });
        const value = os.getRemoteObject("test");
        expect(request).toBeCalledTimes(0);
        expect(typeof value).toEqual("function");
      });
    });
  });
});