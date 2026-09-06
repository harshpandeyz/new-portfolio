/**
 * Tiny cross-component bridge for the admin shell.
 * Lets the command palette trigger contextual actions (message triage,
 * media upload) owned by the currently-mounted page — no prop drilling,
 * no global store, no extra dependencies.
 */

export interface MessageTriage {
  selectedCount: number;
  markSelectedRead: () => void;
  archiveSelected: () => void;
}

let triage: MessageTriage | null = null;
let uploadListener: (() => void) | null = null;

export const adminBus = {
  registerTriage(t: MessageTriage | null) {
    triage = t;
  },
  getTriage(): MessageTriage | null {
    return triage;
  },
  onUploadRequest(fn: (() => void) | null) {
    uploadListener = fn;
  },
  requestUpload() {
    uploadListener?.();
  },
};
