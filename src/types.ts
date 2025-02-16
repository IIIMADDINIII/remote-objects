
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
  /**
   * Defines that no gc Synchronisation should happen.
   *  - true:
   *      All Objects shared with remote are never released (memory leak).
   *      Calling syncGc will throw an Error.
   *      SyncGc will never be scheduled.
   *  - false:
   *      syncGc will be automatically called based on scheduleGcAfterTime and scheduleGcAfterObjectCount.
   *      Also calling syncGc manually is an option.
   *      Objects Shared with remote will eventually get garbage collected.
   * @default false
   */
  doNotSyncGc?: boolean;
  /**
   * Amount of time in milliseconds after syncGc is automatically scheduled again.
   * Value of 0 means never.
   * @default 30000
   */
  scheduleGcAfterTime?: number;
  /**
   * Number of Garbage Collected Objects after a syncGc should be scheduled.
   * Value of 0 means never.
   * @default 200
   */
  scheduleGcAfterObjectCount?: number;
  /**
   * Amount of expected network latency in milliseconds.
   * This is needed to fix GarbageCollection is a request was lost or faulty.
   * This does not include processing time of the Request itself.
   * It is the maximum amount of time to send and receive a message from remote.
   * If a Message exceeds this Time the corresponding objects might get Garbage Collected even if there are used by remote.
   * Plan a healthy amount of reserve.
   * If many Objects a created, this delays when they are checked.
   * @default 5000
   */
  requestLatency?: number;
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
export type RemoteObjPromise<T extends {}> = RemoteObj<T> & Promise<RemoteObj<T>> | RemoteObj<T>;

/**
 * Is mapping a Function from the Remote to how the types are represented locally.
 * @public
 */
export type RemoteFunction<T extends (...args: any[]) => any> =
  T extends (...args: infer Parameters) => infer ReturnType ? RemoteObj<T> & ((...args: RemoteFunctionParameters<Parameters>) => RemoteReturnType<ReturnType>) :
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
  T extends new (...args: infer Parameters) => infer ReturnType ? RemoteObj<T> & (new (...args: RemoteFunctionParameters<Parameters>) => RemoteReturnType<ReturnType>) :
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
  [T] extends [never] ? Remote<T> :
  T extends PromiseLike<infer T> ? RemoteReturnType<T> :
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

/**
 * Object which may have a Symbol.
 */
export type MayHaveSymbol<T> = {
  /**
   * Index signature to show that an Object may have a Symbol as a Key.
   */
  [key: symbol]: T | undefined;
};

/**
 * All Possible types for an object Key (string or symbol).
 */
export type Key = string | symbol;

/**
 * Path segment representing the call of an function.
 */
type CallPathSegment = {
  /**
   * Type of the Segment.
   */
  type: "call";
  /**
   * List of all the Arguments to this function call.
   */
  args: unknown[];
  /**
   * Parent Segment wich is getting called.
   * Probably value referencing a function.
   */
  parent: ExtendableRemotePath;
};

/**
 * Path segment representing the creation of an object.
 */
type NewPathSegment = {
  /**
   * Type of the Segment.
   */
  type: "new";
  /**
   * list of Arguments to the constructor.
   */
  args: unknown[];
  /**
   * Parent Segment wich is getting called.
   * Probably value referencing a constructor.
   */
  parent: ExtendableRemotePath;
};

/**
 * Path segment representing reading of an property.
 */
type GetPathSegment = {
  /**
   * Type of the Segment.
   */
  type: "get";
  /**
   * Name of the property to read.
   */
  name: Key;
  /**
   * Parent Segment representing an object.
   */
  parent: ExtendableRemotePath;
};

/**
 * Path segment representing the Assignment of an property.
 */
type SetPathSegment = {
  /**
   * Type of the Segment.
   */
  type: "set";
  /**
   * Name of the Property to set.
   */
  name: Key;
  /**
   * Value to assign to the property.
   */
  value: unknown;
  /**
   * Parent Segment representing an object.
   */
  parent: ExtendableRemotePath;
};

/**
 * The Root of all RemotePaths. The top most Parent always needs to be a RootPathSegment.
 */
export type RootPathSegment = {
  /**
   * Type of the Segment.
   */
  type: "root";
  /**
   * Remote Id of the Remote Object.
   */
  id: GcId;
  /**
   * Description of the Remote Object, to support stuff like hasKey.
   */
  description?: ResolvedObjectDescription | ResolvedFunctionDescription;
};

/**
 * All Path Segments which can be extended (Can be the Parent of an ExtendingRemotePath; currently everything except SetPathSegment).
 */
export type ExtendableRemotePath = RootPathSegment | GetPathSegment | NewPathSegment | CallPathSegment;

/**
 * All Path Segments which are based on a Parent segment (Every Segment type except RootPathSegment).
 */
export type ExtendingRemotePath = GetPathSegment | NewPathSegment | CallPathSegment | SetPathSegment;

/**
 * Description of a remote Path (Object + some operations).
 */
export type RemotePath = ExtendableRemotePath | SetPathSegment;

/**
 * JSON save Id of an object which might need to be garbage collected.
 */
export type GcId = string | number;

/**
 * JSON save Id of an object wich is locally available.
 */
export type LocalGcId = {
  /**
   * Type of the GcId ("local" | "remote").
   */
  type: "local";
  /**
   * Id of the local object.
   */
  id: GcId;
};

/**
 * JSON save Id of an object wich only available on the remote site.
 */
export type RemoteGcId = RemoteDescription & {
  /**
   * Type of the GcId ("local" | "remote").
   */
  type: "remote";
};

/**
 * JSON save Description of an object on the remote site.
 */
export type RemoteDescription = {
  /**
   * Id of the Remote Object.
   */
  id: GcId;
  /**
   * Optional path to follow based on the remote object.
   */
  path?: ValuePath;
};

/**
 * JSON save An GcId with the location of the object specified.
 */
export type LocalizedGcId = LocalGcId | RemoteGcId;

/**
 * JSON save Description of a key of an object.
 */
export type KeyDescription = string | LocalizedGcId;

/**
 * JSON save Value Segment representing the call of an function.
 */
type ValueCallSegment = {
  /**
   * Type of the Segment.
   */
  type: "call";
  /**
   * Description of all the Arguments for the function call.
   */
  args: ValueDescription[];
};

/**
 * JSON save Value Segment representing the Creation of an object.
 */
type ValueNewSegment = {
  /**
   * Type of the Segment.
   */
  type: "new";
  /**
   * Description of all the arguments to the constructor call.
   */
  args: ValueDescription[];
};

/**
 * JSON save Value Segment representing the reading of an property.
 */
type ValueGetSegment = {
  /**
   * Type of the Segment.
   */
  type: "get";
  /**
   * Description of the Key to read the value from.
   */
  name: KeyDescription;
};

/**
 * JSON save Value Segment representing the setting of an property.
 */
type ValueSetSegment = {
  /**
   * Type of the Segment.
   */
  type: "set";
  /**
   * Description of the Key to read the value from.
   */
  name: KeyDescription;
  /**
   * Description of the Value to assign to the property.
   */
  value: ValueDescription;
};

/**
 * JSON save Segment of the Value Path.
 */
export type ValueSegment = ValueGetSegment | ValueCallSegment | ValueNewSegment | ValueSetSegment;

/**
 * JSON save Description of an indirect remote value.
 */
export type ValuePath = ValueSegment[];

/**
 * JSON save description of a BigInt.
 */
type BigIntDescription = {
  /**
   * Type of the ValueDescription.
   */
  type: "bigint";
  /**
   * Value of the BigInt represented as a string.
   */
  value: string;
};

/**
 * JSON save description of the Value undefined.
 */
export type UndefinedDescription = {
  /**
   * Type of the ValueDescription.
   */
  type: "undefined";
};

/**
 * JSON save description of the Value null.
 */
export type NullDescription = {
  /**
   * Type of the ValueDescription.
   */
  type: "null";
};

/**
 * JSON save description of all Primitive Values.
 */
type PrimitiveValueDescription = string | number | boolean | BigIntDescription | UndefinedDescription | NullDescription;

/**
 * JSON save description of own Keys
 */
export type OwnKeyDescription = {
  /**
   * Description of the Key itself.
   */
  key: KeyDescription;
  /**
   * Is the Key enumerable?
   */
  enumerable: boolean;
};

/**
 * JSON save description of an Object.
 */
export type ObjectDescription = {
  /**
   * Type of the ValueDescription.
   */
  type: "object";
  /**
   * GcId of this Object.
   */
  id: GcId;
  /**
   * List of Own Keys Descriptions of the object (To Support stuff like ownKey).
   */
  ownKeys: OwnKeyDescription[];
  /**
   * List of all Keys Descriptions in the prototype chain (To support stuff like hasKey; Empty list if Prototype is not NullDescription).
   */
  hasKeys: KeyDescription[];
  /**
   * Description of the Prototype of the object.
   */
  prototype: LocalizedGcId | NullDescription;
};

/**
 * Type for caching the evaluated Object Description.
 */
export type ResolvedObjectDescription = {
  /**
   * Map of all the Own Keys with its parameters.
   */
  ownKeys: Map<Key, { configurable: true, enumerable: boolean; }>;
  /**
   * List of all the Keys wich exist on the object (empty list if Prototype is not Null).
   */
  hasKeys: Key[];
  /**
   * Prototype of the Object. Null when it does not exist.
   */
  prototype: {} | null;
};

/**
 * JSON save description of an Function.
 */
export type FunctionDescription = {
  /**
   * Type of the ValueDescription.
   */
  type: "function";
  /**
   * GcId of this function.
   */
  id: GcId;
  /**
   * List of Own Keys Descriptions of the object (To Support stuff like ownKey).
   */
  ownKeys: OwnKeyDescription[];
  /**
   * List of all Keys Descriptions in the prototype chain (To support stuff like hasKey; Empty list if Prototype is not NullDescription).
   */
  hasKeys: KeyDescription[];
  /**
   * Description of the Prototype of the object.
   */
  prototype: LocalizedGcId | NullDescription;
  /**
   * Description of the Prototype property of the function (to support instanceof).
   */
  functionPrototype: ValueDescription;
};

/**
 * Type for caching the evaluated Function Description.
 */
export type ResolvedFunctionDescription = {
  /**
   * Map of all the Own Keys with its parameters.
   */
  ownKeys: Map<Key, { configurable: true, enumerable: boolean; }>;
  /**
   * List of all the Keys wich exist on the function (empty list if Prototype is not Null).
   */
  hasKeys: Key[];
  /**
   * Prototype of the function. Null when it does not exist.
   */
  prototype: {} | null;
  /**
   * Prototype property of the function.
   */
  functionPrototype: unknown;
};

/**
 * JSON save description of a symbol. Symbols are represented by a new symbol on the remote site.
 */
export type SymbolDescription = {
  /**
   * Type of the ValueDescription.
   */
  type: "symbol";
  /**
   * Id of the symbol.
   */
  id: GcId;
};

/**
 * JSON save Description of an Object, function or symbol.
 */
export type GcObjectDescription = ObjectDescription | FunctionDescription | SymbolDescription;

/**
 * JSON save Description of a list of objects, functions and symbols.
 */
export type GcObjectsDescription = GcObjectDescription[];

/**
 * JSON save description of an any Value.
 */
export type ValueDescription = PrimitiveValueDescription | LocalizedGcId;

/**
 * JSON save description of an error.
 */
export type ErrorDescription = {
  /**
   * Type of the ValueDescription.
   */
  type: "error";
  /**
   * Description of the Error Value.
   */
  value: ValueDescription;
  /**
   * Message of the error if it exists.
   */
  message?: string;
  /**
   * Call Stack of the Error if it exists.
   */
  stack?: string;
  /**
   * Name of the Error if it exists.
   */
  name?: string;
};

/**
 * JSON save description of the response Value.
 */
export type ResponseValueDescription = ValueDescription | ErrorDescription;

/**
 * Value Request, describing the remote value.
 */
export type ValueRequestDescription = RemoteDescription & {
  /**
   * Type of the Request.
   */
  type: "request";
  /**
   * List of garbage collected objects important for this request.
   */
  gcObjects: GcObjectsDescription;
};

/**
 * Response to a Value Request.
 */
export type ValueResponseDescription = {
  /**
   * Type of the Response.
   */
  type: "response";
  /**
   * List of garbage collected objects important for this response.
   */
  gcObjects: GcObjectsDescription;
  /**
   * Value of the Response.
   */
  value: ResponseValueDescription;
};

/**
 * Request to sync the Garbage collector status.
 */
export type SyncGcRequest = {
  /**
   * Type of the Request.
   */
  type: "syncGcRequest";
  /**
   * List of RemoteObjects or Symbol ID's which where deleted since the last sync and can now be released locally.
   */
  deletedItems: number[];
  /**
   * List of Items which are new since the last sync.
   */
  newItems: number[];
};

/**
 * Response to a garbage collector sync request.
 */
export type SyncGcResponse = {
  /**
   * Type of the Response.
   */
  type: "syncGcResponse";
  /**
   * List of items which where successfully released.
   */
  deletedItems: number[];
  /**
   * List of items which are still unknown.
   */
  unknownNewItems: number[];
};

/**
 * Metadata of an local Gc Item.
 */
export type GcIdDescription = {
  /**
   * Id ig the local gc item.
   */
  id: GcId;
  /**
   * Last Time the local item was sent to remote.
   */
  time: number;
  /**
   * The local Item.
   */
  value: symbol | {};
}

