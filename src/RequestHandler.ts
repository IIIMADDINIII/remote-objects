import EventEmitter from "events";
import { setTimeout as wait } from "timers/promises";
import type TypedEmitter from "typed-emitter";
import type { DisconnectedHandler, MessageHandlerInterface, RequestHandlerFunction, RequestHandlerInterface, Transferable } from "./Interfaces.js";
import "./declarations.js";
import { testable } from "./util.js";

type RequestMessage<ExtraTransferable> = {
  id: number;
  request: Transferable<ExtraTransferable>;
};
type ResponseMessage<ExtraTransferable> = {
  id: number;
  response: Transferable<ExtraTransferable>;
};
type ErrorResponseMessage = {
  id: number;
  errorResponse: string;
};
type Message<ExtraTransferable> = RequestMessage<ExtraTransferable> | ResponseMessage<ExtraTransferable> | ErrorResponseMessage;
type ResolveRequest<ExtraTransferable> = {
  success: (data: Transferable<ExtraTransferable>) => void;
  error: (error: unknown) => void;
};

export interface RequestHandlerOptions {
  timeout?: number;
}

function isMessage<ExtraTransferable>(data: Transferable<ExtraTransferable>): data is Message<ExtraTransferable> {
  if (typeof data !== "object" || data === null) return false;
  if (!("id" in data) || typeof data["id"] !== "number") return false;
  return ("request" in data) || ("response" in data) || ("errorResponse" in data);
}

export class TimeoutError extends Error { }
export class RequestError extends Error { }

type RequestHandlerEvents = {
  error(error: Error): void;
};

export class RequestHandler<ExtraTransferable> extends (EventEmitter as new () => TypedEmitter<RequestHandlerEvents>) implements RequestHandlerInterface<ExtraTransferable> {
  #sendMessage: (data: Message<ExtraTransferable>) => Promise<void>;
  #requestHandler: RequestHandlerFunction<ExtraTransferable> | undefined;
  #disconnectedHandler: DisconnectedHandler | undefined;
  #timeout: number = 10000;
  #closed: boolean = false;
  @testable
  #lastRequestId: number = 0;
  #pendingRequests: Map<number, ResolveRequest<ExtraTransferable>> = new Map();

  constructor(messageHandler: MessageHandlerInterface<ExtraTransferable>, options?: RequestHandlerOptions) {
    super();
    this.#sendMessage = messageHandler.sendMessage;
    this.newMessage = this.newMessage.bind(this);
    if (messageHandler.setNewMessageHandler) messageHandler.setNewMessageHandler(this.newMessage);
    this.disconnected = this.disconnected.bind(this);
    if (messageHandler.setDisconnectedHandler) messageHandler.setDisconnectedHandler(this.disconnected);
    if (options?.timeout) this.#timeout = options.timeout;
  }


  async request(request: Transferable<ExtraTransferable>): Promise<Transferable<ExtraTransferable>> {
    this.#checkClosed();
    const id = await this.#nextRequestId();
    return await new Promise((res, rej) => {
      // Timeout Request
      const timer = setTimeout(() => {
        cleanup();
        return rej(new TimeoutError("Request Timeout reached"));
      }, this.#timeout);
      // Called when done Successfully
      const success = (response: Transferable<ExtraTransferable>) => {
        cleanup();
        return res(response);
      };
      const error = (error: unknown) => {
        cleanup();
        return rej(error);
      };
      const cleanup = () => {
        clearTimeout(timer);
        this.#pendingRequests.delete(id);
      };
      // Save resolve to pending requests to be handled later
      this.#pendingRequests.set(id, { success, error });
      // Generate and send Request (cancel if it fails)
      const data: RequestMessage<ExtraTransferable> = { id, request };
      this.#sendMessage(data).catch(error);
    });
  }

  newMessage(data: Transferable<ExtraTransferable>): void {
    if (!isMessage(data)) throw new Error("data needs to contain a id [number] and a request, response or errorResponse");
    if ("request" in data) return this.#handleRequest(data);
    this.#handleResponse(data);
  }

  #handleResponse(data: ResponseMessage<ExtraTransferable> | ErrorResponseMessage): void {
    const id = data.id;
    const resolveRequest = this.#pendingRequests.get(id);
    if (resolveRequest === undefined) return this.emit("error", new Error("Response with invalid id (maybe from timeout): " + id)), void 0;
    if ("errorResponse" in data) return resolveRequest.error(new RequestError(data.errorResponse));
    return resolveRequest.success(data.response);
  }

  #handleRequest(data: RequestMessage<ExtraTransferable>): void {
    if (this.#closed) return this.emit("error", new Error("Connection is already closed")), void 0;
    const id = data.id;
    if (!this.#requestHandler) {
      this.#sendMessage({ id, errorResponse: "Remote has no requestHandler set" }).catch((error) => this.emit("error", error));
      return this.emit("error", new Error("requestHandler is not set")), void 0;
    }
    this.#requestHandler(data.request).then((response) => {
      this.#sendMessage({ id, response }).catch((error) => this.emit("error", error));
    }).catch((error) => {
      this.#sendMessage({ id, errorResponse: "Remote requestHandler threw: " + error }).catch((error) => this.emit("error", error));
      return this.emit("error", error), void 0;
    });
  }

  disconnected(): void {
    this.close();
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#pendingRequests.clear();
    if (this.#disconnectedHandler) this.#disconnectedHandler();
  }

  setRequestHandler(requestHandler: RequestHandlerFunction<ExtraTransferable>): void {
    this.#requestHandler = requestHandler;
  }

  setDisconnectedHandler(disconnected: DisconnectedHandler): void {
    this.#disconnectedHandler = disconnected;
  }

  async #nextRequestId(): Promise<number> {
    do {
      this.#lastRequestId = this.#lastRequestId + 1;
      if (this.#lastRequestId >= Number.MAX_SAFE_INTEGER) {
        this.#lastRequestId = Number.MIN_SAFE_INTEGER;
      }
      if (!this.#pendingRequests.has(this.#lastRequestId)) {
        // block the entry in the Pending requests so the number cant be issued again
        this.#pendingRequests.set(this.#lastRequestId, {
          error: (_error) => {
            this.emit("error", new Error("Response with invalid id (maybe from timeout): " + this.#lastRequestId));
          },
          success: (_data) => {
            this.emit("error", new Error("Response with invalid id (maybe from timeout): " + this.#lastRequestId));
          },
        });
        return this.#lastRequestId;
      }
      await wait(1);
    } while (true);
  }

  #checkClosed(): void {
    if (this.#closed) throw new Error("Connection is already closed.");
  }

}


