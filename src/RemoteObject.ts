
type Primitives = string | number | boolean | null | undefined | void | bigint | symbol;

type RemotePrimitiveSettable<T extends Primitives> = PromiseLike<T> & {
  set(value: T): PromiseLike<void>;
};

type RemotePrimitiveReadonly<T extends Primitives> = PromiseLike<T> & {
  set(value: T): PromiseLike<void>;
};

type RemoteObj<T extends {}> = {
  [K in keyof T as K]: Remote<T[K]>;
};

export type Local<T> =
  T extends Primitives ? T :
  T extends Remote<infer R> ? R :
  never;

type RemoteFunctionParameters<T> = { [K in keyof T]: Local<T[K]> };

type RemoteReturnType<T> =
  T extends Primitives ? RemotePrimitiveReadonly<T> :
  Remote<T>;

type RemoteFunction<T extends (...args: any[]) => any> =
  T extends (...args: infer Parameters) => infer ReturnType ? (
    Parameters extends (Primitives | Remote<infer _>)[] ? (...args: RemoteFunctionParameters<Parameters>) => RemoteReturnType<ReturnType> :
    never) :
  never;

type RemoteConstructor<T extends new () => any> =
  T extends new (...args: infer Parameters) => infer ReturnType ? (
    Parameters extends (Primitives | Remote<infer _>)[] ? new (...args: RemoteFunctionParameters<Parameters>) => RemoteReturnType<ReturnType> :
    never) :
  never;

export type RemoteObjectAble = {} | ((...args: any[]) => any) | (new (...args: any[]) => any);

export type RemoteObject<T extends RemoteObjectAble> =
  T extends new (...args: any[]) => any ? RemoteConstructor<T> :
  T extends (...args: any[]) => any ? RemoteFunction<T> :
  T extends {} ? RemoteObj<T> :
  never;


export type Remote<T> =
  T extends new (...args: any[]) => any ? RemoteConstructor<T> :
  T extends (...args: any[]) => any ? RemoteFunction<T> :
  T extends Primitives ? RemotePrimitiveSettable<T> :
  T extends {} ? RemoteObj<T> :
  never;

export type RequestFunction = (proxy: RemoteProxyData) => Promise<unknown>;
export type RemoteObjectDescription = {
  isFunction: boolean;
  ownKeys: (string | symbol)[];
  hasKeys: (string | symbol)[];
  prototype: {} | null;
};
export type RemoteObjectData = RemoteObjectDescription & {
  request: RequestFunction;
};

export type GetPathSegment = { type: "get", name: string | symbol; };
export type SetPathSegment = { type: "set", name: string | symbol; value: unknown; };
export type CallPathSegment = { type: "call", args: unknown[]; };
export type NewPathSegment = { type: "new", args: unknown[]; };
export type PathSegment = GetPathSegment | SetPathSegment | CallPathSegment | NewPathSegment;
export type ProxyPath = PathSegment[];
export type RemoteProxyData = {
  root: RemoteObjectData;
  path: ProxyPath;
};

const SymbolProxyData: unique symbol = Symbol();

export function getProxyData(o: unknown): RemoteProxyData | undefined {
  if ((typeof o === "function" || typeof o === "object") && (o !== null) && (typeof (<{ [SymbolProxyData]?: RemoteProxyData; }>o)[SymbolProxyData] === "object")) return (<{ [SymbolProxyData]?: RemoteProxyData; }>o)[SymbolProxyData];
  return undefined;
}

function appendProxyPath(data: RemoteProxyData, segment: PathSegment): RemoteProxyData {
  if (segment.type === "set") {
    const last = data.path.at(-1);
    if (last === undefined) throw new TypeError("Cannot write to a RemoteObject or Return Value. Only properties can be set.");
    if (last.type !== "get") throw new TypeError("Cannot write to a RemoteObject or Return Value. Only properties can be set.");
    const path = data.path.slice(0, -1);
    path.push({ type: "set", name: last.name, value: segment.value });
    return {
      root: data.root,
      path,
    };
  }
  return {
    root: data.root,
    path: [...data.path, segment],
  };
}

function makeProxyHandlers<T extends RemoteObjectAble>(data: RemoteProxyData, additionalHandlers: ProxyHandler<RemoteObject<T>> = {}): ProxyHandler<RemoteObject<T>> {
  const handler: ProxyHandler<RemoteObject<T>> = {
    ...UnsupportedHandlers,
    get(_target: unknown, name: string | symbol, _receiver: unknown) {
      if (name === SymbolProxyData) return data;
      if (name === "then") return (onfulfilled: () => unknown, onrejected: () => unknown) => {
        data.root.request(data).then(onfulfilled, onrejected);
      };
      if (name === "set") return (value: unknown) => data.root.request(appendProxyPath(data, { type: "set", name, value }));
      return createRemoteProxy(appendProxyPath(data, { type: "get", name }));
    },
    apply(_target: unknown, _thisArg: unknown, args: unknown[]) {
      return createRemoteProxy(appendProxyPath(data, { type: "call", args }));
    },
    construct(_target: unknown, args: unknown[], _newTarget: unknown) {
      return createRemoteProxy(appendProxyPath(data, { type: "new", args }));
    },
    ...additionalHandlers
  };
  return handler;
}

function createRemoteProxy<T>(data: RemoteProxyData): Remote<T> {
  return <Remote<T>>new Proxy(new Function(), makeProxyHandlers(data));
}

/**
 * Creates a Object with Proxies wich tries to mimic the described Object.
 * reading, writing, calling and constructing is Supported at any level.
 * has, ownKeys and getPrototypeOf is only supported at top level.
 * @param description - description of the Object to mimic generated by getDescription.
 * @returns a Proxy Object.
 */
export function createRemoteObject<T extends RemoteObjectAble>(description: RemoteObjectDescription, request: RequestFunction): RemoteObject<T> {
  const data: RemoteProxyData = { root: { ...description, request }, path: [] };
  return <RemoteObject<T>>new Proxy(data.root.isFunction ? new Function() : {}, makeProxyHandlers(data, {
    getPrototypeOf(_target: unknown) {
      return data.root.prototype;
    },
    has(_target: unknown, property: string | symbol) {
      if (data.root.ownKeys.includes(property)) return true;
      if (data.root.hasKeys.includes(property)) return true;
      if (data.root.prototype === null) return false;
      return property in data.root.prototype;
    },
    ownKeys(_target: unknown) {
      return [...data.root.ownKeys];
    },
  }));
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

export type ObjectDescriptionPrototype = "none" | "keysOnly" | "full";
export function getObjectDescription(object: {}, prototype: ObjectDescriptionPrototype = "full"): RemoteObjectDescription {
  return {
    isFunction: typeof object === "function",
    ownKeys: Reflect.ownKeys(object),
    hasKeys: prototype === "keysOnly" ? getAllKeys(object) : [],
    prototype: prototype === "full" ? Reflect.getPrototypeOf(object) : null,
  };
}

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