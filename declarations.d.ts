// Declarations expected to be provided by the runtime where this code is executed.
declare namespace performance {
  function now(): number;
}
declare namespace console {
  function error(...args: any[]): void;
}
declare function setTimeout(fn: (...args: any[]) => any, ms: number): number;
declare function clearTimeout(id: number): void;
