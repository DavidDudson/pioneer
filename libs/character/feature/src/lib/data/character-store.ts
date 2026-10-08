import { inject, Injectable, linkedSignal, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { CharacterContract } from '@pioneer/character/domain';
import type { Character, CharacterId, CharacterPatch, CreateCharacterBody } from '@pioneer/character/domain';
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

  public readonly list = injectQuery(() => ({
    queryKey: characterKeys.list(),
    queryFn: async (): Promise<Character[]> => this.#api.call(CharacterContract.list, { params: {}, body: undefined }),
  }));

  readonly #selected = injectQuery(() => {
    const id = this.#selectedId();
    return {
      queryKey: characterKeys.detail(id),
      queryFn: async (): Promise<Character> => {
        if (id === undefined) {
          throw new Error('No character selected');
        }
        return this.#api.call(CharacterContract.get, { params: { id }, body: undefined });
      },
      enabled: id !== undefined,
    };
  });

  /**
   * The open character as the cache holds it. Follows the query, and is set
   * directly on writes so the next save sees the new version at once rather
   * than after TanStack's next notify.
   */
  readonly #current = linkedSignal(() => this.#selected.data());

  /** The open character; `undefined` while loading. */
  public readonly selected: Signal<Character | undefined> = this.#current.asReadonly();

  public select(id: CharacterId): void {
    this.#selectedId.set(id);
  }

  public async create(body: CreateCharacterBody): Promise<Character> {
    const character = await this.#api.call(CharacterContract.create, { params: {}, body });
    this.#client.setQueryData(characterKeys.detail(character.id), character);
    // Stale, not refetched now: the list refetches when it is next shown, so navigation isn't held up.
    await this.#client.invalidateQueries({ queryKey: characterKeys.list(), refetchType: 'none' });
    return character;
  }

  /** One field edit. On success the cached character becomes the server's new version. */
  public async patch(patch: CharacterPatch): Promise<void> {
    const current = this.selected();
    if (current === undefined) {
      throw new Error('No character selected');
    }
    try {
      const saved = await this.#api.call(CharacterContract.patch, {
        params: { id: current.id },
        body: { expectedVersion: current.version, patch },
      });
      this.#client.setQueryData(characterKeys.detail(saved.id), saved);
      this.#current.set(saved);
      // The list shows names and levels; mark it stale without refetching the sheet.
      await this.#client.invalidateQueries({ queryKey: characterKeys.list(), refetchType: 'none' });
    } catch (error: unknown) {
      if (ApiError.isConflict(error)) {
        // Someone else saved first: pull their version so every field re-syncs.
        await this.#client.invalidateQueries({ queryKey: characterKeys.detail(current.id) });
        this.#current.set(this.#client.getQueryData<Character>(characterKeys.detail(current.id)));
      }
      throw error;
    }
  }
}
