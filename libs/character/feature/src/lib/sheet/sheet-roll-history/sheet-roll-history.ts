import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import type { CharacterId } from '@pioneer/character/domain';
import { Temporal } from '@pioneer/shared/kernel';

import { ROLL_HISTORY_CAP } from '../../data/roll-history-entry';
import type { RollHistoryEntry } from '../../data/roll-history-entry';
import { ROLL_HISTORY_STORE } from '../../data/roll-history-store';
import { SheetState } from '../sheet-state';

/** What the entry keeps of a roll that the character's id and the clock add. */
export type RolledEntry = Omit<RollHistoryEntry, 'at' | 'character'>;

/** A roll as shown: under an id of this page's own, and the store's key once the store has kept it. */
interface Row {
  readonly id: number;
  readonly key: number | undefined;
  readonly entry: RollHistoryEntry;
}

/**
 * The open character's roll history: newest first, browser-local, capped and never synced (campaign rolls are Foundry's,
 * ADR-0018). A roll shows at once; store work runs one step at a time in the order it was asked, and a store that fails
 * costs only the keeping. Provided per sheet.
 */
@Injectable()
export class SheetRollHistory {
  readonly #store = inject(ROLL_HISTORY_STORE);
  readonly #sheet = inject(SheetState);
  readonly #rows = signal<ReadonlyArray<Row>>([]);
  readonly #id = computed((): CharacterId | undefined => this.#sheet.character()?.id);
  #queue: Promise<void> = Promise.resolve();
  #rolls = 0;

  /** Whether the drawer that lists the history is open. */
  public readonly open = signal(false);

  /** The rolls, newest first. */
  public readonly entries = computed((): ReadonlyArray<RollHistoryEntry> => this.#rows().map(({ entry }) => entry));

  /** The newest roll, which the header shows. */
  public readonly newest = computed((): RollHistoryEntry | undefined => this.#rows()[0]?.entry);

  public constructor() {
    effect(() => {
      const id = this.#id();

      if (id !== undefined) {
        untracked(() => {
          this.#rows.set([]);
          this.#enqueue(async () => this.#load(id));
        });
      }
    });
  }

  /** Keeps a roll as the newest. */
  public append(rolled: RolledEntry): void {
    const character = this.#id();

    if (character === undefined) {
      return;
    }

    this.#rolls += 1;
    const id = this.#rolls;
    const entry: RollHistoryEntry = { ...rolled, character, at: Temporal.Now.instant().epochMilliseconds };
    this.#rows.update((rows) => [{ id, key: undefined, entry }, ...rows].slice(0, ROLL_HISTORY_CAP));
    this.#enqueue(async () => {
      const key = await this.#store.append(entry, ROLL_HISTORY_CAP);
      this.#rows.update((rows) => rows.map((row) => (row.id === id ? { ...row, key } : row)));
    });
  }

  /** Rewrites the newest roll, as when a DC is typed after it was made. */
  public reviseNewest(revise: (entry: RollHistoryEntry) => RollHistoryEntry): void {
    const [newest] = this.#rows();

    if (newest === undefined) {
      return;
    }

    const { id } = newest;
    this.#rows.update((rows) => rows.map((row) => (row.id === id ? { ...row, entry: revise(row.entry) } : row)));
    // Queued behind the roll's own keeping, so its key is known by the time this runs.
    this.#enqueue(async () => {
      const row = this.#rows().find((kept) => kept.id === id);

      if (row?.key !== undefined) {
        await this.#store.replace(row.key, row.entry);
      }
    });
  }

  /** Drops every roll the character has. */
  public clear(): void {
    const character = this.#id();
    this.#rows.set([]);

    if (character !== undefined) {
      this.#enqueue(async () => {
        await this.#store.clear(character);
      });
    }
  }

  async #load(character: CharacterId): Promise<void> {
    const kept = await this.#store.list(character);

    if (this.#id() === character) {
      // Rolls made while the store was queued are not kept yet, and are newer than any it lists.
      this.#rows.update((rows) =>
        [
          ...rows.filter(({ key }) => key === undefined),
          ...kept.map(({ key, entry }) => ({ id: -key, key, entry })),
        ].slice(0, ROLL_HISTORY_CAP),
      );
    }
  }

  /** Runs `work` after what was asked before it; a store that fails is let go, so it cannot stop a roll. */
  #enqueue(work: () => Promise<void>): void {
    this.#queue = this.#run(this.#queue, work);
  }

  // oxlint-disable-next-line class-methods-use-this -- it only waits on what it is given, so it needs no state
  async #run(previous: Promise<void>, work: () => Promise<void>): Promise<void> {
    await previous;

    try {
      await work();
    } catch {
      // A history that cannot be kept (a private window, a full disk) must not stop a roll.
    }
  }
}
