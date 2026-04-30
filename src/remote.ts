/**
 * Anything which can be exposed to the Remote.
 *
 * @public
 */
export type RemoteObjectAble = object | ((...args: any[]) => any) | (new (...args: any[]) => any);

/**
 * Is mapping the any Type from the Remote to how the types are represented locally.
 *
 * @public
 */
export type Remote<T> = [T] extends [never]
  ? RemotePrimitiveReadonly<T>
  : T extends new (...args: any[]) => any
    ? RemoteConstructorPromise<T>
    : T extends (...args: any[]) => any
      ? RemoteFunctionPromise<T>
      : T extends Primitives
        ? RemotePrimitiveSettable<T>
        : T extends {}
          ? RemoteObjPromise<T>
          : T extends never
            ? PromiseLike<never>
            : never;

/**
 * Is mapping the RemoteObjectAble from the Remote to how the types are represented locally.
 *
 * @public
 */
export type RemoteObject<T extends RemoteObjectAble> = T extends new (...args: any[]) => any ? RemoteConstructorPromise<T> : T extends (...args: any[]) => any ? RemoteFunctionPromise<T> : T extends {} ? RemoteObjPromise<T> : never;

/**
 * Is mapping a Object from the Remote to how the types are represented locally.
 *
 * @public
 */
type RemoteObj<T extends {}> = {
  [K in keyof T as K]: Remote<T[K]>;
};

/**
 * Makes it possible to await an object.
 *
 * @public
 */
type RemoteObjPromise<T extends {}> = (RemoteObj<T> & PromiseLike<RemoteObj<T>>) | RemoteObj<T>;

/**
 * Is mapping a Function from the Remote to how the types are represented locally.
 *
 * @public
 */
type RemoteFunction<T extends (...args: any[]) => any> = T extends (...args: infer Parameters) => infer ReturnType ? RemoteObj<T> & ((...args: RemoteFunctionParameters<Parameters>) => RemoteReturnType<ReturnType>) : never;

/**
 * Makes it possible to await an function.
 *
 * @public
 */
type RemoteFunctionPromise<T extends (...args: any[]) => any> = (RemoteFunction<T> & PromiseLike<RemoteFunction<T>>) | RemoteFunction<T>;

/**
 * Is mapping a Constructor from the Remote to how the types are represented locally.
 *
 * @public
 */
type RemoteConstructor<T extends new () => any> = T extends new (...args: infer Parameters) => infer ReturnType ? RemoteObj<T> & (new (...args: RemoteFunctionParameters<Parameters>) => RemoteReturnType<ReturnType>) : never;

/**
 * Makes it possible to await an constructor.
 *
 * @public
 */
type RemoteConstructorPromise<T extends new () => any> = (RemoteConstructor<T> & PromiseLike<RemoteConstructor<T>>) | RemoteConstructor<T>;

/**
 * Is mapping the function Parameters Types from the Remote to how the types are represented locally.
 *
 * @public
 */
type RemoteFunctionParameters<T> = { [K in keyof T]: Local<T[K]> };

/**
 * Inverse to Remote<T>.
 *
 * @public
 */
type Local<T> = T extends Primitives ? T : T extends (...args: any[]) => any ? LocalFunction<T> : T extends new (...args: any[]) => any ? LocalConstructor<T> : T extends Remote<infer R> ? R : Remote<T>;

/**
 * Helper to convert Function Parameters Properly.
 *
 * @public
 */
type LocalFunction<T extends (...args: any[]) => any> = T extends (...args: infer Parameters) => infer ReturnType ? (ReturnType extends PromiseLike<infer ReturnType> ? ((...args: RemoteFunctionParameters<Parameters>) => ReturnType | PromiseLike<ReturnType>) | Remote<T> : Remote<T>) : never;

/**
 * Helper to convert Constructor Parameters Properly.
 *
 * @public
 */
type LocalConstructor<T extends new (...args: any[]) => any> = T extends new (...args: infer Parameters) => infer ReturnType
  ? ReturnType extends PromiseLike<infer ReturnType>
    ? Remote<T> | (new (...args: RemoteFunctionParameters<Parameters>) => ReturnType | PromiseLike<ReturnType>)
    : Remote<T>
  : never;

/**
 * Is mapping the function Return Type from the Remote to how the types are represented locally.
 *
 * @public
 */
type RemoteReturnType<T> = [T] extends [never] ? Remote<T> : T extends PromiseLike<infer T> ? RemoteReturnType<T> : T extends Primitives ? RemotePrimitiveReadonly<T> : T extends Remote<infer Local> ? PromiseLike<Local> : Remote<T>;

/**
 * Is mapping the a writable Primitive Type from the Remote to how the types are represented locally.
 *
 * @public
 */
type RemotePrimitiveSettable<T extends Primitives> = PromiseLike<T> & {
  set(value: T): PromiseLike<void>;
};

/**
 * Is mapping the a readonly Primitive Type from the Remote to how the types are represented locally.
 *
 * @public
 */
type RemotePrimitiveReadonly<T extends Primitives> = PromiseLike<T>;

/**
 * The list of primitive Types.
 *
 * @public
 */
type Primitives = string | number | boolean | null | undefined | void | bigint | symbol;
