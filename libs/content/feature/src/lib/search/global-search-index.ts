import { computed, inject, Injectable, signal } from '@angular/core';
import { ContentLoader } from '@pioneer/rules/data-access';
import type { ContentEntry, ContentId } from '@pioneer/rules/sdk';
import { IDLE_SCHEDULER } from '@pioneer/shared/web';

import { BROWSE_KINDS } from '../browser/browse-kinds';
import type { BrowseKind } from '../browser/browse-kinds';
import { entriesOf } from '../browser/browse-list';

/**
 * The official entries the global search matches names in, loaded one kind at a time when the browser is idle. A
 * kind already in the browser's store costs no request. Typing never waits for it: it matches what has loaded so far,
 * and a kind that fails to load is tried again on the next `warm`.
 */
@Injectable({ providedIn: 'root' })
export class GlobalSearchIndex {
  readonly #loader = inject(ContentLoader);
  readonly #whenIdle = inject(IDLE_SCHEDULER);
  readonly #byId = signal<ReadonlyMap<ContentId, ContentEntry>>(new Map());
  readonly #done = new Set<BrowseKind>();
  #running = false;

  /** The entries loaded so far, and by id. */
  public readonly entries = computed<readonly ContentEntry[]>(() => [...this.#byId().values()]);
  public readonly byId = this.#byId.asReadonly();

  /** Starts loading the kinds not loaded yet, a kind per idle moment. Does nothing while a pass is running. */
  public warm(): void {
    if (this.#running) {
      return;
    }
    this.#running = true;
    this.#next();
  }

  #next(): void {
    const kind = BROWSE_KINDS.find((each) => !this.#done.has(each));
    if (kind === undefined) {
      this.#running = false;
      return;
    }
    this.#whenIdle(() => {
      // oxlint-disable-next-line typescript/no-floating-promises -- #load catches every error, so it never rejects
      this.#load(kind);
    });
  }

  async #load(kind: BrowseKind): Promise<void> {
    try {
      const registry = await this.#loader.registry([kind]);
      const loaded = entriesOf(registry, [kind]);
      this.#byId.update(
        (held) => new Map([...held, ...loaded.map((entry): [ContentId, ContentEntry] => [entry.id, entry])]),
      );
      this.#done.add(kind);
      this.#next();
    } catch {
      // Not loaded: the kind is tried again the next time the box opens.
      this.#running = false;
    }
  }
}
