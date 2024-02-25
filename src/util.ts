import testing from "consts:testing";


type ClassPrivateFieldDecoratorContext<This = unknown, Value = unknown> = ClassFieldDecoratorContext<This, Value> & { readonly private: true; };

if (testing) {
  if (typeof Symbol.metadata !== "symbol") {
    (<symbol>Symbol.metadata) = Symbol("metadata");
  }
}

const privateData: WeakMap<{}, Map<string | symbol, ClassFieldDecoratorContext["access"]>> = new WeakMap();

export function testable<This, Value extends unknown>(_target: undefined, context: ClassPrivateFieldDecoratorContext<This, Value>): undefined {
  if (!testing) return;
  if (context.kind !== "field") throw new Error("Currently only Class Fields are supported");
  if (!context.private) throw new Error("this decorator can only be used on private members");
  if (context.static) throw new Error("Currently static members are not supported");
  let metadata = privateData.get(context.metadata);
  if (metadata === undefined) {
    metadata = new Map();
    privateData.set(context.metadata, metadata);
  }
  metadata.set(context.name, context.access);
}

function getAccessors(object: {}, key: string | symbol): ClassFieldDecoratorContext["access"] {
  if (!testing) return <any>undefined;
  const constructor = object.constructor;
  if (!(Symbol.metadata in constructor)) throw new Error("Only Object Instances with metadata available can be accessed");
  const metadataObject = constructor[Symbol.metadata];
  if (metadataObject === null) throw new Error("Only Object Instances with metadata available can be accessed");
  const metadata = privateData.get(metadataObject);
  if (metadata === undefined) throw new Error("Only Object Instances with metadata available can be accessed");
  const accessors = metadata.get(key);
  if (accessors === undefined || typeof accessors.get !== "function") throw new Error("Only Object Instances with metadata available can be accessed");
  return accessors;
}

export function getTestable<T = unknown>(object: {}, key: string | symbol): T {
  if (!testing) return <any>undefined;
  return <any>getAccessors(object, key).get(object);
}

export function setTestable(object: {}, key: string | symbol, value: unknown): void {
  if (!testing) return;
  getAccessors(object, key).set(object, value);
}
