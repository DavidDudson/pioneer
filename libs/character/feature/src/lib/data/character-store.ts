import { computed, inject, Injectable, linkedSignal, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { CharacterContract, CharacterPatchField } from '@pioneer/character/domain';
import type {
  Character,
  CharacterId,
  CharacterLanguages,
  CharacterPatch,
  CharacterSheet,
  CharacterSlot,
  ClearedPick,
  CreateCharacterBody,
  PatchedCharacterSheet,
} from '@pioneer/character/domain';
import { PathbuilderImportContract } from '@pioneer/interop/pathbuilder';
import type { CharacterImportReport } from '@pioneer/interop/pathbuilder';
import type { ChoiceValue, SlotKey } from '@pioneer/rules/sdk';
import { ApiClient, ApiError } from '@pioneer/shared/web';
import { injectQuery, QueryClient } from '@tanstack/angular-query-experimental';

/** TanStack Query keys for the character feature. */
const characterKeys = {
  all: ['characters'] as const,
  list: () => [...characterKeys.all, 'list'] as const,
  detail: (id: CharacterId | undefined) => [...characterKeys.all, 'detail', id] as const,
};

/**
 * Server state for the character feature, cached by TanStack Query.
 * Queries are regions' data; commands update the cache so only the regions
 * that changed refresh. The UI owns each command's pending/success/error
 * state (`fr-async-*`, `InlineEdit`). Provided per route.
 */
@Injectable()
export class CharacterStore {
  readonly #api = inject(ApiClient);
  readonly #client = inject(QueryClient);
  readonly #selectedId = signal<CharacterId | undefined>(undefined);
  readonly #importReports = signal<ReadonlyMap<CharacterId, CharacterImportReport>>(new Map());
  readonly #cleared = signal<readonly ClearedPick[]>([]);

  public readonly list = injectQuery(() => ({
    queryKey: characterKeys.list(),
    queryFn: async (): Promise<Character[]> => this.#api.call(CharacterContract.list, { params: {}, body: undefined }),
  }));

  readonly #selected = injectQuery(() => {
    const id = this.#selectedId();
    return {
      queryKey: characterKeys.detail(id),
      queryFn: async (): Promise<CharacterSheet> => {
        if (id === undefined) {
          throw new Error('No character selected');
        }
        return this.#api.call(CharacterContract.get, { params: { id }, body: undefined });
      },
      enabled: id !== undefined,
    };
  });

  /**
   * The open character's sheet as the cache holds it. Follows the query, and is set
   * directly on writes so the next save sees the new version at once rather
   * than after TanStack's next notify.
   */
  readonly #current = linkedSignal(() => this.#selected.data());

  /** The open character; `undefined` while loading. */
  public readonly selected: Signal<Character | undefined> = computed(() => this.#current()?.character);

  /** Every slot of the open character with its status, as the server read it; `undefined` while loading. */
  public readonly slots: Signal<readonly CharacterSlot[] | undefined> = computed(() => this.#current()?.slots);

  /** The open character's languages, as the server read them; `undefined` while loading. */
  public readonly languages: Signal<CharacterLanguages | undefined> = computed(() => this.#current()?.languages);

  public select(id: CharacterId): void {
    if (id !== this.#selectedId()) {
      this.#cleared.set([]);
    }
    this.#selectedId.set(id);
  }

  public async create(body: CreateCharacterBody): Promise<Character> {
    // The sheet isn't seeded: the server reads its slots on the sheet's first fetch.
    const character = await this.#api.call(CharacterContract.create, { params: {}, body });
    // Stale, not refetched now: the list refetches when it is next shown, so navigation isn't held up.
    await this.#client.invalidateQueries({ queryKey: characterKeys.list(), refetchType: 'none' });
    return character;
  }

  /**
   * A new character from a Pathbuilder export (`raw`, the export as pasted). The server reads it again. Its import
   * report is kept for the sheet until dismissed; it is held here, not stored, so a reload drops it.
   */
  public async importPathbuilder(raw: unknown): Promise<Character> {
    const { character, report } = await this.#api.call(PathbuilderImportContract.import, { params: {}, body: raw });
    this.#importReports.update((reports) => new Map(reports).set(character.id, report));
    await this.#client.invalidateQueries({ queryKey: characterKeys.list(), refetchType: 'none' });
    return character;
  }

  /** The open character's import report, until dismissed; `undefined` for one that wasn't just imported. */
  public readonly importReport: Signal<CharacterImportReport | undefined> = computed(() => {
    const id = this.#selectedId();
    return id === undefined ? undefined : this.#importReports().get(id);
  });

  public dismissImportReport(): void {
    const id = this.#selectedId();
    if (id === undefined) {
      return;
    }
    this.#importReports.update((reports) => {
      const next = new Map(reports);
      next.delete(id);
      return next;
    });
  }

  /**
   * The picks the last edit cleared because a slot they are within changed (a heritage of the old ancestry), until
   * dismissed or the next edit. Held here, not stored: the server reports them once.
   */
  public readonly cleared: Signal<readonly ClearedPick[]> = this.#cleared.asReadonly();

  public dismissCleared(): void {
    this.#cleared.set([]);
  }

  /** One edit. On success the cached sheet becomes the server's new version, slots read again. */
  public async patch(patch: CharacterPatch): Promise<void> {
    const current = this.selected();
    if (current === undefined) {
      throw new Error('No character selected');
    }
    // A notice describes the last edit only: any new edit, saved or refused, retires it.
    this.#cleared.set([]);
    try {
      const saved = await this.#api.call(CharacterContract.patch, {
        params: { id: current.id },
        body: { expectedVersion: current.version, patch },
      });
      this.#saved(saved);
      // The list shows names and levels; mark it stale without refetching the sheet.
      await this.#client.invalidateQueries({ queryKey: characterKeys.list(), refetchType: 'none' });
    } catch (error: unknown) {
      if (ApiError.isConflict(error)) {
        // Someone else saved first: pull their version so every field re-syncs.
        await this.#client.invalidateQueries({ queryKey: characterKeys.detail(current.id) });
        this.#current.set(this.#client.getQueryData<CharacterSheet>(characterKeys.detail(current.id)));
      }
      throw error;
    }
  }

  /** The cached sheet becomes the server's answer to an edit, and its cleared picks the ones to show. */
  #saved({ cleared, ...sheet }: PatchedCharacterSheet): void {
    this.#client.setQueryData(characterKeys.detail(sheet.character.id), sheet);
    this.#current.set(sheet);
    this.#cleared.set(cleared);
  }

  /** Picks `selection` in `slot`. The server refuses a slot the character has at no level, or an option it doesn't offer. */
  public async selectSlot(slot: SlotKey, selection: ChoiceValue): Promise<void> {
    await this.patch({ field: CharacterPatchField.SelectSlot, slot, selection });
  }

  /** Empties `slot`, keeping every other pick. */
  public async clearSlot(slot: SlotKey): Promise<void> {
    await this.patch({ field: CharacterPatchField.ClearSlot, slot });
  }
}
