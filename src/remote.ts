type RemoteAbleObject = object;
type RemoteAbleFunction = (...args: any[]) => any;
type RemoteAbleConstructor = new (...args: any[]) => any;

/** Anything which can be exposed to the Remote. */
export type RemoteAble = RemoteAbleObject | RemoteAbleFunction | RemoteAbleConstructor;

/** Symbol to set a value on the Remote. */
export const SET = Symbol("set");

/** The list of primitive Types. */
type Primitives = string | number | boolean | null | undefined | void | bigint | symbol;

export type Remote<T> = RemoteReadonly<T> & RemoteSet<T>;

export type RemoteReadonly<T> = RemoteMarker<T> & RemoteGet<T> & NeverToUnknown<RemoteCall<T>>;

export const REMOTE_MARKER = Symbol("RemoteObject");

export type RemoteMarker<T> = {
  [REMOTE_MARKER]: T;
};

type IfEqual<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B;

type IfReadonly<T, K extends keyof T, Readonly, Writable> = IfEqual<{ [Q in K]: T[K] }, { -readonly [Q in K]: T[K] }, Writable, Readonly>;

export type RemoteObject<T extends RemoteAble> = {
  [K in keyof T as K]-?: IfReadonly<T, K, RemoteReadonly<T[K]>, Remote<T[K]>>;
};

type RemoteGet<T, U extends Awaited<T> = Awaited<T>> = [U] extends [never] ? PromiseLike<never> : U extends RemoteMarker<infer V> ? PromiseLike<V> : U extends Primitives ? PromiseLike<U> : PromiseLike<unknown>;

type SetAbleWithRemote<T> = T extends (...args: infer P) => PromiseLike<infer R> ? (...args: { [K in keyof P]: GetRemoteSetAble<P[K]> }) => Awaited<R> | PromiseLike<Awaited<R>> : never;

type GetRemoteSetAble<T> = T extends RemoteMarker<infer V> ? V : unknown extends T ? unknown : T extends Primitives ? T : SetAbleWithRemote<T> | RemoteReadonly<T>;

/** Helper for Values which can be set on the Remote. */
type RemoteSet<T> = {
  [SET]: (value: GetRemoteSetAble<T>) => PromiseLike<void>;
};

type RemoteCall<T> = T extends (...args: infer P) => infer R ? (...args: { [K in keyof P]: GetRemoteSetAble<P[K]> }) => RemoteGet<R> : never;

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
