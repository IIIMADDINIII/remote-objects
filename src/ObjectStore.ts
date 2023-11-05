import type { RequestHandlerInterface, Transferable } from "./Interfaces.js";


export interface ObjectStoreOptions { }


export class ObjectStore<ExtraTransferable> {
  #requestHandler: RequestHandlerInterface<ExtraTransferable>;
  #closed: boolean = false;

  // ToDo:implement Options
  constructor(requestHandler: RequestHandlerInterface<ExtraTransferable>, _options?: ObjectStoreOptions) {
    this.#requestHandler = requestHandler;
    this.requestHandler = this.requestHandler.bind(this);
    if (requestHandler.setRequestHandler) requestHandler.setRequestHandler(this.requestHandler);
    this.disconnected = this.disconnected.bind(this);
    if (requestHandler.setDisconnectedHandler) requestHandler.setDisconnectedHandler(this.disconnected);
  }

  newMessage(data: Transferable<ExtraTransferable>): void {
    if (this.#requestHandler.newMessage) return this.#requestHandler.newMessage(data);
    throw new Error("Function is not Implemented by requestHandler");
  }

  disconnected(): void {
    this.close();
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    if (this.#requestHandler.disconnected) return this.#requestHandler.disconnected();
  }

  requestHandler(_request: Transferable<ExtraTransferable>): Promise<Transferable<ExtraTransferable>> {
    this.#checkClosed();
    throw new Error("Method not implemented.");
  }

  #checkClosed() {
    if (this.#closed) throw new Error("Connection is already closed.");
  }

}
