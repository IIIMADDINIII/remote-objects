
export type Transferable<ExtraTransferable> = { [key: string]: string | number | Transferable<ExtraTransferable>[] | Transferable<ExtraTransferable> | ExtraTransferable; };

export type SendMessageFunction<ExtraTransferable> = (data: Transferable<ExtraTransferable>) => Promise<void>;
export type NewMessageHandler<ExtraTransferable> = (data: Transferable<ExtraTransferable>) => void;
export type DisconnectedHandler = () => void;

export interface MessageHandlerInterface<ExtraTransferable> {
  sendMessage: SendMessageFunction<ExtraTransferable>;
  setNewMessageHandler?(newMessage: NewMessageHandler<ExtraTransferable>): void;
  setDisconnectedHandler?(disconnected: DisconnectedHandler): void;
}

export type RequestHandlerFunction<ExtraTransferable> = (request: Transferable<ExtraTransferable>) => Promise<Transferable<ExtraTransferable>>;

export interface RequestHandlerInterface<ExtraTransferable> {
  request: RequestHandlerFunction<ExtraTransferable>;
  setRequestHandler?(requestHandler: RequestHandlerFunction<ExtraTransferable>): void;
  setDisconnectedHandler?(disconnected: DisconnectedHandler): void;
  newMessage?: NewMessageHandler<ExtraTransferable>;
  disconnected?: DisconnectedHandler;
}