import type { MessageHandlerInterface } from "./Interfaces.js";
import { ObjectStore, ObjectStoreOptions } from "./ObjectStore.js";
import { RequestHandler, RequestHandlerOptions } from "./RequestHandler.js";


interface CreateObjectStoreOptions<ExtraTransferable> extends MessageHandlerInterface<ExtraTransferable>, RequestHandlerOptions, ObjectStoreOptions { }

export function createObjectStore<ExtraTransferable>(options: CreateObjectStoreOptions<ExtraTransferable>): ObjectStore<ExtraTransferable> {
  let requestHandler = new RequestHandler(options, options);
  let objectStore = new ObjectStore(requestHandler, options);
  return objectStore;
}
