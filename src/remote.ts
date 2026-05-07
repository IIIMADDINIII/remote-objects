type RemoteAbleObject = object;
type RemoteAbleFunction = (...args: any[]) => any;
type RemoteAbleConstructor = new (...args: any[]) => any;

/** Anything which can be exposed to the Remote. */
export type RemoteAble = RemoteAbleObject | RemoteAbleFunction | RemoteAbleConstructor;

/** Symbol to set a value on the Remote. */
export const SET = Symbol("set");

/** The list of primitive Types. */
type Primitives = string | number | boolean | null | undefined | void | bigint | symbol;

type Remote<T> = RemoteReadonly<T> & RemoteSet<T>;

type RemoteReadonly<T> = RemoteMarker & RemoteGet<T> & NeverToUnknown<RemoteCall<T>>;

export const REMOTE_MARKER = Symbol("RemoteObject");

export type RemoteMarker = {
  [REMOTE_MARKER]: true;
};

type IfEqual<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B;

type IfReadonly<T, K extends keyof T, Writable, Readonly> = IfEqual<{ [Q in K]: T[K] }, { -readonly [Q in K]: T[K] }, Writable, Readonly>;

export type RemoteObject<T extends RemoteAble> = {
  [K in keyof T as K]-?: IfReadonly<T, K, Remote<T[K]>, RemoteReadonly<T[K]>>;
};

type RemoteGet<T> = T extends Primitives ? PromiseLike<T> : PromiseLike<unknown>;

type GetRemoteSetAble<T> = unknown extends T ? unknown : T extends Primitives ? T : T extends (...args: infer P) => PromiseLike<infer R> ? (...args: P) => R | PromiseLike<R> : RemoteReadonly<T>;

/** Helper for Values which can be set on the Remote. */
type RemoteSet<T> = {
  [SET]: (value: GetRemoteSetAble<T>) => PromiseLike<void>;
};

type RemoteCall<T> = T extends (...args: infer P) => infer R ? (...args: P) => PromiseLike<R> : never;

type NeverToUnknown<T> = [T] extends [never] ? unknown : T;

// ┌─┐┬  ┌┬┐  ┌─┐┌┬┐┬ ┬┌─┐┌─┐
// │ ││   ││  └─┐ │ │ │├┤ ├┤
// └─┘┴─┘─┴┘  └─┘ ┴ └─┘└  └

/** Is mapping the any Type from the Remote to how the types are represented locally. */
export type OldRemote<T> = [T] extends [never]
  ? OldRemotePrimitiveReadonly<T>
  : T extends new (...args: any[]) => any
    ? OldRemoteConstructorPromise<T>
    : T extends (...args: any[]) => any
      ? OldRemoteFunctionPromise<T>
      : T extends Primitives
        ? OldRemotePrimitiveSettable<T>
        : T extends {}
          ? OldRemoteObjPromise<T>
          : T extends never
            ? PromiseLike<never>
            : never;

/** Is mapping a Object from the Remote to how the types are represented locally. */
type OldRemoteObj<T extends {}> = {
  [K in keyof T as K]: OldRemote<T[K]>;
};

/** Is mapping the RemoteAble from the Remote to how the types are represented locally. */
type OldRemoteObject<T extends RemoteAble> = T extends RemoteAbleConstructor ? OldRemoteConstructorPromise<T> : T extends RemoteAbleFunction ? OldRemoteFunctionPromise<T> : T extends RemoteAbleObject ? OldRemoteObj<T> : never;

/** Makes it possible to await an object. */
type OldRemoteObjPromise<T extends {}> = (OldRemoteObj<T> & PromiseLike<OldRemoteObj<T>>) | OldRemoteObj<T>;

/** Is mapping a Function from the Remote to how the types are represented locally. */
type OldRemoteFunction<T extends (...args: any[]) => any> = T extends (...args: infer Parameters) => infer ReturnType ? OldRemoteObj<T> & ((...args: OldRemoteFunctionParameters<Parameters>) => OldRemoteReturnType<ReturnType>) : never;

/** Makes it possible to await an function. */
type OldRemoteFunctionPromise<T extends (...args: any[]) => any> = (OldRemoteFunction<T> & PromiseLike<OldRemoteFunction<T>>) | OldRemoteFunction<T>;

/** Is mapping a Constructor from the Remote to how the types are represented locally. */
type OldRemoteConstructor<T extends new () => any> = T extends new (...args: infer Parameters) => infer ReturnType ? OldRemoteObj<T> & (new (...args: OldRemoteFunctionParameters<Parameters>) => OldRemoteReturnType<ReturnType>) : never;

/** Makes it possible to await an constructor. */
type OldRemoteConstructorPromise<T extends new () => any> = (OldRemoteConstructor<T> & PromiseLike<OldRemoteConstructor<T>>) | OldRemoteConstructor<T>;

/** Is mapping the function Parameters Types from the Remote to how the types are represented locally. */
type OldRemoteFunctionParameters<T> = { [K in keyof T]: OldLocal<T[K]> };

/** Inverse to Remote<T>. */
type OldLocal<T> = T extends Primitives ? T : T extends (...args: any[]) => any ? OldLocalFunction<T> : T extends new (...args: any[]) => any ? OldLocalConstructor<T> : T extends OldRemote<infer R> ? R : OldRemote<T>;

/** Helper to convert Function Parameters Properly. */
type OldLocalFunction<T extends (...args: any[]) => any> = T extends (...args: infer Parameters) => infer ReturnType
  ? ReturnType extends PromiseLike<infer ReturnType>
    ? ((...args: OldRemoteFunctionParameters<Parameters>) => ReturnType | PromiseLike<ReturnType>) | OldRemote<T>
    : OldRemote<T>
  : never;

/** Helper to convert Constructor Parameters Properly. */
type OldLocalConstructor<T extends new (...args: any[]) => any> = T extends new (...args: infer Parameters) => infer ReturnType
  ? ReturnType extends PromiseLike<infer ReturnType>
    ? OldRemote<T> | (new (...args: OldRemoteFunctionParameters<Parameters>) => ReturnType | PromiseLike<ReturnType>)
    : OldRemote<T>
  : never;

/** Is mapping the function Return Type from the Remote to how the types are represented locally. */
type OldRemoteReturnType<T> = [T] extends [never] ? OldRemote<T> : T extends PromiseLike<infer T> ? OldRemoteReturnType<T> : T extends Primitives ? OldRemotePrimitiveReadonly<T> : T extends OldRemote<infer Local> ? PromiseLike<Local> : OldRemote<T>;

/** Is mapping the a writable Primitive Type from the Remote to how the types are represented locally. */
type OldRemotePrimitiveSettable<T extends Primitives> = PromiseLike<T> & {
  set(value: T): PromiseLike<void>;
};

/** Is mapping the a readonly Primitive Type from the Remote to how the types are represented locally. */
type OldRemotePrimitiveReadonly<T extends Primitives> = PromiseLike<T>;
