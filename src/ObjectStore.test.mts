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
      test("prototype option 'keysOnly' should have no Prototype set and the Keys of the parent", async () => {
        class Test { a: number; b(): string { return this.a.toString(); } constructor(a: number) { this.a = a; } };
        class Test2 extends Test { c: number = 3; };
        const api = { Test2: Test2 };
        const [remote, local] = getObjectStorePair({ remoteObjectPrototype: "keysOnly" });
        remote.exposeRemoteObject("test", api);
        const a = local.getRemoteObject<typeof api>("test");
        const i = await new a.Test2(10);
        expect(Object.getPrototypeOf(i)).toEqual(null);
        expect("a" in i).toEqual(true);
        expect("b" in i).toEqual(true);
        expect("c" in i).toEqual(true);
        expect("d" in i).toEqual(false);
      });
      test("prototype option 'none' should have no Prototype set and no Keys of the parent", async () => {
        class Test { a: number; b(): string { return this.a.toString(); } constructor(a: number) { this.a = a; } };
        class Test2 extends Test { c: number = 3; };
        const api = { Test2: Test2 };
        const [remote, local] = getObjectStorePair({ remoteObjectPrototype: "none" });
        remote.exposeRemoteObject("test", api);
        const a = local.getRemoteObject<typeof api>("test");
        const i = await new a.Test2(10);
        expect(Object.getPrototypeOf(i)).toEqual(null);
        expect("a" in i).toEqual(true);
        expect("b" in i).toEqual(false);
        expect("c" in i).toEqual(true);
        expect("d" in i).toEqual(false);
      });
      test("remoteError option 'remoteObject' should return an RemoteObject instead of an Error Instance", async () => {
        const api = { fn() { throw new Error("test"); }, error: Error };
        const [remote, local] = getObjectStorePair({ remoteError: "remoteObject" });
        remote.exposeRemoteObject("test", api);
        const a = local.getRemoteObject<typeof api>("test");
        const e = await a.error;
        try {
          await a.fn();
        } catch (error: any) {
          expect(typeof error).toEqual("object");
          expect(error instanceof Error).toEqual(false);
          expect(error instanceof e).toEqual(true);
          expect(await error.message).toEqual("test");
        }
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
      // Unsupported Proxy Handlers
      test("defineProperty should fail", async () => {
        const api = { a: 10 };
        const [remote, local] = getObjectStorePair();
        remote.exposeRemoteObject("test", api);
        const a = await local.requestRemoteObject<typeof api>("test");
        expect(() => Object.defineProperty(a, "b", {})).toThrow("'defineProperty' on proxy: trap returned falsish for property 'b'");
      });
      test("deleteProperty should fail", async () => {
        const api: { a?: number; } = { a: 10 };
        const [remote, local] = getObjectStorePair();
        remote.exposeRemoteObject("test", api);
        const a = await local.requestRemoteObject<typeof api>("test");
        expect(() => delete a.a).toThrow("'deleteProperty' on proxy: trap returned falsish for property 'a'");
      });
      test("isExtensible should fail", async () => {
        const api: { a?: number; } = { a: 10 };
        const [remote, local] = getObjectStorePair();
        remote.exposeRemoteObject("test", api);
        const a = await local.requestRemoteObject<typeof api>("test");
        expect(() => Object.isExtensible(a)).toThrow("isExtensible is not Supported by RemoteObject");
      });
      test("preventExtensions should fail", async () => {
        const api: { a?: number; } = { a: 10 };
        const [remote, local] = getObjectStorePair();
        remote.exposeRemoteObject("test", api);
        const a = await local.requestRemoteObject<typeof api>("test");
        expect(() => Object.preventExtensions(a)).toThrow("'preventExtensions' on proxy: trap returned falsish");
      });
      test("set should fail", async () => {
        const api: { a?: number; } = { a: 10 };
        const [remote, local] = getObjectStorePair();
        remote.exposeRemoteObject("test", api);
        const a = await local.requestRemoteObject<typeof api>("test");
        expect(() => a.a = 11 as any).toThrow("'set' on proxy: trap returned falsish for property 'a'");
      });
      test("setPrototypeOf should fail", async () => {
        const api: { a?: number; } = { a: 10 };
        const [remote, local] = getObjectStorePair();
        remote.exposeRemoteObject("test", api);
        const a = await local.requestRemoteObject<typeof api>("test");
        expect(() => Object.setPrototypeOf(a, {})).toThrow("'setPrototypeOf' on proxy: trap returned falsish for property 'undefined'");
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
      test("providing a proxied object should resolve in to the Object on remote", async () => {
        const [remote, local] = getObjectStorePair();
        const fn = jest.fn();
        const api = { fn: fn as (o: object) => void, object: { value: 10 } };
        remote.exposeRemoteObject("test", api);
        const a = local.getRemoteObject<typeof api>("test");
        await a.fn(a.object);
        expect(fn).toBeCalledTimes(1);
        expect(fn.mock.calls[0]?.[0]).not.toBe({ value: 10 });
        expect(fn.mock.calls[0]?.[0]).toBe(api.object);
      });
      test("setting a remote value should work", async () => {
        const [remote, local] = getObjectStorePair();
        const api = { number: 10 };
        remote.exposeRemoteObject("test", api);
        const a = local.getRemoteObject<typeof api>("test");
        expect(api.number).not.toEqual(11);
        await a.number.set(11);
        expect(api.number).toEqual(11);
      });
      test("constructing an instance should work", async () => {
        let instance: any = undefined;
        class Test { a: number; constructor(a: number) { this.a = a; instance = this; } };
        const api = { class: Test };
        const [remote, local] = getObjectStorePair();
        remote.exposeRemoteObject("test", api);
        const a = local.getRemoteObject<typeof api>("test");
        const cl = await a.class;
        const i = await new cl(11);
        expect(i instanceof cl).toEqual(true);
        expect(await i.a).toEqual(11);
        expect(instance instanceof Test).toEqual(true);
        expect(instance.a).toEqual(11);
      });
      test("instance of with parent class should work", async () => {
        class Test { };
        class Test2 extends Test { };
        const api = { Test: Test, Test2: Test2 };
        const [remote, local] = getObjectStorePair();
        remote.exposeRemoteObject("test", api);
        const a = local.getRemoteObject<typeof api>("test");
        const test = await a.Test;
        const test2 = await a.Test2;
        const i = await new test();
        const i2 = await new test2();
        expect(i instanceof test).toEqual(true);
        expect(i2 instanceof test).toEqual(true);
        expect(i instanceof test2).toEqual(false);
        expect(i2 instanceof test2).toEqual(true);
      });
      test("parent properties should work", async () => {
        class Test { a: number; b(): string { return this.a.toString(); } constructor(a: number) { this.a = a; } };
        class Test2 extends Test { };
        const api = { Test2: Test2 };
        const [remote, local] = getObjectStorePair();
        remote.exposeRemoteObject("test", api);
        const a = local.getRemoteObject<typeof api>("test");
        const i = await new a.Test2(10);
        expect("a" in i).toEqual(true);
        expect("b" in i).toEqual(true);
        expect("c" in i).toEqual(false);
        expect(await i.a).toEqual(10);
        expect(await i.b()).toEqual("10");
        await i.a.set(11);
        expect(await i.a).not.toEqual(10);
        expect(await i.b()).not.toEqual("10");
        expect(await i.a).toEqual(11);
        expect(await i.b()).toEqual("11");
      });
      test("trying to write to the direct value should fail", async () => {
        const api = {};
        const [remote, local] = getObjectStorePair();
        remote.exposeRemoteObject("test", api);
        const a = local.getRemoteObject<typeof api>("test");
        await expect(async () => (a as any).set()).rejects.toThrow("Cannot write to a RemoteObject or Return Value. Only properties can be set.");
        await expect(async () => new (a as any)().set()).rejects.toThrow("Cannot write to a RemoteObject or Return Value. Only properties can be set.");
      });
      test("if error has no Stacktrace only remote stack should be Returned", async () => {
        const backup = Error;
        const fakeError = class Error { message: string = "test"; name: string = "test"; } as any;
        try {
          global.Error = fakeError;
          expect((new Error()).stack).toEqual(undefined);
          const api = {
            fn() {
              throw new backup();
            }
          };
          const remote: ObjectStore = new ObjectStore({ request: (data) => remote.requestHandler(data) });
          const local: ObjectStore = new ObjectStore({
            request: async (data) => {
              global.Error = backup;
              const ret = await local.requestHandler(data);
              global.Error = fakeError;
              return ret;
            }
          });
          remote.exposeRemoteObject("test", api);
          const a = local.getRemoteObject<typeof api>("test");
          try {
            await a.fn();
          } catch (error: any) {
            expect(error.stack).toMatch(/^Remote Stacktrace\:.*$/gm);
            expect(error[Symbol.toStringTag]()).toEqual("Error");
          }
        } finally {
          global.Error = backup;
        }
      });
      // Unsupported Proxy Handlers
      test("getProtypeOf should fail", async () => {
        const api = {};
        const [remote, local] = getObjectStorePair();
        remote.exposeRemoteObject("test", api);
        const a = local.getRemoteObject<typeof api>("test");
        expect(() => Object.getPrototypeOf(a)).toThrow("getPrototypeOf is not Supported by RemoteObject Proxy. Await the RemoteObject to be able to query metadata.");
      });
      test("has should fail", async () => {
        const api = { a: 10 };
        const [remote, local] = getObjectStorePair();
        remote.exposeRemoteObject("test", api);
        const a = local.getRemoteObject<typeof api>("test");
        expect(() => "a" in a).toThrow("has is not Supported by RemoteObject Proxy. Await the RemoteObject to be able to query metadata.");
      });
      test("ownKeys should fail", async () => {
        const api = { a: 10 };
        const [remote, local] = getObjectStorePair();
        remote.exposeRemoteObject("test", api);
        const a = local.getRemoteObject<typeof api>("test");
        expect(() => Object.getOwnPropertyNames(a)).toThrow("ownKeys is not Supported by RemoteObject Proxy. Await the RemoteObject to be able to query metadata.");
      });
      test("getOwnPropertyDescriptor should fail", async () => {
        const api = { a: 10 };
        const [remote, local] = getObjectStorePair();
        remote.exposeRemoteObject("test", api);
        const a = local.getRemoteObject<typeof api>("test");
        expect(() => Object.getOwnPropertyDescriptor(a, "a")).toThrow("getOwnPropertyDescriptor is not Supported by RemoteObject Proxy. Await the RemoteObject to be able to query metadata.");
      });
      test("defineProperty should fail", async () => {
        const api = { a: 10 };
        const [remote, local] = getObjectStorePair();
        remote.exposeRemoteObject("test", api);
        const a = local.getRemoteObject<typeof api>("test");
        expect(() => Object.defineProperty(a, "b", {})).toThrow("'defineProperty' on proxy: trap returned falsish for property 'b'");
      });
      test("deleteProperty should fail", async () => {
        const api: { a?: number; } = { a: 10 };
        const [remote, local] = getObjectStorePair();
        remote.exposeRemoteObject("test", api);
        const a = local.getRemoteObject<typeof api>("test");
        expect(() => delete a.a).toThrow("'deleteProperty' on proxy: trap returned falsish for property 'a'");
      });
      test("isExtensible should fail", async () => {
        const api: { a?: number; } = { a: 10 };
        const [remote, local] = getObjectStorePair();
        remote.exposeRemoteObject("test", api);
        const a = local.getRemoteObject<typeof api>("test");
        expect(() => Object.isExtensible(a)).toThrow("isExtensible is not Supported by RemoteObject");
      });
      test("preventExtensions should fail", async () => {
        const api: { a?: number; } = { a: 10 };
        const [remote, local] = getObjectStorePair();
        remote.exposeRemoteObject("test", api);
        const a = local.getRemoteObject<typeof api>("test");
        expect(() => Object.preventExtensions(a)).toThrow("'preventExtensions' on proxy: trap returned falsish");
      });
      test("set should fail", async () => {
        const api: { a?: number; } = { a: 10 };
        const [remote, local] = getObjectStorePair();
        remote.exposeRemoteObject("test", api);
        const a = local.getRemoteObject<typeof api>("test");
        expect(() => a.a = 11 as any).toThrow("'set' on proxy: trap returned falsish for property 'a'");
      });
      test("setPrototypeOf should fail", async () => {
        const api: { a?: number; } = { a: 10 };
        const [remote, local] = getObjectStorePair();
        remote.exposeRemoteObject("test", api);
        const a = local.getRemoteObject<typeof api>("test");
        expect(() => Object.setPrototypeOf(a, {})).toThrow("'setPrototypeOf' on proxy: trap returned falsish for property 'undefined'");
      });
      test("callbacks should work", async () => {
        class Base { a: number; constructor(a: number) { this.a = a; } }
        class RemoteClass extends Base { };
        class LocalClass extends Base { };
        const api = {
          sync(cb: (a: number) => number) { return cb(10); },
          double(a: number) { return a * 2; },
          async async(cb: (a: number) => Promise<number>) { return await cb(10); },
          syncConstruct(cl: new (a: number) => Base) { return new cl(10); },
          async asyncConstruct(cl: new (a: number) => Promise<Base>) { return await (new cl(10)); },
          RemoteClass,
          async callbackCallback(cb: (cb: (a: number) => number) => Promise<number>) { return await cb((a) => a * 3); }
        };
        const [remote, local] = getObjectStorePair();
        remote.exposeRemoteObject("test", api);
        const a = local.getRemoteObject<typeof api>("test");
        const tripple = (a: number) => a * 3;
        const callback = async (cb: (a: number) => PromiseLike<number>) => await cb(10) * 2;
        expect(await a.sync(a.double)).toEqual(20);
        expect(await a.async(a.double)).toEqual(20);
        expect(await a.async(tripple)).toEqual(30);

        expect(await a.syncConstruct(a.RemoteClass).a).toEqual(10);
        expect(await a.asyncConstruct(a.RemoteClass).a).toEqual(10);
        expect(await a.asyncConstruct(LocalClass).a).toEqual(10);

        expect(await a.callbackCallback(callback)).toEqual(60);
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
      test("requests after disconnect throw an error", async () => {
        const os = new ObjectStore({ async request() { throw new Error(); } });
        os.close();
        expect(() => os.exposeRemoteObject("test", {})).toThrow("Connection is already closed.");
        await expect(() => os.requestRemoteObject("test")).rejects.toThrow("Connection is already closed.");
        expect(() => os.getRemoteObject("test")).toThrow("Connection is already closed.");
        await expect(() => os.requestHandler("")).rejects.toThrow("Connection is already closed.");
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