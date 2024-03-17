





type Primitives = string | number | boolean | null | undefined | void;

type RemotePrimitive<T extends Primitives> = PromiseLike<T> & {
  set(value: T): PromiseLike<void>;
};

type RemoteObject<T extends {}> = {
  [K in keyof T as K]: Remote<T[K]>;
};

export type Local<T> =
  T extends Primitives ? T :
  T extends Remote<infer R> ? R :
  never;

type RemoteFunctionParameters<T> = { [K in keyof T]: Local<T[K]> };

type RemoteFunction<T extends (...args: any[]) => any> =
  T extends (...args: infer Parameters) => any ? (
    Parameters extends (Primitives | Remote<infer _>)[] ? (...args: RemoteFunctionParameters<Parameters>) => Remote<ReturnType<T>> :
    never) :
  never;

export type Remote<T> =
  T extends symbol ? never :
  T extends bigint ? never :
  T extends (...args: any[]) => any ? RemoteFunction<T> :
  T extends Primitives ? RemotePrimitive<T> :
  T extends {} ? RemoteObject<T> :
  never;


type ObjectId = number;

type AwaitPathProperty = { type: "prop", name: string; };
type AwaitPathCall = { type: "call", name: string; args: unknown[]; };
type AwaitPathSegment = AwaitPathProperty | AwaitPathCall;
type AwaitPath = AwaitPathSegment[];

export type RequestFunction = (rootObject: ObjectId, awaitPath: AwaitPath) => Promise<unknown>;

type ProxyInterface = {
  rootObject: ObjectId;
  awaitPath: AwaitPath;
  request: RequestFunction;
};


export function createProxy<T>(param: ProxyInterface): Remote<T> {
  return <Remote<T>>new Proxy(<Remote<T>>function () { }, {
    get(_target: unknown, property: string | symbol, _receiver: unknown) {
      if (property === "then") return (onfulfilled: () => void, onrejected: () => void) => {
        param.request(param.rootObject, param.awaitPath).then(onfulfilled, onrejected);
      };
      if (typeof property === "symbol") throw new TypeError("symbol key is currently not Supported by RemoteObject");
      return createProxy({ ...param, awaitPath: [...param.awaitPath, { type: "prop", name: property }] });
    },
    // ToDo: Implement Logic to create a call Chain
    apply(_target: unknown, _thisArg: unknown, _argArray: unknown[]) {
      return undefined;
    },
    // Handlers wich currently are not supported
    construct(_target: unknown, _argArray: unknown[], _newTarget: Function) {
      throw new TypeError("construct is currently not Supported by RemoteObject");
    },
    getPrototypeOf(_target: unknown) {
      throw new TypeError("getPrototypeOf is currently not Supported by RemoteObject");
    },
    has(_target: unknown, _property: string | symbol) {
      throw new TypeError("has is currently not Supported by RemoteObject");
    },
    ownKeys(_target: unknown) {
      throw new TypeError("ownKeys is currently not Supported by RemoteObject");
    },
    // Handlers wich will properly never be supported
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
  });
}

