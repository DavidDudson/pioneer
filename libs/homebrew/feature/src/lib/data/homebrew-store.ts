import { inject, Injectable, signal } from '@angular/core';
import { HomebrewContract } from '@pioneer/homebrew/domain';
import type {
  CreateHomebrewEntryBody,
  CreateHomebrewPackBody,
  HomebrewEntrySummary,
  HomebrewPack,
  PackDependencies,
  UpdateHomebrewEntryBody,
} from '@pioneer/homebrew/domain';
import { ContentPackId } from '@pioneer/rules/sdk';
import type { ContentId, PackVisibility } from '@pioneer/rules/sdk';
import { ApiClient } from '@pioneer/shared/web';
import { injectQuery, QueryClient } from '@tanstack/angular-query-experimental';

/** TanStack Query keys for the homebrew feature. */
const homebrewKeys = {
  all: ['homebrew'] as const,
  list: () => [...homebrewKeys.all, 'list'] as const,
  detail: (id: string | undefined) => [...homebrewKeys.all, 'detail', id] as const,
  dependencies: (id: string | undefined) => [...homebrewKeys.all, 'dependencies', id] as const,
  entries: (id: string | undefined, archived: boolean) => [...homebrewKeys.all, 'entries', id, archived] as const,
  entriesOf: (id: string | undefined) => [...homebrewKeys.all, 'entries', id] as const,
};

/** The route's pack id, parsed; a malformed one fails the query that asked. */
function parsedId(id: string | undefined): ContentPackId {
  if (id === undefined) {
    throw new Error('No pack selected');
  }

  return ContentPackId.parse(id);
}

/** Server state for the homebrew feature, cached by TanStack Query. Provided per route. */
@Injectable()
export class HomebrewStore {
  readonly #api = inject(ApiClient);
  readonly #client = inject(QueryClient);
  /** The route's id as given; parsed by the query, so a malformed one is a failed load, not a thrown binding. */
  readonly #selectedId = signal<string | undefined>(undefined);

  /** Every pack the user owns, newest first. */
  public readonly list = injectQuery(() => ({
    queryKey: homebrewKeys.list(),
    queryFn: async (): Promise<Array<HomebrewPack>> =>
      this.#api.call(HomebrewContract.list, { params: {}, body: undefined }),
  }));

  /** The open pack. */
  public readonly selected = injectQuery(() => {
    const id = this.#selectedId();

    return {
      queryKey: homebrewKeys.detail(id),
      queryFn: async (): Promise<HomebrewPack> =>
        this.#api.call(HomebrewContract.get, { params: { id: parsedId(id) }, body: undefined }),
      enabled: id !== undefined,
    };
  });

  /** The open pack's dependencies, and the packs its owner could add. */
  public readonly dependencies = injectQuery(() => {
    const id = this.#selectedId();

    return {
      queryKey: homebrewKeys.dependencies(id),
      queryFn: async (): Promise<PackDependencies> =>
        this.#api.call(HomebrewContract.dependencies, { params: { id: parsedId(id) }, body: undefined }),
      enabled: id !== undefined,
    };
  });

  /** Whether the entry list shows the archived entries (ADR-0062) in place of the live ones. */
  public readonly showArchived = signal(false);

  /** The open pack's entries: the live ones, or the archived ones while `showArchived` is on. */
  public readonly entries = injectQuery(() => {
    const id = this.#selectedId();
    const archived = this.showArchived();

    return {
      queryKey: homebrewKeys.entries(id, archived),
      queryFn: async (): Promise<Array<HomebrewEntrySummary>> =>
        this.#api.call(HomebrewContract.entries, {
          params: { id: parsedId(id) },
          query: { archived },
          body: undefined,
        }),
      enabled: id !== undefined,
    };
  });

  public select(id: string): void {
    this.#selectedId.set(id);
  }

  public async create(body: CreateHomebrewPackBody): Promise<HomebrewPack> {
    const pack = await this.#api.call(HomebrewContract.create, { params: {}, body });
    this.#client.setQueryData(homebrewKeys.detail(pack.id), pack);
    // Stale, not refetched now: the list refetches when it is next shown, so navigation isn't held up.
    await this.#client.invalidateQueries({ queryKey: homebrewKeys.list(), refetchType: 'none' });

    return pack;
  }
  /** Change who may read the pack. A refusal (409 while campaigns enable it) is thrown for the caller to show. */
  public async setVisibility(id: ContentPackId, visibility: PackVisibility): Promise<HomebrewPack> {
    const pack = await this.#api.call(HomebrewContract.setVisibility, { params: { id }, body: { visibility } });
    this.#client.setQueryData(homebrewKeys.detail(pack.id), pack);
    await this.#client.invalidateQueries({ queryKey: homebrewKeys.list(), refetchType: 'none' });

    return pack;
  }

  /** Make the pack extend another. A refusal (404, 409) is thrown for the caller to show. */
  public async addDependency(id: ContentPackId, dependsOn: ContentPackId): Promise<PackDependencies> {
    const result = await this.#api.call(HomebrewContract.addDependency, { params: { id }, body: { dependsOn } });
    this.#client.setQueryData(homebrewKeys.dependencies(id), result);

    return result;
  }

  /** Make the pack stop extending another. A refusal (409 while entries use it) is thrown for the caller to show. */
  public async removeDependency(id: ContentPackId, dependsOn: ContentPackId): Promise<PackDependencies> {
    const result = await this.#api.call(HomebrewContract.removeDependency, {
      params: { id, dependsOn },
      body: undefined,
    });

    this.#client.setQueryData(homebrewKeys.dependencies(id), result);

    return result;
  }

  /** Start an entry of `body.kind`. A refusal (409 for a taken slug, 422 for a kind that needs entries) is thrown. */
  public async createEntry(pack: ContentPackId, body: CreateHomebrewEntryBody): Promise<HomebrewEntrySummary> {
    const entry = await this.#api.call(HomebrewContract.createEntry, { params: { id: pack }, body });
    await this.#entriesChanged(pack);

    return entry;
  }

  /** Change an entry's name, level, rarity and traits. */
  public async updateEntry(
    pack: ContentPackId,
    entryId: ContentId,
    body: UpdateHomebrewEntryBody,
  ): Promise<HomebrewEntrySummary> {
    const entry = await this.#api.call(HomebrewContract.updateEntry, { params: { id: pack, entryId }, body });
    await this.#entriesChanged(pack);

    return entry;
  }

  /** Archive an entry (ADR-0062); it leaves the live list. */
  public async archiveEntry(pack: ContentPackId, entryId: ContentId): Promise<HomebrewEntrySummary> {
    const entry = await this.#api.call(HomebrewContract.archiveEntry, {
      params: { id: pack, entryId },
      body: undefined,
    });

    await this.#entriesChanged(pack);

    return entry;
  }

  /** Bring an archived entry back; it leaves the archived list. */
  public async restoreEntry(pack: ContentPackId, entryId: ContentId): Promise<HomebrewEntrySummary> {
    const entry = await this.#api.call(HomebrewContract.restoreEntry, {
      params: { id: pack, entryId },
      body: undefined,
    });

    await this.#entriesChanged(pack);

    return entry;
  }

  /** Both entry lists are stale, and so is the pack: its entry count and version moved. */
  async #entriesChanged(pack: ContentPackId): Promise<void> {
    await this.#client.invalidateQueries({ queryKey: homebrewKeys.entriesOf(pack) });
    await this.#client.invalidateQueries({ queryKey: homebrewKeys.detail(pack) });
    await this.#client.invalidateQueries({ queryKey: homebrewKeys.list(), refetchType: 'none' });
  }
}
