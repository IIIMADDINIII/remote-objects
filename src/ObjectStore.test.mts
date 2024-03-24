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
      test("acquiring the same object twice should return the same Proxy", async () => {
        const [remote, local] = getObjectStorePair();
        const api = { test: {} };
        remote.exposeRemoteObject("test", api);
        const value1 = await local.getRemoteObject<typeof api>("test").test;
        const value2 = await local.getRemoteObject<typeof api>("test").test;
        expect(value1 === value2).toEqual(true);
      });
      test("throwing an error wich is not instanceof Error should work", async () => {
        const [remote, local] = getObjectStorePair();
        const api = { test() { throw "test"; } };
        remote.exposeRemoteObject("test", api);
        await expect(local.getRemoteObject<typeof api>("test").test()).rejects.toEqual("test");
      });
      test("getting primitive datatypes should work", async () => {
        const [remote, local] = getObjectStorePair();
        const api = { string: "test", number: 10, boolean: false, bigInt: 12345678901234567890n, undefined: undefined, null: null, symbol: Symbol() };
        remote.exposeRemoteObject("test", api);
        const a = local.getRemoteObject<typeof api>("test");
        expect(await a.string).toEqual("test");
        expect(await a.number).toEqual(10);
        expect(await a.boolean).toEqual(false);
        expect(await a.bigInt).toEqual(12345678901234567890n);
        expect(await a.undefined).toEqual(undefined);
        expect(await a.null).toEqual(null);
        expect(typeof await a.symbol).toEqual("symbol");
        expect(await a.symbol).toEqual(await a.symbol);
      });
      test("functions and Objects should be Proxied", async () => {
        const [remote, local] = getObjectStorePair();
        const api = { function() { return "test"; }, object: { value: 10 } };
        remote.exposeRemoteObject("test", api);
        const a = local.getRemoteObject<typeof api>("test");
        expect(typeof a.function()).toEqual("function");
        expect(typeof a.object).toEqual("function");
        expect(typeof await a.function).toEqual("function");
        expect(typeof await a.object).toEqual("object");
        expect(await a.function()).toEqual("test");
        expect(await a.object.value).toEqual(10);
      });
    });
    describe("newMessage", () => {
      test("should call newMessageHandler on requestHandler", () => {
        const newMessageHandler = jest.fn();
        const os = new ObjectStore({ async request() { return ""; }, newMessageHandler });
        os.newMessage("test");
        expect(newMessageHandler).toBeCalledTimes(1);
        expect(newMessageHandler).nthCalledWith(1, "test");
      });
      test("should throw if nop newMessageHandler exists", () => {
        const os = new ObjectStore({ async request() { return ""; } });
        expect(() => os.newMessage("test")).toThrow("Function is not Implemented by requestHandler");
      });
    });
    describe("disconnectedHandler", () => {
      test("should call requestHander disconnectedHandler only once", () => {
        const disconnectedHandler = jest.fn();
        const os = new ObjectStore({ async request() { return ""; }, disconnectedHandler });
        os.disconnectedHandler();
        expect(disconnectedHandler).toBeCalledTimes(1);
        os.disconnectedHandler();
        expect(disconnectedHandler).toBeCalledTimes(1);
      });
    });
    describe("requestHandler", () => {
      test("should throw if called with a message not from remote ObjectStore", async () => {
        const os = new ObjectStore({ async request() { return ""; } });
        await expect(os.requestHandler("test")).rejects.toThrow("request is not a message from Remote ObjectStore because it is not a object.");
        await expect(os.requestHandler({})).rejects.toThrow("request is not a message from Remote ObjectStore because it has no type field.");
        await expect(os.requestHandler({ type: "test" })).rejects.toThrow("request is not a message from Remote ObjectStore because it has a unknown value in the type field.");
      });
    });
  });
});