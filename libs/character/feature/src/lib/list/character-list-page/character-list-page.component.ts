import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { CharacterPageQuery, CharacterSearch, FIRST_PAGE, PageNumber } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  Button,
  DateDisplay,
  EmptyState,
  Grid,
  Link,
  OptionalNumberInput,
  Page,
  PageBody,
  PageHeader,
  SearchInput,
  Skeleton,
  Stack,
  Surface,
  Text,
} from '@pioneer/frontier';
import { VirtualItem, VirtualList } from '@pioneer/frontier/data';
import { AncestryId, ContentId } from '@pioneer/rules/sdk';
import { OptionPicker } from '@pioneer/rules/ui';
import { Users } from 'lucide';
import { from } from 'rxjs';

import { AncestryOptions } from '../../data/ancestry-options';
import { CharacterFilterOptions } from '../../data/character-filter-options';
import { CHARACTER_LIST_EXTRAS } from '../../data/character-list-extras';
import { isFiltered, listStateFromParams, pageCount, paramsFromListState } from '../../data/character-list-filters';
import { injectCharacterList } from '../../data/character-list-query';

/** Skeleton cards shown while the list loads. */
const PLACEHOLDERS = ['first', 'second', 'third'] as const;

const characterKey = (character: Character): string => character.id;

/** The level an edited box holds, or none while it is empty or out of range. */
const levelOf = (level: number | undefined): CharacterPageQuery['minLevel'] =>
  CharacterPageQuery.shape.minLevel.safeParse(level).data;

/**
 * The home list: the player's characters a page at a time, narrowed by level, class, ancestry and name. The state
 * lives in the address's query string, so a reload or a shared link restores it; every control navigates to a new one.
 */
@Component({
  selector: 'pio-character-list-page',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    Button,
    DateDisplay,
    EmptyState,
    Grid,
    Link,
    NgComponentOutlet,
    OptionalNumberInput,
    OptionPicker,
    Page,
    PageBody,
    PageHeader,
    SearchInput,
    Skeleton,
    Stack,
    Surface,
    Text,
    TranslocoPipe,
    VirtualItem,
    VirtualList,
  ],
  templateUrl: './character-list-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterListPage {
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #params = toSignal(this.#route.queryParamMap, { requireSync: true });
  readonly #options = inject(CharacterFilterOptions);

  /** The list's state, read from the address. */
  protected readonly state = computed(() => listStateFromParams(this.#params()));
  protected readonly filtered = computed(() => isFiltered(this.state()));
  protected readonly characters = injectCharacterList(this.state);
  protected readonly ancestries = inject(AncestryOptions);
  readonly #extraLoaders = inject(CHARACTER_LIST_EXTRAS);
  readonly #extrasLoaded = Promise.all(this.#extraLoaders.map(async (load) => load()));
  /** Loaded on demand: empty in production, the sample imports in development. */
  protected readonly extras = toSignal(from(this.#extrasLoaded), { initialValue: [] });

  /** The class and ancestry filters' choices; none while the content loads. */
  protected readonly classOptions = this.#options.classes;
  protected readonly ancestryOptions = this.#options.ancestries;

  protected readonly placeholders = PLACEHOLDERS;
  protected readonly emptyIcon = Users;
  protected readonly characterKey = characterKey;
  protected readonly pageCount = pageCount;

  /** Searches the name; an empty search shows every name. */
  protected async searchName(text: string): Promise<void> {
    const name = CharacterSearch.safeParse(text);
    await this.#show({ ...this.state(), name: name.success ? name.data : undefined, page: FIRST_PAGE });
  }

  protected async setMinLevel(level: number | undefined): Promise<void> {
    await this.#show({ ...this.state(), minLevel: levelOf(level), page: FIRST_PAGE });
  }

  protected async setMaxLevel(level: number | undefined): Promise<void> {
    await this.#show({ ...this.state(), maxLevel: levelOf(level), page: FIRST_PAGE });
  }

  protected async setClass(id: string | undefined): Promise<void> {
    const picked = ContentId.safeParse(id);
    await this.#show({ ...this.state(), classId: picked.success ? picked.data : undefined, page: FIRST_PAGE });
  }

  protected async setAncestry(id: string | undefined): Promise<void> {
    const picked = AncestryId.safeParse(id);
    await this.#show({ ...this.state(), ancestry: picked.success ? picked.data : undefined, page: FIRST_PAGE });
  }

  /** Goes to `page`, keeping the filters. */
  protected async goTo(page: number): Promise<void> {
    await this.#show({ ...this.state(), page: PageNumber.parse(page) });
  }

  /** Drops every filter, which restores the whole list from its first page. */
  protected async clearFilters(): Promise<void> {
    const { sort, direction } = this.state();
    await this.#show(CharacterPageQuery.parse({ sort, direction }));
  }

  async #show(state: CharacterPageQuery): Promise<void> {
    await this.#router.navigate([], { relativeTo: this.#route, queryParams: paramsFromListState(state) });
  }
}
