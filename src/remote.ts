/** Anything which can be exposed to the Remote. */
export type RemoteAble = object | ((...args: any[]) => any) | (new (...args: any[]) => any);

/** Symbol to set a value on the Remote. */
export const SET = Symbol("set");

/** The list of primitive Types. */
type Primitives = string | number | boolean | null | undefined | void | bigint | symbol;

/** Converts a local type to a remote type with Write access. */
export type Remote<T> = RemoteReadonly<T> & RemoteSet<T>;

/** Converts a local type to a remote type with Readonly access. */
export type RemoteReadonly<T> = RemoteCommon<T> & RemoteGet<Awaited<T>, PromiseLike<RemoteAwaited<T>>>;

/** Result of Awaiting a Remote type which is not Primitive. */
export type RemoteAwaited<T> = RemoteCommon<T> & RemoteGet<Awaited<T>, unknown>;

/** Common properties of Remote types. */
type RemoteCommon<T> = RemoteMarker<T> & NeverToUnknown<RemoteCall<T>> & NeverToUnknown<RemoteObject<T>>;

/** Marker symbol to identify Remote types. */
export const REMOTE_MARKER = Symbol("RemoteObject");

/** Marker type to identify Remote types. */
export type RemoteMarker<T> = {
  [REMOTE_MARKER]: T;
};

/** Defining what should happen if a Remote is awaited. */
type RemoteGet<T, Default> = [T] extends [never] ? PromiseLike<never> : T extends RemoteMarker<infer V> ? PromiseLike<V> : T extends Primitives ? PromiseLike<T> : Default;

/** Convert a Remote type to a local type used for sending values to the Remote (Set, Parameters). */
type GetRemoteSetAble<T> =
  T extends RemoteMarker<infer V> ? V : unknown extends T ? unknown : T extends Primitives ? T : (T extends (...args: infer P) => PromiseLike<infer R> ? (...args: { [K in keyof P]: GetRemoteSetAble<P[K]> }) => Awaited<R> | PromiseLike<Awaited<R>> : never) | RemoteReadonly<T>;

/** Defines how to set a value on a Remote type. */
type RemoteSet<T> = {
  [SET]: (value: GetRemoteSetAble<T>) => PromiseLike<void>;
};

/** Defines how to call a Remote function. */
type RemoteCall<T> = T extends (...args: infer P) => infer R ? (...args: { [K in keyof P]: GetRemoteSetAble<P[K]> }) => RemoteReadonly<Awaited<R>> : never;

/** Defines how to represent a Remote object. */
type RemoteObject<T> = T extends object
  ? {
      [K in keyof T as K]-?: IfReadonly<T, K, RemoteReadonly<T[K]>, Remote<T[K]>>;
    }
  : never;

/** Helper type to convert `never` to `unknown`. */
type NeverToUnknown<T> = [T] extends [never] ? unknown : T;

/**
 * Recursively unwraps the "awaited type" of a type. Non-promise "thenables" should resolve to `never`. This emulates the behavior of `await`.
 * This is an adjusted version to respect the RemoteMarker type, which should not be unwrapped.
 */
type Awaited<T> =
  T extends RemoteMarker<unknown>
    ? T
    : T extends object & { then(onfulfilled: infer F, ...args: infer _): any } // `await` only unwraps object types with a callable `then`. Non-object types are not unwrapped
      ? F extends (value: infer V, ...args: infer _) => any // if the argument to `then` is callable, extracts the first argument
        ? Awaited<V> // recursively unwrap the value
        : never // the argument to `then` was not callable
      : T; // non-object or non-thenable

/** Helper type to check if two types are equal. */
type IfEqual<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B;

/** Helper type to check if a property is readonly. */
type IfReadonly<T, K extends keyof T, Readonly, Writable> = IfEqual<{ [Q in K]: T[K] }, { -readonly [Q in K]: T[K] }, Writable, Readonly>;
