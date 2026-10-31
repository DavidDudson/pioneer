import { openStorage } from '../drawer/drawer-width';

const STORAGE_KEY = 'fr-shell-panel-minimised';
const MINIMISED = 'true';

/** Whether the user minimised the shell's panel in this browser. Unreadable storage reads as not minimised. */
export function readMinimised(document: Document): boolean {
  try {
    return openStorage(document)?.getItem(STORAGE_KEY) === MINIMISED;
  } catch {
    return false;
  }
}

export function writeMinimised(document: Document, minimised: boolean): void {
  try {
    const storage = openStorage(document);
    if (minimised) {
      storage?.setItem(STORAGE_KEY, MINIMISED);
    } else {
      storage?.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage full or blocked: the choice still applies for this session.
  }
}
