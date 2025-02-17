import type { MessageHandlerInterface } from "./Interfaces.js";
import { ObjectStore } from "./ObjectStore.js";
import { RequestHandler } from "./RequestHandler.js";
import type { ObjectStoreOptions } from "./types.js";

/**
 * Options on how to create a ObjectsStore with the Default RequestHandler
 * @public
 */
export interface CreateObjectStoreOptions extends MessageHandlerInterface, ObjectStoreOptions {
  /**
   * Time in milliseconds after which a request is canceled with an TimeoutError.
   * @default 10000
   */
  timeout?: number;
}

/**
 * Creates a new ObjectStore with a new RequestHandler.
 * @param options - Options on how to create the ObjectStore and RequestHandler.
 * @returns a new ObjectStore.
 * @public
 */
export function createObjectStore(options: CreateObjectStoreOptions): ObjectStore {
  let requestHandler = new RequestHandler(options, options.timeout);
  let objectStore = new ObjectStore(requestHandler, options);
  return objectStore;
}

export { RequestError, RequestHandler, TimeoutError } from "./RequestHandler.js";

export { isProxy, ObjectStore } from "./ObjectStore.js";

export type {
  DisconnectedHandler,
  MessageHandlerInterface,
  NewMessageHandler,
  RequestHandlerFunction,
  RequestHandlerInterface,
  SendMessageFunction,
  Transferable
} from "./Interfaces.js";

export type {
  Local,
  LocalConstructor,
  LocalFunction,
  ObjectStoreOptions,
  Primitives,
  Remote,
  RemoteConstructor,
  RemoteConstructorPromise,
  RemoteError,
  RemoteFunction,
  RemoteFunctionParameters,
  RemoteFunctionPromise,
  RemoteObj,
  RemoteObject,
  RemoteObjectAble,
  RemoteObjectPrototype,
  RemoteObjPromise,
  RemotePrimitiveReadonly,
  RemotePrimitiveSettable,
  RemoteReturnType
} from "./types.js";



