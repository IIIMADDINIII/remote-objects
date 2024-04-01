
/**
 * How to represent the prototype of RemoteObjects.
 *  - "full": 
 *      Represent the prototype with an other RemoteObject so instanceof and getPrototypeOf will work.
 *  - "keysOnly": 
 *      Lists all the keys in the prototype chain so "key" in RemoteObject will work but the getPrototypeOf will return null (instanceof does not work).
 *  - "none": 
 *      The prototype of RemoteObjects is always null amd only ownKeys are represented.
 * @default "full"
 * @public
 */
export type RemoteObjectPrototype = "none" | "keysOnly" | "full";

/**
 * Defines how Errors should be represented on the Remote.
 * It only applies if the Thrown value was an instance of Error and if it was part of the Rejected error.
 *  - "newError":
 *      Creates a new Error including the message, stack and name of the original error. 
 *      If you define more fields on the error directly, they are not present on the Remote Error.
 *      Instead use the field cause which has the RemoteObject of the original error. 
 *      Instanceof should work as well, when the remote class is used (local Error class !== remote Error class).
 *  - "remoteObject": 
 *      Directly throws with the RemoteObject. Await needs to be used to access message and other properties. Dosen't capture local stacktrace.
 * @default "newError"
 * @public
 */
export type RemoteError = "remoteObject" | "newError";

/**
 * Options for creating a remote Object Store.
 * @public
 */
export interface ObjectStoreOptions {
  /**
   * How to represent the prototype of RemoteObjects.
   *  - "full": 
   *      Represent the prototype with an other RemoteObject so instanceof and getPrototypeOf will work.
   *  - "keysOnly": 
   *      Lists all the keys in the prototype chain so "key" in RemoteObject will work but the getPrototypeOf will return null (instanceof does not work).
   *  - "none": 
   *      The prototype of RemoteObjects is always null amd only ownKeys are represented.
   * @default "full"
   */
  remoteObjectPrototype?: RemoteObjectPrototype;
  /**
   * Defines how Errors should be represented on the Remote.
   * It only applies if the Thrown value was an instance of Error and if it was part of the Rejected error.
   *  - "newError":
   *      Creates a new Error including the message, stack and name of the original error. 
   *      If you define more fields on the error directly, they are not present on the Remote Error.
   *      Instead use the field cause which has the RemoteObject of the original error. 
   *      Instanceof should work as well, when the remote class is used (local Error class !== remote Error class).
   *  - "remoteObject": 
   *      Directly throws with the RemoteObject. Await needs to be used to access message and other properties. Dosen't capture local stacktrace.
   * @default "newError"
   */
  remoteError?: RemoteError;
  /**
   * Defines that the toString handler should not be implemented by RemoteObjects.
   *  - true:
   *      Will have no special logic for toString, [Symbol.toStringTag] and [Symbol.toPrimitive] Property.
   *      It will return a Promise for these Properties.
   *  - false:
   *      Will return "RemoteObject" for [Symbol.toStringTag].
   *      ToString Property will return Object.prototype.toString.
   *      [Symbol.toPrimitive] will return undefined.
   *      Will not return a Promise for these Properties.
   * @default false
   */
  noToString?: boolean;
}

/**
 * Anything which can be exposed to the Remote.
 * @public
 */
export type RemoteObjectAble = {} | ((...args: any[]) => any) | (new (...args: any[]) => any);

/**
 * Is mapping the any Type from the Remote to how the types are represented locally.
 * @public
 */
export type Remote<T> =
  [T] extends [never] ? RemotePrimitiveReadonly<T> :
  T extends new (...args: any[]) => any ? RemoteConstructorPromise<T> :
  T extends (...args: any[]) => any ? RemoteFunctionPromise<T> :
  T extends Primitives ? RemotePrimitiveSettable<T> :
  T extends {} ? RemoteObjPromise<T> :
  T extends never ? Promise<never> :
  never;

/**
 * Is mapping the RemoteObjectAble from the Remote to how the types are represented locally.
 * @public
 */
export type RemoteObject<T extends RemoteObjectAble> =
  T extends new (...args: any[]) => any ? RemoteConstructorPromise<T> :
  T extends (...args: any[]) => any ? RemoteFunctionPromise<T> :
  T extends {} ? RemoteObjPromise<T> :
  never;

/**
 * Is mapping a Object from the Remote to how the types are represented locally.
 * @public
 */
export type RemoteObj<T extends {}> = {
  [K in keyof T as K]: Remote<T[K]>;
};

/**
 * Makes it possible to await an object.
 * @public
 */
export type RemoteObjPromise<T extends {}> = RemoteObj<T> & Promise<RemoteObj<T>>;

/**
 * Is mapping a Function from the Remote to how the types are represented locally.
 * @public
 */
export type RemoteFunction<T extends (...args: any[]) => any> =
  T extends (...args: infer Parameters) => infer ReturnType ? (...args: RemoteFunctionParameters<Parameters>) => RemoteReturnType<ReturnType> :
  never;

/**
 * Makes it possible to await an function.
 * @public
 */
export type RemoteFunctionPromise<T extends (...args: any[]) => any> = RemoteFunction<T> & Promise<RemoteFunction<T>> | RemoteFunction<T>;

/**
 * Is mapping a Constructor from the Remote to how the types are represented locally.
 * @public
 */
export type RemoteConstructor<T extends new () => any> =
  T extends new (...args: infer Parameters) => infer ReturnType ? new (...args: RemoteFunctionParameters<Parameters>) => RemoteReturnType<ReturnType> :
  never;

/**
 * Makes it possible to await an constructor.
 * @public
 */
export type RemoteConstructorPromise<T extends new () => any> = RemoteConstructor<T> & Promise<RemoteConstructor<T>> | RemoteConstructor<T>;

/**
 * Is mapping the function Parameters Types from the Remote to how the types are represented locally.
 * @public
 */
export type RemoteFunctionParameters<T> = { [K in keyof T]: Local<T[K]> };

/**
 * inverse to Remote<T>.
 * @public
 */
export type Local<T> =
  T extends Primitives ? T :
  T extends (...args: any[]) => any ? LocalFunction<T> :
  T extends new (...args: any[]) => any ? LocalConstructor<T> :
  T extends Remote<infer R> ? R :
  Remote<T>;

/**
 * Helper to convert Function Parameters Properly.
 * @public
 */
export type LocalFunction<T extends (...args: any[]) => any> =
  T extends (...args: infer Parameters) => infer ReturnType ?
  ReturnType extends PromiseLike<infer ReturnType> ? ((...args: RemoteFunctionParameters<Parameters>) => ReturnType | PromiseLike<ReturnType>) | Remote<T> :
  Remote<T> :
  never;

/**
 * Helper to convert Constructor Parameters Properly.
 * @public
 */
export type LocalConstructor<T extends new (...args: any[]) => any> =
  T extends new (...args: infer Parameters) => infer ReturnType ?
  ReturnType extends PromiseLike<infer ReturnType> ? Remote<T> | (new (...args: RemoteFunctionParameters<Parameters>) => ReturnType | PromiseLike<ReturnType>) :
  Remote<T> :
  never;

/**
 * Is mapping the function Return Type from the Remote to how the types are represented locally.
 * @public
 */
export type RemoteReturnType<T> =
  T extends PromiseLike<infer T> ? RemoteReturnType<T> :
  [T] extends [never] ? Remote<never> :
  T extends Primitives ? RemotePrimitiveReadonly<T> :
  T extends Remote<infer Local> ? Local :
  Remote<T>;

/**
 * Is mapping the a writable Primitive Type from the Remote to how the types are represented locally.
 * @public
 */
export type RemotePrimitiveSettable<T extends Primitives> = PromiseLike<T> & {
  set(value: T): PromiseLike<void>;
};

/**
 * Is mapping the a readonly Primitive Type from the Remote to how the types are represented locally.
 * @public
 */
export type RemotePrimitiveReadonly<T extends Primitives> = PromiseLike<T>;

/**
 * The list of primitive Types.
 * @public
 */
export type Primitives = string | number | boolean | null | undefined | void | bigint | symbol;

























export type RemoteId = string | number;
export type KeyDescription = string | SymbolDescription;
export type OwnKeyDescription = {
  key: KeyDescription;
  enumerable: boolean;
};
export type ObjectDescription = {
  id: RemoteId;
  type: "function" | "object";
  ownKeys: OwnKeyDescription[];
  hasKeys: KeyDescription[];
  prototype: ObjectDescription | NullDescription;
  functionPrototype: ObjectDescription | UndefinedDescription;
};
export type BigIntDescription = { type: "bigint"; value: string; };
export type UndefinedDescription = { type: "undefined"; };
export type SymbolDescription = { type: "symbol"; id: RemoteId; };
export type NullDescription = { type: "null"; };
export type ErrorDescription = { type: "error"; value: ValueDescription; message?: string; stack?: string; name?: string; };
export type ValueDescription = string | number | boolean | BigIntDescription | UndefinedDescription | SymbolDescription | NullDescription | ObjectDescription | ErrorDescription | RemoteDataDescription;
export type GetValueDescription<T> =
  T extends string | number | boolean ? T :
  T extends BigInt ? BigIntDescription :
  T extends undefined ? UndefinedDescription :
  T extends symbol ? SymbolDescription :
  T extends null ? NullDescription :
  T extends object ? ObjectDescription :
  T extends unknown ? RemoteDataDescription :
  never;

export type CreateValue<T extends ValueDescription> =
  T extends string | number | boolean ? T :
  T extends UndefinedDescription ? undefined :
  T extends BigIntDescription ? bigint :
  T extends SymbolDescription ? symbol :
  T extends NullDescription ? null :
  T extends ObjectDescription ? object :
  T extends RemoteDataDescription ? unknown :
  never;

export type CacheDescriptionFunction = (value: object | symbol, generate: (id: RemoteId) => ObjectDescription | SymbolDescription) => ObjectDescription | SymbolDescription;
export type CacheValueFunction = (id: RemoteId, generate: () => object | symbol) => object | symbol;
export type RequestFunction = (proxy: RemoteDataDescription) => Promise<ValueDescription>;

export type GenerateValueFunctionsOptions = {
  remoteObjectPrototype: RemoteObjectPrototype;
  remoteError: RemoteError;
  cacheDescription: CacheDescriptionFunction;
  cacheValue: CacheValueFunction;
  request: RequestFunction;
};

export type GetValueDescriptionFunction = <T, R extends GetValueDescription<T> = GetValueDescription<T>>(value: T) => R;
export type CreateValueFunction = <T extends ValueDescription, R extends CreateValue<T> = CreateValue<T>>(description: T) => R;
export type DescribePromiseFunction = (promise: Promise<unknown>) => Promise<ValueDescription>;
export type GetObjectDescriptionFunction = (object: {}, id: RemoteId) => ObjectDescription;

export type GenerateValueFunctionsReturn = {
  getValueDescription: GetValueDescriptionFunction;
  createValue: CreateValueFunction;
  describePromise: DescribePromiseFunction;
  getObjectDescription: GetObjectDescriptionFunction;
};

export type Key = string | symbol;

type GetPathSegment = { type: "get", name: KeyDescription; };
type SetPathSegment = { type: "set", name: KeyDescription; value: ValueDescription; };
type CallPathSegment = { type: "call", args: ValueDescription[]; };
type NewPathSegment = { type: "new", args: ValueDescription[]; };
export type PathSegment = GetPathSegment | SetPathSegment | CallPathSegment | NewPathSegment;
type ProxyPath = PathSegment[];
export type RemoteDataDescription = {
  type: "remote";
  root: RemoteId;
  path: ProxyPath;
};

export type MayHaveSymbol<T> = {
  [key: symbol]: T | undefined;
};