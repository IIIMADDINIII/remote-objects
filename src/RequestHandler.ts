import EventEmitter from "events";
import type TypedEventEmitter from "typed-emitter";
import type { DisconnectedHandler, MessageHandlerInterface, RequestHandlerFunction, RequestHandlerInterface, Transferable } from "./Interfaces.js";
import "./declarations.js";
import { testable } from "./util.js";

/**
 * Structure of an Request.
 */
type RequestMessage = {
  id: number;
  request: Transferable;
};

/**
 * Structure of a successful Response.
 */
type ResponseMessage = {
  id: number;
  response: Transferable;
};

/**
 * Structure of a Error Response.
 */
type ErrorResponseMessage = {
  id: number;
  errorResponse: string;
};

/**
 * All possible Message types.
 */
type Message = RequestMessage | ResponseMessage | ErrorResponseMessage;

/**
 * Datatype to store the callbacks wich need to be called when the Response is Processed.
 */
type ResolveRequest = {
  success: (data: Transferable) => void;
  error: (error: unknown) => void;
};

/**
 * Checks if the incoming data is a valid message.
 * @param data - the Data which is checked.
 * @returns wether it is a valid message.
 */
function isMessage(data: Transferable): data is Message {
  if (typeof data !== "object" || data === null) return false;
  if (!("id" in data) || typeof data["id"] !== "number") return false;
  return ("request" in data) || ("response" in data) || ("errorResponse" in data);
}

/**
 * Error Class which is used if an Timeout happens.
 * @public
 */
export class TimeoutError extends Error { }
/**
 * Error Class which is used if the remote requestHandler thew an Error.
 * @public
 */
export class RequestError extends Error { }

/**
 * Events for the RequestHandler Class.
 */
type RequestHandlerEvents = {
  error(error: Error): void;
};

/**
 * Base EventEmitter Class to make EventEmitter typeSafe.
 */
const RequestHandlerBase = EventEmitter as new () => TypedEventEmitter<RequestHandlerEvents>;

/**
 * A Implementation of an Request Handler to use with message channels like postMessage or Websockets.
 * @public
 */
export class RequestHandler extends RequestHandlerBase implements RequestHandlerInterface {
  #messageHandler: MessageHandlerInterface;
  #requestHandler: RequestHandlerFunction | undefined;
  #disconnectedHandler: DisconnectedHandler | undefined;
  #timeout: number;
  #closed: boolean = false;
  @testable
  #lastRequestId: number = 0;
  #pendingRequests: Map<number, ResolveRequest> = new Map();

  /**
   * Creates a new RequestHandler to be used with the ObjectStore.
   * @param messageHandler - Interface describing a Message channel (like postMessage or Websockets).
   * @param timeout - Time in milliseconds after which a request is canceled with an TimeoutError (default = 10000).
   */
  constructor(messageHandler: MessageHandlerInterface, timeout: number = 10000) {
    super();
    this.#messageHandler = messageHandler;
    this.newMessageHandler = this.newMessageHandler.bind(this);
    if (messageHandler.setNewMessageHandler) messageHandler.setNewMessageHandler(this.newMessageHandler);
    this.disconnectedHandler = this.disconnectedHandler.bind(this);
    if (messageHandler.setDisconnectedHandler) messageHandler.setDisconnectedHandler(this.disconnectedHandler);
    this.#timeout = timeout;
  }

  /**
  * This function should be invoked for every request to the Remote.
  * As a result the requestHandler function on the Remote RequestHandler is invoked with this request Value.
  * The return value of the requestHandler is returned by this function asynchronously.
  * @param request - the request information to send to Remote (JSON Compatible).
  * @returns a Promise containing the response of the Request (JSON Compatible).
  */
  async request(request: Transferable): Promise<Transferable> {
    this.#checkClosed();
    const id = this.#nextRequestId();
    return await new Promise((res, rej) => {
      // Timeout Request
      const timer = setTimeout(() => {
        cleanup();
        return rej(new TimeoutError("Request Timeout reached"));
      }, this.#timeout);
      // Called when done Successfully
      const success = (response: Transferable) => {
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
      const data: RequestMessage = { id, request };
      this.#messageHandler.sendMessage(data).catch(error);
    });
  };

  /**
   * This function should be called for every Message received from remote.
   * @param data - the data wich was received from remote.
   */
  newMessageHandler(data: Transferable): void {
    if (!isMessage(data)) throw new Error("data needs to contain a id [number] and a request, response or errorResponse");
    if ("request" in data) return this.#handleRequest(data);
    this.#handleResponse(data);
  }

  /**
   * This function should be called if the connection to the remote is lost (for cleanup).
   * Also this will be called, if the ObjectStore.close is called.
   */
  disconnectedHandler(): void {
    this.close();
  };

  /**
   * Call this to Close the Connection.
   * Also Calls to the disconnectHandler on the ObjectStore and MessageHandler.
   */
  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    for (const request of this.#pendingRequests.values()) {
      request.error(new RequestError("Connection was Closed"));
    }
    this.#pendingRequests.clear();
    if (this.#disconnectedHandler) this.#disconnectedHandler();
    if (this.#messageHandler.disconnectedHandler) this.#messageHandler.disconnectedHandler();
  };

  /**
    * The ObjectStore will call this function with the requestHandler function in its constructor if it is defined.
    * @param requestHandler - the requestHandler function which should be called for every incoming request.
    */
  setRequestHandler(requestHandler: RequestHandlerFunction): void {
    this.#requestHandler = requestHandler;
  };

  /**
   * The ObjectStore will call this function with the disconnectedHandler function in its constructor if it is defined.
   * @param disconnectedHandler - the disconnectedHandler function wich should be called if the connection to the remote is lost (for cleanup).
   */
  setDisconnectedHandler(disconnectedHandler: DisconnectedHandler): void {
    this.#disconnectedHandler = disconnectedHandler;
  };

  /**
   * Handles a Request message received from Remote.
   * @param data - the Data received from Remote.
   */
  #handleRequest(data: RequestMessage): void {
    if (this.#closed) return this.emit("error", new Error("Connection is already closed")), void 0;
    const id = data.id;
    if (!this.#requestHandler) {
      this.#messageHandler.sendMessage({ id, errorResponse: "Remote has no requestHandler set" }).catch((error) => this.emit("error", error));
      return this.emit("error", new Error("requestHandler is not set")), void 0;
    }
    this.#requestHandler(data.request).then((response) => {
      this.#messageHandler.sendMessage({ id, response }).catch((error) => this.emit("error", error));
    }).catch((error) => {
      this.#messageHandler.sendMessage({ id, errorResponse: "Remote requestHandler threw: " + error }).catch((error) => this.emit("error", error));
      return this.emit("error", error), void 0;
    });
  }

  /**
   * Handles a Response message received from Remote.
   * @param data - the Data received from Remote.
   */
  #handleResponse(data: ResponseMessage | ErrorResponseMessage): void {
    if (this.#closed) return this.emit("error", new Error("Connection is already closed")), void 0;
    const id = data.id;
    const resolveRequest = this.#pendingRequests.get(id);
    if (resolveRequest === undefined) return this.emit("error", new Error("Response with invalid id (maybe from timeout): " + id)), void 0;
    if ("errorResponse" in data) return resolveRequest.error(new RequestError(data.errorResponse));
    return resolveRequest.success(data.response);
  }

  /**
   * Generates a new number as Request ID to link the Response Message to the Request.
   * @returns a number wich is not used by any pending requests.
   */
  #nextRequestId(): number {
    do {
      this.#lastRequestId = this.#lastRequestId + 1;
      if (this.#lastRequestId >= Number.MAX_SAFE_INTEGER) {
        this.#lastRequestId = Number.MIN_SAFE_INTEGER;
      }
      if (!this.#pendingRequests.has(this.#lastRequestId)) {
        return this.#lastRequestId;
      }
    } while (true);
  }

  /**
   * Throws an Error if the Connection is already Closed.
   */
  #checkClosed(): void {
    if (this.#closed) throw new Error("Connection is already closed.");
  }

}


