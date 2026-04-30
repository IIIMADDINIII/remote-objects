import { describe, expect, test } from "vite-plus/test";

import { createObjectStore } from "./index.js";

describe("createObjectStore", () => {
  test("should create an ObjectStore with a RequestHandler", async () => {
    const objectStore = createObjectStore({
      sendMessage: () => {},
    });
    expect(objectStore).toBeDefined();
    // oxlint-disable-next-line typescript/unbound-method
    expect(objectStore.requestHandler).toBeDefined();
    expect(typeof objectStore.requestHandler).toBe("function");
  });
});
