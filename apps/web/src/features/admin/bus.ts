/**
 * Tiny typed event bridge for the admin shell.
 * Lets the command palette trigger contextual actions (message triage,
 * media upload) owned by the currently-mounted page — no prop drilling,
 * no global store, no extra dependencies.
 *
 * Supports multiple subscribers per event; each subscribe() returns an
 * unsubscribe function. Legacy registerTriage/onUploadRequest helpers are
 * kept as thin wrappers so existing pages keep working.
 */

export interface MessageTriage {
  selectedCount: number;
  markSelectedRead: () => void;
  archiveSelected: () => void;
}

type Handler<T> = (payload: T) => void;

function createEmitter<T>() {
  const handlers = new Set<Handler<T>>();
  return {
    subscribe(fn: Handler<T>): () => void {
      handlers.add(fn);
      return () => {
        handlers.delete(fn);
      };
    },
    emit(payload: T): number {
      let n = 0;
      handlers.forEach((fn) => {
        try {
          fn(payload);
          n += 1;
        } catch {
          /* one bad listener must not break others */
        }
      });
      return n;
    },
    get size(): number {
      return handlers.size;
    },
  };
}

const uploadRequests = createEmitter<void>();

let triage: MessageTriage | null = null;
const triageListeners = new Set<() => void>();

function notifyTriage() {
  triageListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}

export const adminBus = {
  registerTriage(t: MessageTriage | null) {
    triage = t;
    notifyTriage();
  },
  getTriage(): MessageTriage | null {
    return triage;
  },
  onTriageChange(fn: () => void): () => void {
    triageListeners.add(fn);
    return () => {
      triageListeners.delete(fn);
    };
  },
  onUploadRequest(fn: (() => void) | null): () => void {
    if (!fn) return () => undefined;
    return uploadRequests.subscribe(() => fn());
  },
  requestUpload(): boolean {
    return uploadRequests.emit(undefined) > 0;
  },
};
