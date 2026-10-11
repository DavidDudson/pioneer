import type { SpellcastingInPlay } from '@pioneer/rules/engine';
import type { GrantResolution } from '@pioneer/rules/grants';
import { SlotKey, SlotRank, SpellPreparation, SpellRank } from '@pioneer/rules/sdk';
import type { ChoiceValue, ContentId, MagicTradition, SlotCount, Slug } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import type { CharacterDocument } from './character-document';
import type { CharacterLevel } from './character-fields';
import type { SlotPick } from './slot-offer';
import { needsAccess } from './spell-content';
import type { SpellContent, SpellOption } from './spell-content';
import { characterSpellcasting } from './spellcasting-build';

/** Every prepared slot's key starts so: `prepared:wizard:cantrip:0`, `prepared:wizard:3:1`. */
const PREPARED_PREFIX = 'prepared:';

/** The rank of a prepared slot: cantrips, or 1 to 10. */
export type PreparedRank = SpellRank | typeof SlotRank.Cantrip;

/** Why a stored pick naming a loaded spell isn't on offer in its slot. */
export const PreparedPickProblem = {
  /** An uncommon or rare spell the build lists no access to; with access it would fit. */
  NoAccess: 'noAccess',
  /** A spell of another tradition, too high a rank, a cantrip in a spell slot or a spell in a cantrip slot. */
  Unfit: 'unfit',
} as const;
export type PreparedPickProblem = ValueOf<typeof PreparedPickProblem>;

/**
 * One prepared slot on the character at its level: the entry it belongs to, its rank, the rank a spell cast from it
 * has (a cantrip's is half the character's level, rounded up), what it offers, and its pick when it offers it.
 */
export interface PreparedSlot {
  readonly key: SlotKey;
  readonly entry: Slug;
  readonly tradition: MagicTradition;
  readonly rank: PreparedRank;
  readonly castRank: SpellRank;
  /** Every spell that fits, by name: common ones, and uncommon or rare ones the build lists access to. */
  readonly options: readonly SpellOption[];
  readonly stored: ChoiceValue | undefined;
  /** Undefined while the slot is empty, or holds something it doesn't offer. */
  readonly pick: SpellOption | undefined;
  /** Why a stored pick naming a loaded spell isn't on offer. */
  readonly problem: PreparedPickProblem | undefined;
}

/** What prepared slots read: the spells, and the character's grants at its level. */
export interface PreparedReads {
  readonly spells: SpellContent;
  readonly resolution: GrantResolution;
}

/** The rank a cantrip heightens to: half the character's level, rounded up (Player Core). */
export function cantripRank(level: CharacterLevel): SpellRank {
  return SpellRank.parse(Math.ceil(level / 2));
}

/** Whether `spell` fits a slot of `rank` on an entry of `tradition`, access aside. */
function fits(spell: SpellOption, tradition: MagicTradition, rank: PreparedRank): boolean {
  if (!spell.traditions.includes(tradition)) {
    return false;
  }
  return rank === SlotRank.Cantrip ? spell.cantrip : !spell.cantrip && spell.rank <= rank;
}

/** How many slots an entry has of one rank, cantrips included. */
interface RankCount {
  readonly rank: PreparedRank;
  readonly count: SlotCount;
}

/** A slot before it is read: its key, entry, tradition and rank. */
interface SlotPlace {
  readonly key: SlotKey;
  readonly entry: Slug;
  readonly tradition: MagicTradition;
  readonly rank: PreparedRank;
}

/** The slots of one prepared entry, cantrips first, then each rank lowest first; pools are kept apart (#581). */
function entryPlaces({ slug, tradition, slots }: SpellcastingInPlay): SlotPlace[] {
  const counts: RankCount[] = [
    ...(slots.cantrips === undefined ? [] : [{ rank: SlotRank.Cantrip, count: slots.cantrips }]),
    ...slots.ranks,
  ];
  return counts.flatMap(({ rank, count }) =>
    Array.from({ length: count }, (_unused, index) => ({
      key: SlotKey.parse(`${PREPARED_PREFIX}${slug}:${rank}:${index}`),
      entry: slug,
      tradition,
      rank,
    })),
  );
}

/**
 * Every prepared slot on the character at its level (#478): one per cantrip and per spell slot of each prepared
 * entry, read from its class's table and the feats that add to it. Slots open only at the character's level, so a pick
 * kept for one it no longer has (a lower level, another class) is hidden, never planned. A slot offers the spells of
 * its entry's tradition that fit it: cantrips in a cantrip slot, any other spell in a slot of its rank or higher
 * (heightened), common ones always, uncommon and rare ones once the build lists access to them. Focus spells never go
 * in a slot.
 */
export function preparedSlots(document: CharacterDocument, { spells, resolution }: PreparedReads): PreparedSlot[] {
  const access = new Set<ContentId>(document.build.spellAccess);
  const accessible = (spell: SpellOption): boolean => !needsAccess(spell.rarity) || access.has(spell.id);
  const entries = characterSpellcasting(resolution).filter(
    ({ preparation }) => preparation === SpellPreparation.Prepared,
  );
  return entries
    .flatMap((entry) => entryPlaces(entry))
    .map(({ key, entry, tradition, rank }): PreparedSlot => {
      const options = spells.spells.filter((spell) => fits(spell, tradition, rank) && accessible(spell));
      const stored = document.build.choices[key];
      const named = stored === undefined ? undefined : spells.spell(stored);
      const pick = options.find((spell) => spell.id === named?.id);
      const problem = named === undefined || pick !== undefined ? undefined : problemOf(named, tradition, rank);
      const castRank = rank === SlotRank.Cantrip ? cantripRank(document.level) : rank;
      return { key, entry, tradition, rank, castRank, options, stored, pick, problem };
    });
}

/** Why a loaded spell isn't on offer in a slot of `rank` on an entry of `tradition`: it needs access, or it doesn't fit. */
function problemOf(spell: SpellOption, tradition: MagicTradition, rank: PreparedRank): PreparedPickProblem {
  return fits(spell, tradition, rank) ? PreparedPickProblem.NoAccess : PreparedPickProblem.Unfit;
}

/**
 * Why a prepared slot refuses a spell: the character hasn't the slot at its level, or it doesn't offer the spell, an
 * uncommon or rare one that fits but has no access saying so.
 */
export const PreparedRefusal = { NotOpen: 'notOpen', NotOffered: 'notOffered', NoAccess: 'noAccess' } as const;
export type PreparedRefusal = ValueOf<typeof PreparedRefusal>;

/** Why a pick's spell can't go in its prepared slot, or undefined when it can. */
export function preparedRefusal(
  document: CharacterDocument,
  reads: PreparedReads,
  { slot: key, selection }: SlotPick,
): PreparedRefusal | undefined {
  const slot = preparedSlots(document, reads).find((each) => each.key === key);
  if (slot === undefined) {
    return PreparedRefusal.NotOpen;
  }
  if (slot.options.some((spell) => spell.id === selection)) {
    return undefined;
  }
  const named = reads.spells.spell(selection);
  const noAccess = named !== undefined && problemOf(named, slot.tradition, slot.rank) === PreparedPickProblem.NoAccess;
  return noAccess ? PreparedRefusal.NoAccess : PreparedRefusal.NotOffered;
}

/** Whether `slot` is a prepared slot's key, whether or not the character has it. */
export function isPreparedKey(slot: SlotKey): boolean {
  return slot.startsWith(PREPARED_PREFIX);
}

/** Why a spell can't be added to the build's access: no loaded spell for a slot has the id, or it is common. */
export const SpellAccessProblem = {
  UnknownSpell: 'unknownSpell',
  Common: 'common',
} as const;
export type SpellAccessProblem = ValueOf<typeof SpellAccessProblem>;

/** Why `spell` can't be granted access to, or undefined when it can: an uncommon or rare spell that goes in a slot. */
export function spellAccessProblem(spells: SpellContent, spell: ContentId): SpellAccessProblem | undefined {
  const named = spells.spell(spell);
  if (named === undefined) {
    return SpellAccessProblem.UnknownSpell;
  }
  return needsAccess(named.rarity) ? undefined : SpellAccessProblem.Common;
}
