import { ACTION_COUNT, ContentKind, entrySlug, Slug, SpellRank } from '@pioneer/rules/sdk';
import type { EntrySlug } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import { spellCost } from './action-costs';
import type { InventoryItem } from './inventory';
import type { ItemContent, ItemEntry } from './inventory-content';
import { hasEtchedRune } from './item-runes';
import type { RuneContent } from './item-runes';
import type { SpellContent, SpellOption } from './spell-content';

const RESERVOIR: EntrySlug = entrySlug(ContentKind.Rune, Slug.parse('spell-reservoir'));

/** The highest rank of a spell a spell reservoir rune holds: 3rd. */
export const RESERVOIR_RANK_MAX = SpellRank.parse(3);

/** The most actions a spell cast into a spell reservoir rune can take to cast. */
const RESERVOIR_CAST_MAX = 2;

/** Why a spell cannot be cast into a spell reservoir rune. */
export const ReservoirProblem = {
  NoRune: 'noRune',
  Occupied: 'occupied',
  UnknownSpell: 'unknownSpell',
  RankTooHigh: 'rankTooHigh',
  TooLongToCast: 'tooLongToCast',
} as const;
export type ReservoirProblem = ValueOf<typeof ReservoirProblem>;

/** Whether the item has a spell reservoir rune etched on it. */
export function hasReservoirRune(line: InventoryItem, base: ItemEntry | undefined, runes: RuneContent): boolean {
  return hasEtchedRune(line, base, { runes, slug: RESERVOIR });
}

/** Whether `spell` takes more than two actions to cast, or is cast over minutes, as no turn pays for. */
function castsTooSlowly(spell: SpellOption): boolean {
  const cost = spellCost(spell);
  const actions = cost === undefined ? undefined : ACTION_COUNT[cost.cost];
  return cost === undefined || (actions !== undefined && actions > RESERVOIR_CAST_MAX);
}

/**
 * What refuses casting `spell` into the spell reservoir rune on `line`; undefined when it can. The rune holds one spell
 * of 3rd rank or lower that takes two actions or fewer to cast. Whether the spell can target a creature other than the
 * caster is not read.
 */
export function reservoirRefusal(
  line: InventoryItem,
  spell: SpellOption['id'],
  reads: { readonly items: ItemContent; readonly runes: RuneContent; readonly spells: SpellContent },
): ReservoirProblem | undefined {
  if (!hasReservoirRune(line, reads.items.get(line.item), reads.runes)) {
    return ReservoirProblem.NoRune;
  }
  if (line.state?.spell !== undefined) {
    return ReservoirProblem.Occupied;
  }
  const option = reads.spells.anySpell(spell);
  if (option === undefined) {
    return ReservoirProblem.UnknownSpell;
  }
  if (option.rank > RESERVOIR_RANK_MAX) {
    return ReservoirProblem.RankTooHigh;
  }
  return castsTooSlowly(option) ? ReservoirProblem.TooLongToCast : undefined;
}
