/**
 * Test environment setup.
 * Node 26 shadows jsdom's localStorage with an inert native stub, so we
 * install a spec-compliant Map-backed shim before tests run.
 */
if (typeof globalThis.localStorage === "undefined" || globalThis.localStorage === undefined) {
  const store = new Map<string, string>();
  const shim = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => void store.set(String(key), String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => void store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", { value: shim, configurable: true, writable: true });
  Object.defineProperty(globalThis, "sessionStorage", { value: shim, configurable: true, writable: true });
}
