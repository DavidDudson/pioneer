import { computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import type { QueryParams } from '@pioneer/rules/sdk';
import type { SpellFilterChange, SpellFilterGroup, SpellRowLine } from '@pioneer/rules/ui';

import {
  SPELL_FILTER_CLEARED,
  spellFilterFromQuery,
  spellFilterGroups,
  spellFilterToQuery,
  withSpellPicks,
  wordValue,
} from './sheet-spell-filter';
import type { SpellPicks } from './sheet-spell-filter';
import { sheetSpellList, sheetSpells } from './sheet-spell-list';
import type { SpellOrigins } from './sheet-spell-list';

const NO_PARAMS: QueryParams = {};

/** What the Spells tab filters its list with (#1785): the groups the panel shows, the rows left, and what the player picks. */
export interface SpellFilters {
  /** The filter panel's groups, from the character's own spells so no option matches nothing. */
  readonly groups: Signal<readonly SpellFilterGroup[]>;
  /** Every spell the character can cast, one row per source, that passes the picks. */
  readonly list: Signal<readonly SpellRowLine[]>;
  readonly pick: (change: SpellFilterChange) => Promise<void>;
  /** Clears every pick at once. */
  readonly clear: () => Promise<void>;
}

/** What the filters read: the spells' origins, the words and when they change. */
export interface SpellFilterSources {
  readonly origins: Signal<SpellOrigins>;
  readonly translate: (key: string) => string;
  /** Changes when the language changes or the messages load, so the words are read again. */
  readonly messages: Signal<unknown>;
}

/**
 * The spell filters, kept in the URL (`s.<group>`) so a filtered list can be linked. A change replaces the URL rather
 * than adding to history, as the shop's filters do.
 */
export function injectSpellFilters({ origins, translate, messages }: SpellFilterSources): SpellFilters {
  const route = inject(ActivatedRoute);
  const router = inject(Router);
  const params = toSignal(route.queryParams, { initialValue: NO_PARAMS });
  const picks = computed((): SpellPicks => spellFilterFromQuery(params()));

  const write = async (queryParams: Readonly<Record<string, readonly string[] | undefined>>): Promise<void> => {
    await router.navigate([], { relativeTo: route, queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  };

  return {
    groups: computed((): readonly SpellFilterGroup[] => {
      messages();
      return spellFilterGroups(sheetSpells(origins()), picks(), { label: translate, value: wordValue(translate) });
    }),
    list: computed((): readonly SpellRowLine[] => sheetSpellList(origins(), picks())),
    pick: async ({ group, selected }) => {
      const next = withSpellPicks(picks(), group, selected);
      await write(spellFilterToQuery(next));
    },
    clear: async () => write(SPELL_FILTER_CLEARED),
  };
}
