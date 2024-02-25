
export type Transferable<ExtraTransferable> = string | number | ExtraTransferable | Transferable<ExtraTransferable>[] | { [key: string]: Transferable<ExtraTransferable>; };

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