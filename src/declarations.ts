
declare global {
  type TimerHandler = string | Function;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/clearInterval) */
  function clearInterval(id: number | undefined): void;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/clearTimeout) */
  function clearTimeout(id: number | undefined): void;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/setInterval) */
  function setInterval(handler: TimerHandler, timeout?: number, ...arguments: any[]): number;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/setTimeout) */
  function setTimeout(handler: TimerHandler, timeout?: number, ...arguments: any[]): number;
}

export default void 0;