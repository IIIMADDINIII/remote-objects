import type { DisconnectedHandler, MessageHandlerInterface, RequestHandlerFunction, RequestHandlerInterface, Transferable } from "./Interfaces.js";
import "./declarations.js";

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
  if (!("id" in data) || typeof data["id"] !== "number") return false;
  return ("request" in data) || ("response" in data);
}

export class TimeoutError extends Error { }
export class RequestError extends Error { }

export class RequestHandler<ExtraTransferable> implements RequestHandlerInterface<ExtraTransferable> {
  #sendMessage: (data: Message<ExtraTransferable>) => Promise<void>;
  #requestHandler: RequestHandlerFunction<ExtraTransferable> | undefined;
  #disconnectedHandler: DisconnectedHandler | undefined;
  #timeout: number = 10000;
  #closed: boolean = false;
  #lastRequestId: number = 0;
  #pendingRequests: Map<number, ResolveRequest<ExtraTransferable>> = new Map();
  #handleError: (error: unknown) => void;

  constructor(messageHandler: MessageHandlerInterface<ExtraTransferable>, options?: RequestHandlerOptions) {
    this.#sendMessage = messageHandler.sendMessage;
    this.newMessage = this.newMessage.bind(this);
    if (messageHandler.setNewMessageHandler) messageHandler.setNewMessageHandler(this.newMessage);
    this.disconnected = this.disconnected.bind(this);
    if (messageHandler.setDisconnectedHandler) messageHandler.setDisconnectedHandler(this.disconnected);
    this.#handleError = () => { };
    if (options?.timeout) this.#timeout = options.timeout;
  }

  newMessage(data: Transferable<ExtraTransferable>): void {
    if (!isMessage(data)) throw new Error("data needs to contain a id [number] and a request or response");
    if ("request" in data) return this.#handleRequest(data);
    this.#handleResponse(data);
  }

  #handleResponse(data: ResponseMessage<ExtraTransferable> | ErrorResponseMessage): void {
    const id = data.id;
    const resolveRequest = this.#pendingRequests.get(id);
    if (resolveRequest === undefined) return this.#handleError(new Error("Response with invalid id: " + id));
    if ("errorResponse" in data) return resolveRequest.error(new RequestError(data.errorResponse));
    return resolveRequest.success(data.response);
  }

  #handleRequest(data: RequestMessage<ExtraTransferable>): void {
    if (this.#closed) return this.#handleError(new Error("Connection is already closed"));
    const id = data.id;
    if (!this.#requestHandler) {
      this.#sendMessage({ id, errorResponse: "Remote has no requestHandler set" }).catch(this.#handleError);
      return this.#handleError(new Error("requestHandler is not set"));
    }
    this.#requestHandler(data.request).then((response) => {
      this.#sendMessage({ id, response }).catch(this.#handleError);
    }).catch((error) => {
      this.#sendMessage({ id, errorResponse: "Remote requestHandler threw: " + error }).catch(this.#handleError);
      return this.#handleError(error);
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

  async request(request: Transferable<ExtraTransferable>): Promise<Transferable<ExtraTransferable>> {
    this.#checkClosed();
    return await new Promise((res, rej) => {
      const id = this.#nextRequestId();
      if (this.#pendingRequests.has(id)) throw new Error("Request with id still Pending (Reduce Timeout)");
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

  setRequestHandler(requestHandler: RequestHandlerFunction<ExtraTransferable>): void {
    this.#requestHandler = requestHandler;
  }

  setDisconnectedHandler(disconnected: DisconnectedHandler): void {
    this.#disconnectedHandler = disconnected;
  }

  #nextRequestId(): number {
    do {
      this.#lastRequestId = this.#lastRequestId + 1;
      if (this.#lastRequestId >= Number.MAX_SAFE_INTEGER) {
        this.#lastRequestId = Number.MIN_SAFE_INTEGER;
      }
    } while (this.#pendingRequests.has(this.#lastRequestId));
    return this.#lastRequestId;
  }

  #checkClosed(): void {
    if (this.#closed) throw new Error("Connection is already closed.");
  }

}


