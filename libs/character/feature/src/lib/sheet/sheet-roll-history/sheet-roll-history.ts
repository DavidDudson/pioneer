import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import type { CharacterId } from '@pioneer/character/domain';
import { Temporal } from '@pioneer/shared/kernel';

import { ROLL_HISTORY_CAP } from '../../data/roll-history-entry';
import type { KeptRoll, RollHistoryEntry } from '../../data/roll-history-entry';
import { ROLL_HISTORY_STORE } from '../../data/roll-history-store';
import { SheetState } from '../sheet-state';

/** What the entry keeps of a roll that the character's id and the clock add. */
export type RolledEntry = Omit<RollHistoryEntry, 'at' | 'character' | 'reasons'> & {
  readonly reasons: ReadonlyArray<string>;
};

/**
 * The open character's roll history (#342): newest first, kept in the browser and capped, never synced (campaign rolls
 * are Foundry's, ADR-0018). Reads the store once the character is known, and keeps what it shows ahead of the store, so
 * a roll shows at once and a store that fails (a private window, a full disk) costs only the keeping. Provided per sheet.
 */
@Injectable()
export class SheetRollHistory {
  readonly #store = inject(ROLL_HISTORY_STORE);
  readonly #sheet = inject(SheetState);
  readonly #kept = signal<ReadonlyArray<KeptRoll>>([]);
  readonly #id = computed((): CharacterId | undefined => this.#sheet.character()?.id);
  /** The key the newest roll waits on; set once the store has kept it. */
  #newest: Promise<number | undefined> | undefined;

  /** Whether the drawer that lists the history is open. */
  public readonly open = signal(false);

  /** The rolls, newest first. */
  public readonly entries = computed((): ReadonlyArray<RollHistoryEntry> => this.#kept().map(({ entry }) => entry));

  /** The newest roll, which the header shows. */
  public readonly newest = computed((): RollHistoryEntry | undefined => this.#kept()[0]?.entry);

  public constructor() {
    effect(() => {
      const id = this.#id();

      if (id !== undefined) {
        untracked(() => {
          // oxlint-disable-next-line typescript/no-floating-promises -- #load catches every error, so it never rejects
          this.#load(id);
        });
      }
    });
  }

  /** Keeps a roll as the newest. */
  public async append(rolled: RolledEntry): Promise<void> {
    const character = this.#id();

    if (character === undefined) {
      return;
    }

    const entry: RollHistoryEntry = { ...rolled, character, at: Temporal.Now.instant().epochMilliseconds };
    // The key is the store's to give; until it does, the roll shows under a key no store hands out.
    this.#kept.update((kept) => [{ key: -1, entry }, ...kept].slice(0, ROLL_HISTORY_CAP));
    const stored = this.#keep(entry);
    this.#newest = stored;
    const key = await stored;

    if (key !== undefined) {
      this.#kept.update((kept) => kept.map((roll) => (roll.entry === entry ? { key, entry } : roll)));
    }
  }

  /** Rewrites the newest roll, as when a DC is typed after it was made. */
  public async reviseNewest(revise: (entry: RollHistoryEntry) => RollHistoryEntry): Promise<void> {
    const [newest] = this.#kept();

    if (newest === undefined) {
      return;
    }

    const entry = revise(newest.entry);
    this.#kept.update((kept) => kept.map((roll) => (roll === newest ? { key: roll.key, entry } : roll)));
    const key = newest.key === -1 ? await this.#newest : newest.key;

    if (key !== undefined) {
      await this.#attempt(async () => this.#store.replace(key, entry));
    }
  }

  /** Drops every roll the character has. */
  public async clear(): Promise<void> {
    const character = this.#id();
    this.#kept.set([]);

    if (character !== undefined) {
      await this.#attempt(async () => this.#store.clear(character));
    }
  }

  async #load(character: CharacterId): Promise<void> {
    const kept = await this.#attempt(async () => this.#store.list(character));

    if (kept !== undefined && this.#id() === character) {
      // Rolls made while this read was out are newer than any it found.
      this.#kept.update((fresh) => [...fresh.filter(({ key }) => !kept.some((stored) => stored.key === key)), ...kept]);
    }
  }

  async #keep(entry: RollHistoryEntry): Promise<number | undefined> {
    return this.#attempt(async () => this.#store.append(entry, ROLL_HISTORY_CAP));
  }

  /** `work`'s answer, or undefined when the store failed: a history that cannot be kept must not stop a roll. */
  // oxlint-disable-next-line class-methods-use-this -- it wraps the work it is given, so it needs no state
  async #attempt<TResult>(work: () => Promise<TResult>): Promise<TResult | undefined> {
    try {
      return await work();
    } catch {
      return undefined;
    }
  }
}
