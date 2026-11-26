/// <reference types="bun" />
// oxlint-disable-next-line import/no-unassigned-import -- the rules/ui barrel declares components, which need Angular's JIT compiler under bun
import '@angular/compiler';
import type { SpellOption } from '@pioneer/character/domain';
import {
  AreaValue,
  CastActions,
  ContentId,
  ContentText,
  DefenseValue,
  DurationValue,
  MagicTradition,
  RangeBand,
  Rarity,
  SpellRank,
  TargetValue,
} from '@pioneer/rules/sdk';
import { benchmark } from '@pioneer/shared/bench';

import { spellRows } from './sheet-spell-rows';
import type { SpellRowReads } from './sheet-spell-rows';

/** Spells a picker offers a slot: every spell of a tradition the character can cast. */
const SPELLS = 1000;

/** Spells the entry holds in other slots already. */
const TAKEN_EVERY = 20;

const RANKS = 9;
const FIRST_RANK = 1;

/** The rows of a thousand spells take about 0.04 ms; the budget leaves room for a noisy runner. */
const BUDGET_MS = 1;

const spellId = (index: number): ContentId =>
  ContentId.parse(`00000000-0000-4000-8000-${String(index).padStart(12, '0')}`);

function spells(): readonly SpellOption[] {
  return Array.from({ length: SPELLS }, (_value, index): SpellOption => ({
    id: spellId(index),
    name: ContentText.parse(`Spell ${index}`),
    rank: SpellRank.parse((index % RANKS) + FIRST_RANK),
    traditions: [MagicTradition.Arcane],
    rarity: Rarity.Common,
    cantrip: false,
    focus: false,
    cast: [CastActions.Two],
    range: [RangeBand.UpTo30],
    area: AreaValue.None,
    targets: [TargetValue.Single],
    defense: [DefenseValue.None],
    duration: [DurationValue.Instant],
    traits: [],
    sources: [],
  }));
}

const reads: SpellRowReads = {
  translate: (key) => key,
  castRank: SpellRank.parse(RANKS),
  taken: new Set(Array.from({ length: SPELLS / TAKEN_EVERY }, (_value, index) => spellId(index * TAKEN_EVERY))),
  registry: undefined,
};

const rows = spellRows(spells(), reads);
const disabled = rows.filter((row) => row.disabledReason !== undefined).length;

if (rows.length !== SPELLS || disabled !== SPELLS / TAKEN_EVERY) {
  throw new Error('a row each, and one disabled for each spell taken');
}

benchmark({
  name: 'character: spell picker rows over a thousand spells',
  budgetMs: BUDGET_MS,
  prepare: spells,
  run: (given) => spellRows(given, reads),
});
