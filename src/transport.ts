/** JSON save Description of a list of objects, functions and symbols. */
type GcObjectsDescription = GcObjectDescription[];

/** JSON save Id of an object which might need to be garbage collected. */
export type GcId = string | number;

/** JSON save Id of an object wich is locally available. */
export type LocalGcId = {
  /** Type of the GcId ("local" | "remote"). */
  type: "local";
  /** Id of the local object. */
  id: GcId;
};

/** JSON save Id of an object wich only available on the remote site. */
export type RemoteGcId = RemoteDescription & {
  /** Type of the GcId ("local" | "remote"). */
  type: "remote";
};

/** JSON save An GcId with the location of the object specified. */
export type LocalizedGcId = LocalGcId | RemoteGcId;

/** JSON save Description of a key of an object. */
export type KeyDescription = string | LocalizedGcId;

/** JSON save description of own Keys. */
export type OwnKeyDescription = {
  /** Description of the Key itself. */
  key: KeyDescription;
  /** Is the Key enumerable? */
  enumerable: boolean;
};

/** JSON save description of a BigInt. */
type BigIntDescription = {
  /** Type of the ValueDescription. */
  type: "bigint";
  /** Value of the BigInt represented as a string. */
  value: string;
};

/** JSON save description of the Value undefined. */
export type UndefinedDescription = {
  /** Type of the ValueDescription. */
  type: "undefined";
};

/** JSON save description of the Value null. */
export type NullDescription = {
  /** Type of the ValueDescription. */
  type: "null";
};

/** JSON save description of all Primitive Values. */
type PrimitiveValueDescription = string | number | boolean | BigIntDescription | UndefinedDescription | NullDescription;

/** JSON save description of an any Value. */
export type ValueDescription = PrimitiveValueDescription | LocalizedGcId;

/** JSON save Value Segment representing the reading of an property. */
type ValueGetSegment = {
  /** Type of the Segment. */
  type: "get";
  /** Description of the Key to read the value from. */
  name: KeyDescription;
};

/** JSON save Value Segment representing the call of an function. */
type ValueCallSegment = {
  /** Type of the Segment. */
  type: "call";
  /** Description of all the Arguments for the function call. */
  args: ValueDescription[];
};

/** JSON save Value Segment representing the Creation of an object. */
type ValueNewSegment = {
  /** Type of the Segment. */
  type: "new";
  /** Description of all the arguments to the constructor call. */
  args: ValueDescription[];
};

/** JSON save Value Segment representing the setting of an property. */
type ValueSetSegment = {
  /** Type of the Segment. */
  type: "set";
  /** Description of the Key to read the value from. */
  name: KeyDescription;
  /** Description of the Value to assign to the property. */
  value: ValueDescription;
};

/** JSON save Segment of the Value Path. */
export type ValueSegment = ValueGetSegment | ValueCallSegment | ValueNewSegment | ValueSetSegment;

/** JSON save Description of an indirect remote value. */
type ValuePath = ValueSegment[];

/** JSON save Description of an object on the remote site. */
export type RemoteDescription = {
  /** Id of the Remote Object. */
  id: GcId;
  /** Optional path to follow based on the remote object. */
  path?: ValuePath;
};

/** JSON save description of an Object. */
export type ObjectDescription = {
  /** Type of the ValueDescription. */
  type: "object";
  /** GcId of this Object. */
  id: GcId;
  /** List of Own Keys Descriptions of the object (To Support stuff like ownKey). */
  ownKeys: OwnKeyDescription[];
  /** List of all Keys Descriptions in the prototype chain (To support stuff like hasKey; Empty list if Prototype is not NullDescription). */
  hasKeys: KeyDescription[];
  /** Description of the Prototype of the object. */
  prototype: LocalizedGcId | NullDescription;
};

/** JSON save description of an Function. */
export type FunctionDescription = {
  /** Type of the ValueDescription. */
  type: "function";
  /** GcId of this function. */
  id: GcId;
  /** List of Own Keys Descriptions of the object (To Support stuff like ownKey). */
  ownKeys: OwnKeyDescription[];
  /** List of all Keys Descriptions in the prototype chain (To support stuff like hasKey; Empty list if Prototype is not NullDescription). */
  hasKeys: KeyDescription[];
  /** Description of the Prototype of the object. */
  prototype: LocalizedGcId | NullDescription;
  /** Description of the Prototype property of the function (to support instanceof). */
  functionPrototype: ValueDescription;
};

/** JSON save description of a symbol. Symbols are represented by a new symbol on the remote site. */
export type SymbolDescription = {
  /** Type of the ValueDescription. */
  type: "symbol";
  /** Id of the symbol. */
  id: GcId;
};

/** JSON save Description of an Object, function or symbol. */
export type GcObjectDescription = ObjectDescription | FunctionDescription | SymbolDescription;

/** Value Request, describing the remote value. */
export type ValueRequestDescription = RemoteDescription & {
  /** Type of the Request. */
  type: "request";
  /** List of garbage collected objects important for this request. */
  gcObjects: GcObjectsDescription;
};

/** Request to sync the Garbage collector status. */
export type SyncGcRequest = {
  /** Type of the Request. */
  type: "syncGcRequest";
  /** List of RemoteObjects or Symbol ID's which where deleted since the last sync and can now be released locally. */
  deletedItems: number[];
  /** List of Items which are new since the last sync. */
  newItems: number[];
};

/** JSON save description of an error. */
export type ErrorDescription = {
  /** Type of the ValueDescription. */
  type: "error";
  /** Description of the Error Value. */
  value: ValueDescription;
  /** Message of the error if it exists. */
  message?: string;
  /** Call Stack of the Error if it exists. */
  stack?: string;
  /** Name of the Error if it exists. */
  name?: string;
};

/** JSON save description of the response Value. */
export type ResponseValueDescription = ValueDescription | ErrorDescription;

/** Response to a Value Request. */
export type ValueResponseDescription = {
  /** Type of the Response. */
  type: "response";
  /** List of garbage collected objects important for this response. */
  gcObjects: GcObjectsDescription;
  /** Value of the Response. */
  value: ResponseValueDescription;
};

/** Response to a garbage collector sync request. */
export type SyncGcResponse = {
  /** Type of the Response. */
  type: "syncGcResponse";
  /** List of items which where successfully released. */
  deletedItems: number[];
  /** List of items which are still unknown. */
  unknownNewItems: number[];
};
