import { describe, expect, jest, test } from '@jest/globals';
import { setTimeout as wait } from "timers/promises";
import { RequestHandler } from "./RequestHandler.js";
import { setTestable } from "./util.js";

/* istanbul ignore next */
describe('RequestHandler.ts', () => {

  function getRequestHandler(timeout?: number) {
    const rh = new RequestHandler({
      async sendMessage(data) {
        setTimeout(() => rh.newMessageHandler(data), 0);
      }
    }, timeout);
    rh.on("error", () => { });
    return rh;
  }

  function getFaultyRequestHandlerPair() {
    const master = new RequestHandler({
      async sendMessage(data) {
        setTimeout(() => faulty.newMessageHandler(data), 0);
      }
    }, 100);
    const faulty = new RequestHandler({
      async sendMessage(_data) {
        throw new Error("test");
      }
    });
    return { master, faulty };
  }

  describe('RequestHandler', () => {
    describe("constructor", () => {
      test("should call setDisconnectedHandler ", () => {
        let dh = () => { };
        const rh = new RequestHandler({
          async sendMessage() { },
          setDisconnectedHandler(disconnected) {
            dh = disconnected;
          },
        });
        expect(rh.disconnectedHandler).toStrictEqual(dh);
      });
      test("should call setNewMessageHandler", () => {
        let mh = (_a: any) => { };
        const rh = new RequestHandler({
          async sendMessage() { },
          setNewMessageHandler(newMessage) {
            mh = newMessage;
          },
        });
        expect(rh.newMessageHandler).toStrictEqual(mh);
      });
    });
    describe("request", () => {
      test("should throw if already closed", async () => {
        const rh = getRequestHandler();
        rh.close();
        await expect(rh.request({})).rejects.toThrow("Connection is already closed");
      });
      test("should throw if no requestHandler is set", async () => {
        const rh = getRequestHandler();
        await expect(rh.request({})).rejects.toThrow("Remote has no requestHandler set");
      });
      test("should throw if no requestHandler is set and cant send message", async () => {
        const { master, faulty } = getFaultyRequestHandlerPair();
        const cb = jest.fn();
        faulty.on("error", cb);
        await expect(master.request(0)).rejects.toThrow("Request Timeout reached");
        expect(() => { throw cb.mock.lastCall?.[0]; }).toThrow("test");
      });
      test("should throw if requestHandler throws", async () => {
        const rh = getRequestHandler();
        rh.setRequestHandler(async (_request) => {
          throw new Error("test");
        });
        await expect(rh.request({})).rejects.toThrow("test");
      });
      test("should throw if timeout is reached", async () => {
        const rh = getRequestHandler(100);
        rh.setRequestHandler(async (_request) => {
          await wait(200);
          return "aaa";
        });
        await expect(rh.request({})).rejects.toThrow("Request Timeout reached");
      });
      test("should return the response of the requestHandler", async () => {
        const rh = getRequestHandler();
        rh.setRequestHandler(async (_request) => {
          return "test";
        });
        await expect(rh.request({})).resolves.toStrictEqual("test");
      });
      test("should error when it cant send message if request was successful", async () => {
        const { master, faulty } = getFaultyRequestHandlerPair();
        faulty.setRequestHandler(async (_request) => {
          return "aaa";
        });
        const cb = jest.fn();
        faulty.on("error", cb);
        await expect(master.request(0)).rejects.toThrow("Request Timeout reached");
        expect(() => { throw cb.mock.lastCall?.[0]; }).toThrow("test");
      });
      test("should error when it cant send message if request errored", async () => {
        const { master, faulty } = getFaultyRequestHandlerPair();
        faulty.setRequestHandler(async (_request) => {
          throw new Error("aaa");
        });
        const cb = jest.fn();
        faulty.on("error", cb);
        await expect(master.request(0)).rejects.toThrow("Request Timeout reached");
        expect(() => { throw cb.mock.lastCall?.[0]; }).toThrow("test");
      });
      test("testing request id wrapping", async () => {
        const rh = getRequestHandler();
        rh.setRequestHandler(async (_request) => {
          return "test";
        });
        setTestable(rh, "#lastRequestId", Number.MAX_SAFE_INTEGER - 1);
        await expect(rh.request({})).resolves.toStrictEqual("test");
      });
      test("test handling, if nextid is still in use", async () => {
        const rh = getRequestHandler();
        rh.setRequestHandler(async (_request) => {
          await wait(100);
          return "test";
        });
        let firstRequest = rh.request({});
        setTestable(rh, "#lastRequestId", 0);
        await expect(rh.request({})).resolves.toStrictEqual("test");
        await expect(firstRequest).resolves.toStrictEqual("test");
      });
    });
    describe("newMessage", () => {
      test("throw if message is not an object", () => {
        const rh = getRequestHandler();
        expect(() => rh.newMessageHandler("")).toThrow("data needs to contain a id [number] and a request, response or errorResponse");
      });
      test("throw if message does not contain an id as number", () => {
        const rh = getRequestHandler();
        expect(() => rh.newMessageHandler({ id: "" })).toThrow("data needs to contain a id [number] and a request, response or errorResponse");
      });
      test("throw if response id is unknown", () => {
        const rh = getRequestHandler();
        const cb = jest.fn();
        rh.on("error", cb);
        rh.newMessageHandler({ id: 0, errorResponse: "" });
        expect(() => { throw cb.mock.lastCall?.[0]; }).toThrow("Response with invalid id (maybe from timeout): ");
      });
      test("should Error on request when already closed", () => {
        const rh = getRequestHandler();
        const cb = jest.fn();
        rh.on("error", cb);
        rh.close();
        rh.newMessageHandler({ id: 0, request: "" });
        expect(() => { throw cb.mock.lastCall?.[0]; }).toThrow("Connection is already closed");
      });
    });
    describe("disconnectedHandler", () => {
      test("should call disconnectedHandler on Parent and MessageHandler", () => {
        const messageCallback = jest.fn();
        const rh = new RequestHandler({
          async sendMessage() { },
          disconnectedHandler: messageCallback,
        });
        const callback = jest.fn();
        rh.setDisconnectedHandler(callback);
        // Disconnect should do the same as close
        rh.disconnectedHandler();
        expect(callback).toBeCalledTimes(1);
        expect(messageCallback).toBeCalledTimes(1);
        // Closing twice should not call the callback again
        rh.close();
        expect(callback).toBeCalledTimes(1);
        expect(messageCallback).toBeCalledTimes(1);
      });
    });
  });
});