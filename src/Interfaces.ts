
/**
 * Description of the Data wich can be Transmitted to the Remote (JSON Compatible).
 * All datatypes which do not fit will be Translated to Objects compatible with this.
 * @public
 */
export type Transferable = string | number | boolean | Transferable[] | { [key: string]: Transferable; };

/**
 * This function is called every time a Message should be send to the Remote.
 * The provided data should be send to the Remote and then be provided as the argument to the newMessageHandler function of the RequestHandler.
 * @param data - the data to send to the remote (JSON Compatible).
 * @public
 */
export type SendMessageFunction = (data: Transferable) => Promise<void>;


/**
 * This function should be called for every Message received from remote.
 * @param data - the data wich was received from remote.
 * @public
 */
export type NewMessageHandler = (data: Transferable) => void;

/**
 * This function should be called if the connection to the remote is lost (for cleanup).
 * Also this will be called, if the ObjectStore.close is called.
 * @public
 */
export type DisconnectedHandler = () => void;

/**
 * Interface describing a Message channel (like postMessage or Websockets).
 * Can be used together with the Provided RequestHandler Implementation to make RemoteObjects work over a Message Channel.
 * @public
 */
export interface MessageHandlerInterface {
  /**
   * This function is invoked by the RequestHandler whenever data should be sent to the Remote.
   * The provided data should be send to the Remote and then be provided as the argument to the newMessageHandler function of the RequestHandler.
   * @param data - the data to send to the remote (JSON Compatible).
   */
  sendMessage: SendMessageFunction;
  /**
   * The RequestHandler will call this function with the newMessageHandler function in its constructor if it is defined.
   * @param newMessageHandler - the newMessageHandler function which should be called for every incoming message.
   */
  setNewMessageHandler?(newMessageHandler: NewMessageHandler): void;
  /**
   * The RequestHandler will call this function with the disconnectedHandler function in its constructor if it is defined.
   * @param disconnectedHandler - the disconnectedHandler function wich should be called if the connection to the remote is lost (for cleanup).
   */
  setDisconnectedHandler?(disconnectedHandler: DisconnectedHandler): void;
  /**
   * If the connection is closed from the side of the RequestHandler (close was called), this function is invoked to inform the Message Handler.
   */
  disconnectedHandler?: DisconnectedHandler;
}

/**
 * This function is/should be invoked for every request to the Remote.
 * The ObjectStore will give a JSON compatible Request to this function.
 * As a result the requestHandler function on the Remote ObjectStore should be invoked with this request Value.
 * The return value of the requestHandler (again JSON compatible) should be returned by this function asynchronously.
 * @param request - the request information to send to Remote (JSON Compatible).
 * @returns a Promise containing the response of the Request (JSON Compatible).
 * @public
 */
export type RequestHandlerFunction = (request: Transferable) => Promise<Transferable>;

/**
 * Interface describing an Request Handler.
 * You can use the included RequestHandler Class to use RemoteObjects with a MessageHandler or provide your own Request Handler.
 * @public
 */
export interface RequestHandlerInterface {
  /**
   * This function is invoked for every request to the Remote.
   * The ObjectStore will give a JSON compatible Request to this function.
   * As a result the requestHandler function on the Remote ObjectStore should be invoked with this request Value.
   * The return value of the requestHandler (again JSON compatible) should be returned by this function asynchronously.
  * @param request - the request information to send to Remote (JSON Compatible).
  * @returns a Promise containing the response of the Request (JSON Compatible).
   */
  request: RequestHandlerFunction;
  /**
   * The ObjectStore will call this function with the requestHandler function in its constructor if it is defined.
   * @param requestHandler - the requestHandler function which should be called for every incoming request.
   */
  setRequestHandler?(requestHandler: RequestHandlerFunction): void;
  /**
   * The ObjectStore will call this function with the disconnectedHandler function in its constructor if it is defined.
   * @param disconnectedHandler - the disconnectedHandler function wich should be called if the connection to the remote is lost (for cleanup).
   */
  setDisconnectedHandler?(disconnectedHandler: DisconnectedHandler): void;
  /**
   * The newMessage function of the ObjectStore will forward the Request to this function if it is defined.
   * @param data - the data wich was received from remote.
   */
  newMessageHandler?: NewMessageHandler;
  /**
   * If the connection is closed from the side of the ObjectStore (close was called), this function is invoked to inform the Request Handler.
   */
  disconnectedHandler?: DisconnectedHandler;
}