import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { CONTENT_SCOPE, ContentLoader } from '@pioneer/rules/data-access';
import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, ContentRegistry, Trait } from '@pioneer/rules/sdk';
import { CONTENT_LOCALE, IDLE_SCHEDULER } from '@pioneer/shared/web';

import { BROWSE_KINDS } from '../browser/browse-kinds';
import type { BrowseKind } from '../browser/browse-kinds';
import { isLegacyEntry, packLicenses, shownEntries } from '../browser/browse-legacy';
import { entriesOf } from '../browser/browse-list';
import { registryEntries, traitNamesOf } from '../entry/entry-lookup';

/** A kind the index loads: each browsable kind, and the trait vocabulary that names tags. */
type IndexedKind = BrowseKind | typeof ContentKind.Trait;

/** The trait vocabulary first, so tags are named before the entries that carry them load. */
const INDEXED_KINDS: readonly IndexedKind[] = [ContentKind.Trait, ...BROWSE_KINDS];

/**
 * The entries, official and in the homebrew packs in scope, the global search matches names in, loaded one kind at a time when the browser is idle. A
 * kind already in the browser's store costs no request. Typing never waits for it: it matches what has loaded so far,
 * and a kind that fails to load is tried again on the next `warm`.
 */
@Injectable()
export class GlobalSearchIndex {
  readonly #loader = inject(ContentLoader);
  readonly #scope = inject(CONTENT_SCOPE);
  readonly #locale = inject(CONTENT_LOCALE);
  readonly #whenIdle = inject(IDLE_SCHEDULER);
  readonly #byId = signal<ReadonlyMap<ContentId, ContentEntry>>(new Map());
  readonly #legacy = signal<ReadonlySet<ContentId>>(new Set());
  readonly #traitNames = signal<ReadonlyMap<Trait, string>>(new Map());
  readonly #done = new Set<IndexedKind>();
  #running = false;
  /** Counts the times the index was emptied for a new locale, so a load that started before one is dropped. */
  #generation = 0;

  public constructor() {
    let shown = this.#locale();

    effect(() => {
      const next = this.#locale();

      if (next !== shown) {
        shown = next;
        this.#reset();
      }
    });
  }

  /** The entries loaded so far, and by id. */
  public readonly entries = computed<readonly ContentEntry[]>(() => [...this.#byId().values()]);
  public readonly byId = this.#byId.asReadonly();
  /** The name of each trait loaded, for the tags an option shows; traits are named here, never listed as results. */
  public readonly traitNames = this.#traitNames.asReadonly();
  /** The ids of the loaded entries from a pre-remaster book. */
  public readonly legacy = this.#legacy.asReadonly();

  /** Starts loading the kinds not loaded yet, a kind per idle moment. Does nothing while a pass is running. */
  public warm(): void {
    if (!this.#scope().ready) {
      return;
    }

    if (this.#running) {
      return;
    }

    this.#running = true;
    this.#next(this.#generation);
  }

  #next(generation: number): void {
    const kind = INDEXED_KINDS.find((each) => !this.#done.has(each));

    if (kind === undefined) {
      this.#running = false;

      return;
    }

    this.#whenIdle(() => {
      // A callback queued before a locale switch belongs to the index that was emptied: it does nothing.
      if (generation !== this.#generation) {
        return;
      }

      // oxlint-disable-next-line typescript/no-floating-promises -- #load catches every error, so it never rejects
      this.#load(kind, generation);
    });
  }

  /** Names are in the locale they were loaded in, so a new locale starts the index over; the next `warm` loads it. */
  #reset(): void {
    this.#generation += 1;
    this.#byId.set(new Map());
    this.#legacy.set(new Set());
    this.#traitNames.set(new Map());
    this.#done.clear();
    this.#running = false;
  }

  async #load(kind: IndexedKind, generation: number): Promise<void> {
    try {
      const registry = await this.#loader.registry([kind], this.#scope().homebrew);

      if (generation !== this.#generation) {
        return;
      }

      if (kind === ContentKind.Trait) {
        this.#traitNames.set(traitNamesOf(registryEntries(registry)));
      } else {
        this.#add(registry, kind);
      }

      this.#done.add(kind);
      this.#next(generation);
    } catch {
      // Not loaded: the kind is tried again the next time the box opens. A pass from before a switch is not this one.
      if (generation === this.#generation) {
        this.#running = false;
      }
    }
  }

  #add(registry: ContentRegistry, kind: BrowseKind): void {
    const licenses = packLicenses(registry);
    const loaded = shownEntries(entriesOf(registry, [kind]), licenses, this.#scope().legacy);
    this.#byId.update(
      (held) => new Map([...held, ...loaded.map((entry): [ContentId, ContentEntry] => [entry.id, entry])]),
    );
    this.#legacy.update(
      (held) => new Set([...held, ...loaded.filter((entry) => isLegacyEntry(entry, licenses)).map(({ id }) => id)]),
    );
  }
}
