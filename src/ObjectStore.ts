import type { RequestHandlerInterface, Transferable } from "./Interfaces.js";
import type { CreateValue, ErrorDescription, GetValueDescription, MayHaveSymbol, NullDescription, ObjectDescription, ObjectStoreOptions, PathSegment, RemoteDataDescription, RemoteId, RemoteObject, RemoteObjectAble, SymbolDescription, UndefinedDescription, ValueDescription } from "./types.js";

/**
 * Class to handle object Caching and Translation of ObjectDescriptions to RemoteObjects.
 * @public
 */
export class ObjectStore {
  #requestHandler: RequestHandlerInterface;
  #closed: boolean = false;
  #localObjects: Map<RemoteId, object | symbol> = new Map();
  #localObjectsId: WeakMap<object | symbol, ObjectDescription | SymbolDescription> = new WeakMap();
  #remoteObjects: Map<RemoteId, WeakRef<object | symbol>> = new Map();
  #keepStringIds: Map<RemoteId, object | symbol> = new Map();
  #options: Required<ObjectStoreOptions>;
  #finalizationReg: FinalizationRegistry<RemoteId>;
  #objectsToClean: Set<RemoteId> = new Set();
  #lastRemoteId: number = 0;
  #symbolProxyData = Symbol();

  /**
   * Creates a new ObjectStore.
   * @param requestHandler - Interface describing a RequestHandler.
   * @param options - Options on how the ObjectStore should operate (options should be the same for remote).
   */
  constructor(requestHandler: RequestHandlerInterface, options: ObjectStoreOptions = {}) {
    this.#options = {
      remoteObjectPrototype: "full",
      remoteError: "newError",
      ...options
    };
    this.#requestHandler = requestHandler;
    this.requestHandler = this.requestHandler.bind(this);
    if (requestHandler.setRequestHandler) requestHandler.setRequestHandler(this.requestHandler);
    this.disconnectedHandler = this.disconnectedHandler.bind(this);
    if (requestHandler.setDisconnectedHandler) requestHandler.setDisconnectedHandler(this.disconnectedHandler);
    this.#finalizationReg = new FinalizationRegistry((id: RemoteId) => {
      this.#cleanupObject(id);
    });
  }

  /**
   * Stores a object or function to be used by the remote.
   * @param id - a string with wich the remote can request this object.
   * @param object - Object or function to share with remote.
   * @public
   */
  exposeRemoteObject(id: string, object: RemoteObjectAble): void {
    if (this.#localObjects.has(id)) throw new Error(`Remote Object with id ${id} is already exposed.`);
    const description = this.#getObjectDescription(object, id);
    this.#localObjectsId.set(object, description);
    this.#localObjects.set(description.id, object);
  }

  /**
   * Will get the description of an Object from Remote and returns a local Proxy wich represents this Object.
   * Will request the metadata of the object from remote the first time for every id.
   * Use this method if you need to use 'key in object', 'object instanceof class', 'Object.keys(object)' or similar.
   * Use getRemoteProxy if you don't need to use these operations because it does not need to request data from remote.
   * @param id - id of the object or function to request.
   * @returns a Promise resolving to a Proxy wich represents this object.
   * @public
   */
  async getRemoteObject<T extends RemoteObjectAble>(id: string): Promise<RemoteObject<T>> {
    const ro = this.#keepStringIds.get(id);
    if (ro !== undefined) return <RemoteObject<T>>ro;
    return <RemoteObject<T>>await this.#requestValue({ type: "remote", root: id, path: [] });
  };

  /**
   * Will return a local Proxy wich represents this Object.
   * This does not Request any data from remote.
   * This will initially succeed, even if the id is not exposed on remote (will only fail on the first request to remote).
   * Use getRemoteObject if you need to use 'key in object', 'object instanceof class', 'Object.keys(object)' or similar.
   * @param id - id of the object or function to request.
   * @returns a Proxy wich represents this object.
   * @public
   */
  getRemoteProxy<T extends RemoteObjectAble>(id: string): RemoteObject<T> {
    return <RemoteObject<T>>this.#createRemoteProxy({ type: "remote", root: id, path: [] });
  }

  /**
   * This function should be called for every Message received from remote.
   * This will call the newMessageHandler on the RequestHandler if defined.
   * @param data - the data wich was received from remote.
   * @public
   */
  newMessage(data: Transferable): void {
    if (!this.#requestHandler.newMessageHandler) throw new Error("Function is not Implemented by requestHandler");
    return this.#requestHandler.newMessageHandler(data);
  };

  /**
   * This function should be called if the connection to the remote is lost (for cleanup).
   */
  disconnectedHandler(): void {
    this.close();
  };

  /**
   * Call this to Close the Connection.
   * Also Calls to the disconnectHandler on the RequestHandler.
   */
  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    if (this.#requestHandler.disconnectedHandler) this.#requestHandler.disconnectedHandler();
  };

  /**
   * This function should be invoked for every request to the Remote.
   * It needs to be called with the data of the Remote ObjectStore.
   * The return value should be returned to the Remote ObjectStore.
   * @param request - the request information from Remote (JSON Compatible).
   * @returns a Promise containing the response for the Request to send to Remote (JSON Compatible).
   */
  requestHandler(_request: Transferable): Promise<Transferable> {
    this.#checkClosed();
    throw new Error("Method not implemented.");
  };

  /**
   * Whenever an object or symbol is shared with remote it needs to be stored locally with an id to access it later.
   * Also if the object is already stored, we can use the cached description.
   * @param value - the value for wich the description needs to be cached.
   * @param generate - callback to generate the description if it was not cached.
   * @returns the Description of the object to send to Remote.
   */
  #cacheDescription(value: object | symbol, generate: (id: RemoteId) => ObjectDescription | SymbolDescription): ObjectDescription | SymbolDescription {
    const cached = this.#localObjectsId.get(value);
    if (cached !== undefined) return cached;
    const id = this.#nextRemoteId();
    const description = generate(id);
    this.#localObjectsId.set(value, description);
    this.#localObjects.set(description.id, value);
    return description;
  }

  /**
   * We want to return the same proxy object or symbol whenever we get an object with the same id.
   * @param id - id of the object or symbol to return.
   * @param generate - callback to generate the value if it was not cached.
   * @returns object or symbol for this id.
   */
  #cacheValue(id: RemoteId, generate: () => object | symbol): object | symbol {
    const cached = this.#remoteObjects.get(id);
    if (cached !== undefined) {
      const value = cached.deref();
      if (value !== undefined) return value;
      this.#cleanupObject(id);
    }
    const value = generate();
    this.#remoteObjects.set(id, new WeakRef(value));
    if (typeof id === "string") { this.#keepStringIds.set(id, value); }
    else { this.#finalizationReg.register(value, id); }
    return value;
  }

  /**
   * Request a Value from remote.
   * @param request - the description on how to get this data (description of properties and function calls).
   * @returns the value of the requested data.
   */
  async #requestValue(request: RemoteDataDescription): Promise<unknown> {
    return await this.#createValue(<ValueDescription>await this.#requestHandler.request(request));
  };

  /**
   * Called whenever a remote object was garbage collected.
   * Will remove the Objects form cache and remember the id to inform remote later.
   * @param id - the id of the object wich was garbage collected.
   */
  #cleanupObject(id: RemoteId): void {
    if (typeof id === "string") return;
    this.#remoteObjects.delete(id);
    this.#objectsToClean.add(id);
  }














  /**
   * Awaits a Promise and describes the Result.
   * If the Promise rejects the error is described.
   * @param promise - the Promise to await.
   * @returns the Description of the resolved value or rejected Error.
   */
  //@ts-ignore
  async #describePromiseResult(promise: Promise<unknown>): Promise<ValueDescription> {
    try {
      return this.#getValueDescription(await promise);
    } catch (error) {
      if (error instanceof Error) {
        const ret: ErrorDescription = { type: "error", value: this.#getValueDescription(error) };
        if (error.message !== undefined) ret.message = error.message;
        if (error.stack !== undefined) ret.stack = error.stack;
        if (error.name !== undefined) ret.name = error.name;
        return ret;
      }
      return { type: "error", value: this.#getValueDescription(error) };
    }
  }

  /**
   * Generates the Description of a value.
   * @param value - any value wich needs to be described.
   * @returns the Description of that value.
   */
  #getValueDescription<T, R extends GetValueDescription<T> = GetValueDescription<T>>(value: T): R {
    switch (typeof value) {
      case "string": return value as R;
      case "number": return value as R;
      case "boolean": return value as R;
      case "bigint": return { type: "bigint", value: value.toString() } as R;
      case "undefined": return undefinedDescription as R;
      case "symbol": return this.#cacheDescription(value, (id) => ({ type: "symbol", id })) as R;
      case "function":
      case "object":
        if (value === null) return nullDescription as R;
        const proxyData = this.#getProxyData(value);
        if (proxyData !== undefined) return proxyData as R;
        return this.#cacheDescription(value, (id) => this.#getObjectDescription(value, id)) as R;
    }
    throw new Error("Unreachable Code");
  }

  /**
   * Generates a description of a local object.
   * @param object - the Object to describe.
   * @param id - the id for the Object.
   * @returns the Description of the object for sending to Remote.
   */
  #getObjectDescription(object: {}, id: RemoteId): ObjectDescription {
    return {
      id,
      type: typeof object === "function" ? "function" : "object",
      ownKeys: Reflect.ownKeys(object).map((v) => this.#getValueDescription(v)),
      hasKeys: this.#options.remoteObjectPrototype === "keysOnly" ? getAllKeys(object).map((v) => this.#getValueDescription(v)) : [],
      prototype: this.#options.remoteObjectPrototype === "full" ? this.#getValueDescription(Reflect.getPrototypeOf(object)) : nullDescription,
    };
  }

  /**
   * Generated a Value based on its Description.
   * @param description - description of the value to be generated.
   * @returns the value wich should be generated.
   */
  async #createValue<T extends ValueDescription, R extends CreateValue<T> = CreateValue<T>>(description: T): Promise<R> {
    switch (typeof description) {
      case "string": return description as R;
      case "number": return description as R;
      case "boolean": return description as R;
      case "object":
        switch (description.type) {
          case "undefined": return undefined as R;
          case "null": return null as R;
          case "bigint": return BigInt(description.value) as R;
          case "symbol": return this.#cacheValue(description.id, () => Symbol()) as R;
          case "remote": return await this.#resolveRemoteValue(description) as R;
          case "object":
          case "function": return this.#cacheValue(description.id, () => this.#createRemoteObject(description)) as R;
          case "error":
            if (this.#options.remoteError === "remoteObject") throw this.#createValue(description.value);
            throw createError(description, this.#createValue(description.value));
        }
    }
  }

  /**
   * Resolve the local Value with the id of the Root and a Path.
   * @param description - description of the root and the Path.
   * @returns the value wich is computed from the root following the described Path.
   */
  async #resolveRemoteValue(description: RemoteDataDescription): Promise<unknown> {
    const root = this.#localObjects.get(description.root);
    if (root === undefined) throw new Error(`Object with id ${description.root} is unknown`);
    if (typeof root === "symbol") throw new Error(`Object with id ${description.root} is unknown`);
    let parent: any = undefined;
    let value: any = root;
    for (const segment of description.path) {
      switch (segment.type) {
        case "get":
          parent = value;
          value = await value[await this.#createValue(segment.name)];
          break;
        case "set":
          value[await this.#createValue(segment.name)] = await this.#createValue(segment.value);
          parent = undefined;
          value = undefined;
          break;
        case "call":
          parent = undefined;
          value = await value.call(parent, ...await Promise.all(segment.args.map((v) => this.#createValue(v))));
          break;
        case "new":
          parent = undefined;
          value = await new value(...await Promise.all(segment.args.map((v) => this.#createValue(v))));
          break;
      }
    }
    return root;
  }

  /**
   * Creates a new Remote Object based on a description provided by the remote.
   * Allows the use of getPrototypeOf, has and ownKeys if configured by the options.
   * This allows the proxy to be used in situations like ```key in object```, ```object instanceof class```, ```Object.keys(object)``` or similar.
   * @param description - description of the remote Object.
   * @returns a Proxy Object representing the remote Object.
   */
  async #createRemoteObject<T extends RemoteObjectAble>(description: ObjectDescription): Promise<RemoteObject<T>> {
    const data: RemoteDataDescription = {
      type: "remote",
      root: description.id,
      path: [],
    };
    const type = description.type;
    const ownKeys = await Promise.all(description.ownKeys.map((v) => this.#createValue(v)));
    const hasKeys = await Promise.all(description.hasKeys.map((v) => this.#createValue(v)));
    const prototype = await this.#createValue(description.prototype);
    return this.#createRemoteProxy<T>(data, type === "function" ? new Function() : {}, {
      getPrototypeOf(_target: unknown) {
        return prototype;
      },
      has(_target: unknown, property: string | symbol) {
        if (ownKeys.includes(property)) return true;
        if (hasKeys.includes(property)) return true;
        if (prototype === null) return false;
        return property in prototype;
      },
      ownKeys(_target: unknown) {
        return [...ownKeys];
      },
    });
  }

  /**
   * Generates a new Proxy Object without any description.
   * Does not Support getPrototypeOf, has and ownKeys.
   * If these need to be used the Proxy needs to be awaited first to request this information from remote.
   * It will create new Proxies for property accesses, function calls, constructions and set calls.
   * A Request to the remote is only trigged if a value is awaited (a call to then) or the set Method is called.
   * Even Function calls are only trigged when their result is awaited.
   * @param data - Internal data of the Proxy to be created.
   * @param base - target object to be used with the Proxy (default = new Function()).
   * @param additionalHandlers - extra handlers to provide extra functionality to the Proxy. 
   * @returns a Proxy Object representing the remote Object.
   */
  #createRemoteProxy<T extends RemoteObjectAble>(data: RemoteDataDescription, base: {} = new Function(), additionalHandlers: ProxyHandler<RemoteObject<T>> = {}): RemoteObject<T> {
    const handler: ProxyHandler<RemoteObject<T>> = {
      get: (_target: unknown, name: string | symbol, _receiver: unknown) => {
        if (name === this.#symbolProxyData) return data;
        if (name === "then") return (onfulfilled: () => void, onrejected: () => void) => {
          this.#requestValue(data).then(onfulfilled, onrejected);
        };
        if (name === "set") return async (value: unknown) => await this.#requestValue(appendProxyPath(data, { type: "set", name, value: this.#getValueDescription(value) }));
        return this.#createRemoteProxy(appendProxyPath(data, { type: "get", name: this.#getValueDescription(name) }));
      },
      apply: (_target: unknown, _thisArg: unknown, args: unknown[]) => {
        return this.#createRemoteProxy(appendProxyPath(data, { type: "call", args: args.map((v) => this.#getValueDescription(v)) }));
      },
      construct: (_target: unknown, args: unknown[], _newTarget: unknown) => {
        return this.#createRemoteProxy(appendProxyPath(data, { type: "new", args: args.map((v) => this.#getValueDescription(v)) }));
      },
      ...additionalHandlers
    };
    Object.setPrototypeOf(handler, UnsupportedHandlers);
    return <RemoteObject<T>>new Proxy(base, handler);
  }

  /**
   * Returns the internal data of the Proxy if value is a Proxy.
   * @param value - any value which is maybe an Proxy.
   * @returns the internal Data of the Proxy or undefined if value is not a Proxy.
   */
  #getProxyData(value: unknown): RemoteDataDescription | undefined {
    if (typeof value !== "function" && typeof value !== "object") return undefined;
    if (value === null) return undefined;
    const d = <MayHaveSymbol<RemoteDataDescription>>value;
    if (typeof d[this.#symbolProxyData] === "object") return undefined;
    return d[this.#symbolProxyData];
  }

  /**
   * Generates a new number as RemoteId to uniquely identify an object.
   * @returns a number wich is not used by any other objects.
   */
  #nextRemoteId(): number {
    do {
      this.#lastRemoteId = this.#lastRemoteId + 1;
      if (this.#lastRemoteId >= Number.MAX_SAFE_INTEGER) {
        this.#lastRemoteId = Number.MIN_SAFE_INTEGER;
      }
      if (!this.#localObjects.has(this.#lastRemoteId)) {
        return this.#lastRemoteId;
      }
    } while (true);
  }

  /**
   * throws an Error if the Connection is already closed.
   */
  #checkClosed() {
    if (this.#closed) throw new Error("Connection is already closed.");
  }

}

function appendProxyPath(data: RemoteDataDescription, segment: PathSegment): RemoteDataDescription {
  if (segment.type === "set") {
    const last = data.path.at(-1);
    if (last === undefined) throw new TypeError("Cannot write to a RemoteObject or Return Value. Only properties can be set.");
    if (last.type !== "get") throw new TypeError("Cannot write to a RemoteObject or Return Value. Only properties can be set.");
    const path = data.path.slice(0, -1);
    path.push({ type: "set", name: last.name, value: segment.value });
    return {
      type: "remote",
      root: data.root,
      path,
    };
  }
  return {
    type: "remote",
    root: data.root,
    path: [...data.path, segment],
  };
}

function getAllKeys(object: {}): (string | symbol)[] {
  const ret: Set<string | symbol> = new Set();
  let o: {} | null = object;
  while (o !== null) {
    for (const key of Reflect.ownKeys(o)) {
      ret.add(key);
    }
    o = Reflect.getPrototypeOf(o);
  }
  return [...ret.values()];
}

function createError(description: ErrorDescription, cause: unknown): unknown {
  if (description.message === undefined && description.stack === undefined && description.name === undefined) return cause;
  const message = description.message || "Remote Error";
  const error = new Error(message, { cause });
  if (description.name !== undefined) {
    if (error.stack !== undefined && error.stack.startsWith(error.name)) error.stack = description.name + error.stack.slice(error.name.length);
    error.name = description.name;
  }
  if (description.stack !== undefined) {
    if (error.stack === undefined) {
      error.stack = "Remote Stacktrace:\n" + description.stack;
    } else {
      error.stack += "\n\nRemote Stacktrace:\n" + description.stack;
    }
  }
  Object.setPrototypeOf(error, Object.getPrototypeOf(cause));
  return error;
}

const undefinedDescription: UndefinedDescription = { type: "undefined" };
const nullDescription: NullDescription = { type: "null" };
// Base Definition for unsupported Handlers
const UnsupportedHandlers: ProxyHandler<{}> = {
  getPrototypeOf(_target: unknown) {
    throw new TypeError("getPrototypeOf is currently not Supported by RemoteObject");
  },
  has(_target: unknown, _property: string | symbol) {
    throw new TypeError("has is currently not Supported by RemoteObject");
  },
  ownKeys(_target: unknown) {
    throw new TypeError("ownKeys is currently not Supported by RemoteObject");
  },
  defineProperty(_target: unknown, _property: string | symbol, _attributes: PropertyDescriptor) {
    return false;
  },
  deleteProperty(_target: unknown, _property: string | symbol) {
    return false;
  },
  getOwnPropertyDescriptor(_target: unknown, _property: string | symbol) {
    throw new TypeError("getOwnPropertyDescriptor is currently not Supported by RemoteObject");
  },
  isExtensible(_target: unknown) {
    throw new TypeError("isExtensible is not Supported by RemoteObject");
  },
  preventExtensions(_target: unknown) {
    return false;
  },
  set(_target: unknown, _property: string | symbol, _newValue: unknown, _receiver: unknown): boolean {
    return false;
  },
  setPrototypeOf(_target: unknown, _prototype: object | null): boolean {
    return false;
  },
};