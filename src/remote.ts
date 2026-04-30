/** Anything which can be exposed to the Remote. */
export type RemoteAble = object | ((...args: any[]) => any) | (new (...args: any[]) => any);

/** Symbol to set a value on the Remote. */
export const SET = Symbol("set");

/** The list of primitive Types. */
type Primitives = string | number | boolean | null | undefined | void | bigint | symbol;

/** Converts a local type to a remote type with Write access. */
export type Remote<T> = RemoteReadonly<T> & RemoteSet<T>;

/**
 * Converts a local type to a remote type with Readonly
 * access.
 */
export type RemoteReadonly<T> = RemoteCommon<T> & RemoteGet<Awaited<T>, PromiseLike<RemoteAwaited<T>>>;

/** Result of Awaiting a Remote type which is not Primitive. */
export type RemoteAwaited<T> = RemoteCommon<T> & RemoteGet<Awaited<T>, unknown>;

/** Common properties of Remote types. */
type RemoteCommon<T> = RemoteMarker<T> & NeverToUnknown<RemoteCall<T>> & NeverToUnknown<RemoteObject<T>>;

/** Marker symbol to identify Remote types. */
export const REMOTE_MARKER = Symbol("RemoteObject");

/** Marker type to identify Remote types. */
export type RemoteMarker<T> = {
  // () => PromiseLike<T> and () => T behave exactly the same. So Types should be made compatible.
  [REMOTE_MARKER]: T extends new (...args: infer P) => PromiseLike<infer R> // if constructor is returning Promise
    ? new (...args: P) => R // Transform constructor to return the original type (Unwrapped from the Promise)
    : T extends (...args: infer P) => infer R // if function is returning Promise
      ? (...args: P) => R // Transform function to return the original type (Unwrapped from the Promise)
      : T; // Else return the original type (This includes primitives and non-Promise functions/constructors, which should not be transformed)
};

/** Defining what should happen if a Remote is awaited. */
type RemoteGet<T, Default> = // T: Type to transform, Default: Type to use if it is not transformable
  [T] extends [never] // if type is never (without Brackets it would distribute over unions, which is not possible with never)
    ? PromiseLike<never> // return a Promise with never
    : T extends RemoteMarker<infer V> // if type is a Remote Type (Detected by using the RemoteMarker)
      ? PromiseLike<V> // return a Promise with the original type (Unwrapped from the RemoteMarker)
      : T extends Primitives // if type is a Primitive
        ? PromiseLike<T> // return a Promise with the same Primitive type
        : Default; // for all other types, return the Default type (used to make all types Awaitable once)

/**
 * Convert a Remote type to a local type used for sending
 * values to the Remote (Set, Parameters).
 */
type GetRemoteSetAble<T> = // T: Type to transform
  T extends RemoteMarker<infer V> // if type is a Remote Type (Detected by using the RemoteMarker)
    ? V // return the original type (Unwrapped from the RemoteMarker)
    : unknown extends T // if type is unknown
      ? unknown // return unknown (Keep unknown as it is because it is the best we can do)
      : T extends Primitives // if type is a Primitive
        ? T // return the same Primitive type
        : // All types from here include a RemoteReadonly with a Union to support setting a Remote Value
            | RemoteAwaited<T> // Add RemoteReadonly<T> to support setting a Remote value (instead of a transformed type)
            | (T extends new (...args: infer P) => PromiseLike<infer R> // if type is a constructor function (needs to return a Promise else it is not possible to send to Remote)
                ? new (...args: { [K in keyof P]: GetRemoteSetAble<P[K]> }) => Awaited<R> | PromiseLike<Awaited<R>> // Transform constructor parameters and return type
                : T extends (...args: infer P) => PromiseLike<infer R> // if type is a function (needs to return a Promise else it is not possible to send to Remote)
                  ? (...args: { [K in keyof P]: GetRemoteSetAble<P[K]> }) => Awaited<R> | PromiseLike<Awaited<R>> // Transform function parameters and return type
                  : never); // Do not include in to Union if it is not possible to send to remote

/** Defines how to set a value on a Remote type. */
type RemoteSet<T> = {
  [SET]: (value: GetRemoteSetAble<T>) => PromiseLike<void>;
};

/** Defines how to call a Remote function. */
type RemoteCall<T> = // T: Type to transform
  T extends new (...args: infer P) => infer R // if type is a constructor function
    ? new (...args: { [K in keyof P]: GetRemoteSetAble<P[K]> }) => RemoteReadonly<Awaited<R>> // Transform constructor parameters and return type
    : T extends (...args: infer P) => infer R // if type is a function
      ? (...args: { [K in keyof P]: GetRemoteSetAble<P[K]> }) => RemoteReadonly<Awaited<R>> // Transform function parameters and return type
      : never; // If not a function, remove it from the union

/** Defines how to represent a Remote object. */
type RemoteObject<T> = // T: Type to transform
  T extends object // if type is an object
    ? {
        [K in keyof T as K]-?: IfReadonly<T, K, RemoteReadonly<T[K]>, Remote<T[K]>>;
      } // Map all properties of the object to Remote types (with special handling for readonly properties)
    : never; // If not an object, remove it from the union

/** Helper type to convert `never` to `unknown`. */
type NeverToUnknown<T> = [T] extends [never] ? unknown : T;

/**
 * Recursively unwraps the "awaited type" of a type.
 * Non-promise "thenables" should resolve to `never`. This
 * emulates the behavior of `await`. This is an adjusted
 * version to respect the RemoteMarker type, which should
 * not be unwrapped.
 */
type Awaited<T> =
  T extends RemoteMarker<unknown>
    ? T
    : T extends object & {
          then(onfulfilled: infer F, ...args: infer _): any;
        }
      ? F extends (value: infer V, ...args: infer _) => any
        ? Awaited<V>
        : never
      : T;

/** Helper type to check if two types are equal. */
type IfEqual<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B;

/** Helper type to check if a property is readonly. */
type IfReadonly<T, K extends keyof T, Readonly, Writable> = IfEqual<{ [Q in K]: T[K] }, { -readonly [Q in K]: T[K] }, Writable, Readonly>;
