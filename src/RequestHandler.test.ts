import { describe, expect, test, vi } from "vitest";
import { RequestHandler } from "./RequestHandler.js";

/**
 * Waits for the specified number of milliseconds.
 * @param ms The number of milliseconds to wait.
 * @returns A promise that resolves after the specified time.
 */
function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRequestHandler(timeout?: number) {
  const rh = new RequestHandler({
    async sendMessage(data) {
      setTimeout(() => rh.newMessageHandler(data), 0);
    },
  }, timeout);
  rh.on("error", () => { });
  return rh;
}

function getFaultyRequestHandlerPair() {
  const master = new RequestHandler({
    async sendMessage(data) {
      setTimeout(() => faulty.newMessageHandler(data), 0);
    },
  }, 100);
  const faulty = new RequestHandler({
    async sendMessage(_data) {
      throw new Error("test");
    },
  });
  return { master, faulty };
}

describe("RequestHandler", () => {
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
      await expect(rh.request({})).rejects.toThrow(
        "Connection is already closed",
      );
    });
    test("should throw if no requestHandler is set", async () => {
      const rh = getRequestHandler();
      await expect(rh.request({})).rejects.toThrow(
        "Remote has no requestHandler set",
      );
    });
    test("should throw if no requestHandler is set and cant send message", async () => {
      const { master, faulty } = getFaultyRequestHandlerPair();
      const cb = vi.fn();
      faulty.addEventListener("error", cb);
      await expect(master.request(0)).rejects.toThrow(
        "Request Timeout reached",
      );
      expect(() => {
        throw cb.mock.lastCall?.[0];
      }).toThrow("test");
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
      const cb = vi.fn();
      faulty.on("error", cb);
      await expect(master.request(0)).rejects.toThrow(
        "Request Timeout reached",
      );
      expect(() => {
        throw cb.mock.lastCall?.[0];
      }).toThrow("test");
    });
    test("should error when it cant send message if request errored", async () => {
      const { master, faulty } = getFaultyRequestHandlerPair();
      faulty.setRequestHandler(async (_request) => {
        throw new Error("aaa");
      });
      const cb = vi.fn();
      faulty.on("error", cb);
      await expect(master.request(0)).rejects.toThrow(
        "Request Timeout reached",
      );
      expect(() => {
        throw cb.mock.lastCall?.[0];
      }).toThrow("test");
    });
    test("testing request id wrapping", async () => {
      const rh = getRequestHandler();
      rh.setRequestHandler(async (_request) => {
        return "test";
      });
      (rh as any)["lastRequestIdPrivate"] = Number.MAX_SAFE_INTEGER - 1;
      await expect(rh.request({})).resolves.toStrictEqual("test");
    });
    test("test handling, if nextid is still in use", async () => {
      const rh = getRequestHandler();
      rh.setRequestHandler(async (_request) => {
        await wait(100);
        return "test";
      });
      let firstRequest = rh.request({});
      (rh as any)["lastRequestIdPrivate"] = 0;
      await expect(rh.request({})).resolves.toStrictEqual("test");
      await expect(firstRequest).resolves.toStrictEqual("test");
    });
  });
  describe("newMessage", () => {
    test("throw if message is not an object", () => {
      const rh = getRequestHandler();
      expect(() => rh.newMessageHandler("")).toThrow(
        "data needs to contain a id [number] and a request, response or errorResponse",
      );
    });
    test("throw if message does not contain an id as number", () => {
      const rh = getRequestHandler();
      expect(() => rh.newMessageHandler({ id: "" })).toThrow(
        "data needs to contain a id [number] and a request, response or errorResponse",
      );
    });
    test("throw if response id is unknown", () => {
      const rh = getRequestHandler();
      const cb = vi.fn();
      rh.on("error", cb);
      rh.newMessageHandler({ id: 0, errorResponse: "" });
      expect(() => {
        throw cb.mock.lastCall?.[0];
      }).toThrow("Response with invalid id (maybe from timeout): ");
    });
    test("should Error on request when already closed", () => {
      const rh = getRequestHandler();
      const cb = vi.fn();
      rh.on("error", cb);
      rh.close();
      rh.newMessageHandler({ id: 0, request: "" });
      expect(() => {
        throw cb.mock.lastCall?.[0];
      }).toThrow("Connection is already closed");
    });
    test("should Error on response when already closed", () => {
      const rh = getRequestHandler();
      const cb = vi.fn();
      rh.on("error", cb);
      rh.close();
      rh.newMessageHandler({ id: 0, response: "" });
      expect(() => {
        throw cb.mock.lastCall?.[0];
      }).toThrow("Connection is already closed");
    });
  });
  describe("disconnectedHandler", () => {
    test("should call disconnectedHandler on Parent and MessageHandler", () => {
      const messageCallback = vi.fn();
      const rh = new RequestHandler({
        async sendMessage() { },
        disconnectedHandler: messageCallback,
      });
      const callback = vi.fn();
      rh.setDisconnectedHandler(callback);
      // Disconnect should do the same as close
      rh.disconnectedHandler();
      expect(callback).calledOnceWith();
      expect(messageCallback).calledOnceWith();
      // Closing twice should not call the callback again
      rh.close();
      expect(callback).calledOnceWith();
      expect(messageCallback).calledOnceWith();
    });
    test("Open Requests should be handled", async () => {
      const rh = new RequestHandler({
        async sendMessage() { },
      });
      const request = rh.request("test");
      rh.close();
      await expect(request).rejects.toThrow("Connection was Closed");
    });
  });
  describe("on", () => {
    test("can be called with some thing other than error", async () => {
      const rh = getRequestHandler();
      rh.on("test", () => { });
    });
    test("if no error is registered, console.log happens", async () => {
      try {
        const errorSpy = vi.spyOn(console, "error");
        const rh = new RequestHandler({
          async sendMessage(data) {
            setTimeout(() => rh.newMessageHandler(data), 0);
          },
        }, 100);
        rh.newMessageHandler({ id: 0, errorResponse: "" });
        expect(errorSpy).calledOnceWith(
          new Error("Response with invalid id (maybe from timeout): 0"),
        );
      } finally {
        vi.restoreAllMocks();
      }
    });
    test("if an error handler throws, it is logged", async () => {
      try {
        const errorSpy = vi.spyOn(console, "error");
        const rh = new RequestHandler({
          async sendMessage(data) {
            setTimeout(() => rh.newMessageHandler(data), 0);
          },
        }, 100);
        rh.on("error", () => {
          throw new Error("test");
        });
        rh.newMessageHandler({ id: 0, errorResponse: "" });
        expect(errorSpy).calledOnceWith(
          new Error("test"),
        );
      } finally {
        vi.restoreAllMocks();
      }
    });
  });
  describe("off", () => {
    test("calling off with something else than error has no effect", async () => {
      const rh = getRequestHandler();
      rh.off("test", () => { });
    });
    test("removing an unknown listener has no effect", async () => {
      const rh = getRequestHandler();
      rh.removeEventListener("error", () => { });
    });
    test("listener can be removed again", async () => {
      const rh = getRequestHandler();
      const l = vi.fn();
      rh.on("error", l);
      rh.off("error", l);
      rh.newMessageHandler({ id: 0, errorResponse: "" });
      expect(l).not.called;
    });
  });
});
