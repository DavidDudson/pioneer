import { DOCUMENT, inject, Injectable, InjectionToken } from '@angular/core';

/** Where an invite token waits while its visitor signs in; `undefined` when storage is blocked. */
export const INVITE_STORAGE = new InjectionToken<Storage | undefined>('INVITE_STORAGE', {
  providedIn: 'root',
  factory: (): Storage | undefined => {
    try {
      return inject(DOCUMENT).defaultView?.sessionStorage;
    } catch {
      // Storage access throws when the browser blocks it (privacy settings, sandboxed frames).
      return undefined;
    }
  },
});

const STORAGE_KEY = 'pioneer.campaign.pendingInvite';

/**
 * The invite token from the link this tab opened. It is kept in session storage, never in a URL,
 * so it survives the sign-in round trip without reaching a server's logs. Cleared once the join
 * succeeds or the token turns out not to work.
 */
@Injectable({ providedIn: 'root' })
export class PendingInvite {
  readonly #storage = inject(INVITE_STORAGE);

  public keep(token: string): void {
    try {
      this.#storage?.setItem(STORAGE_KEY, token);
    } catch {
      // A full or blocked storage only costs the sign-in round trip: the visitor reopens the link.
    }
  }

  public read(): string | undefined {
    try {
      return this.#storage?.getItem(STORAGE_KEY) ?? undefined;
    } catch {
      return undefined;
    }
  }

  public clear(): void {
    try {
      this.#storage?.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clear when storage is blocked.
    }
  }
}
