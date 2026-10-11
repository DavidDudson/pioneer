import type { SlotPool, SpellcastingInPlay, SpellSlots } from '@pioneer/rules/engine';
import type { GrantResolution } from '@pioneer/rules/grants';
import { SlotKey, SlotRank, SpellPreparation, SpellRank } from '@pioneer/rules/sdk';
import type { ChoiceValue, ContentId, MagicTradition, Origin, RuleSlug, SlotCount, Slug } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import { SPELL_ACCESS_MAX } from './character-document';
import type { CharacterDocument } from './character-document';
import type { CharacterLevel } from './character-fields';
import type { SlotPick } from './slot-offer';
import { needsAccess } from './spell-content';
import type { SpellContent, SpellOption } from './spell-content';
import { characterSpellcasting } from './spellcasting-build';

/**
 * Every prepared slot's key starts so: `prepared:wizard:cantrip:0`, `prepared:wizard:3:1`, and a pool's
 * `prepared:cleric:divine-font:4:0`.
 */
const PREPARED_PREFIX = 'prepared:';

/** The rank of a prepared slot: cantrips, or 1 to 10. */
export type PreparedRank = SpellRank | typeof SlotRank.Cantrip;

/** Why a stored pick naming a loaded spell isn't on offer in its slot. */
export const PreparedPickProblem = {
  /** An uncommon or rare spell the build lists no access to; with access it would fit. */
  NoAccess: 'noAccess',
  /**
   * A spell of another tradition, too high a rank, a cantrip in a spell slot or a spell in a cantrip slot; in a pool's
   * slot, a spell the pool doesn't take.
   */
  Unfit: 'unfit',
} as const;
export type PreparedPickProblem = ValueOf<typeof PreparedPickProblem>;

/**
 * A pool of slots kept apart from an entry's own (ADR-0045): its slug, the entry whose slots first added to it, and the
 * spells it takes, none while they wait on a choice (a divine font's font).
 */
export interface PreparedPool {
  readonly slug: RuleSlug;
  readonly origin: Origin;
  readonly spells: readonly ContentId[];
}

/**
 * One prepared slot on the character at its level: the entry it belongs to, the pool when it is one of a pool's, its
 * rank, the rank a spell cast from it has (a cantrip's is half the character's level, rounded up), what it offers, and
 * its pick when it offers it.
 */
export interface PreparedSlot {
  readonly key: SlotKey;
  readonly entry: Slug;
  readonly tradition: MagicTradition;
  /** Undefined for one of the entry's own slots. */
  readonly pool: PreparedPool | undefined;
  readonly rank: PreparedRank;
  readonly castRank: SpellRank;
  /**
   * Every spell that fits, by name: common ones, and uncommon or rare ones the build lists access to; in a pool's slot,
   * the spells the pool takes, rarity aside.
   */
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

/** How many slots an entry or pool has of one rank, cantrips included. */
interface RankCount {
  readonly rank: PreparedRank;
  readonly count: SlotCount;
}

/** Where a slot is: its entry, tradition and pool, and the spells a pool's slot takes. */
interface SlotHome {
  readonly entry: Slug;
  readonly tradition: MagicTradition;
  readonly pool: PreparedPool | undefined;
  /** The spells a pool's slot takes; undefined for one of the entry's own, which takes its tradition's. */
  readonly takes: ReadonlySet<ContentId> | undefined;
}

/** A slot before it is read: where it is, its key and its rank. */
interface SlotPlace extends SlotHome {
  readonly key: SlotKey;
  readonly rank: PreparedRank;
}

/** Whether `spell` goes in a slot of `rank`: a cantrip in a cantrip slot, any other spell in a slot of its rank or higher. */
function fitsRank(spell: SpellOption, rank: PreparedRank): boolean {
  return rank === SlotRank.Cantrip ? spell.cantrip : !spell.cantrip && spell.rank <= rank;
}

/**
 * Whether `spell` fits `place`, access aside: in an entry's own slot, a spell of its tradition that fits the rank; in a
 * pool's, a spell the pool takes that fits the rank, whatever its tradition.
 */
function fits(spell: SpellOption, { tradition, rank, takes }: SlotPlace): boolean {
  const taken = takes === undefined ? spell.traditions.includes(tradition) : takes.has(spell.id);
  return taken && fitsRank(spell, rank);
}

/**
 * The places of `slots` at `home`, cantrips first, then each rank lowest first, keyed `prepared:<entry>:<rank>:<n>`, or
 * `prepared:<entry>:<pool>:<rank>:<n>` in a pool.
 */
function placesOf(slots: SpellSlots, home: SlotHome): SlotPlace[] {
  const prefix =
    home.pool === undefined ? `${PREPARED_PREFIX}${home.entry}` : `${PREPARED_PREFIX}${home.entry}:${home.pool.slug}`;
  const counts: RankCount[] = [
    ...(slots.cantrips === undefined ? [] : [{ rank: SlotRank.Cantrip, count: slots.cantrips }]),
    ...slots.ranks,
  ];
  return counts.flatMap(({ rank, count }) =>
    Array.from({ length: count }, (_unused, index) => ({
      ...home,
      key: SlotKey.parse(`${prefix}:${rank}:${index}`),
      rank,
    })),
  );
}

/** The slots of one of an entry's pools, each taking the pool's spells. */
function poolPlaces(entry: Slug, tradition: MagicTradition, slotPool: SlotPool): SlotPlace[] {
  const pool = { slug: slotPool.pool, origin: slotPool.origin, spells: slotPool.spells };
  const home = { entry, tradition, pool, takes: new Set(slotPool.spells) };
  return placesOf(slotPool, home);
}

/**
 * The slots of one prepared entry: its own, cantrips first, then each rank lowest first; then each of its pools' (#581)
 * in pool order, the same way.
 */
function entryPlaces({ slug, tradition, slots, pools }: SpellcastingInPlay): SlotPlace[] {
  const home = { entry: slug, tradition, pool: undefined, takes: undefined };
  const own = placesOf(slots, home);
  return [...own, ...pools.flatMap((pool) => poolPlaces(slug, tradition, pool))];
}

/**
 * Every prepared slot on the character at its level (#478, #581): one per cantrip and per spell slot of each prepared
 * entry, read from its class's table and the feats that add to it, then one per slot of each of its pools. Slots open
 * only at the character's level, so a pick kept for one it no longer has (a lower level, another class) is hidden,
 * never planned. An entry's own slot offers the spells of its tradition that fit it: cantrips in a cantrip slot, any
 * other spell in a slot of its rank or higher (heightened), common ones always, uncommon and rare ones once the build
 * lists access to them. A pool's slot offers the spells the pool takes that fit it, whatever their tradition or
 * rarity, since the feature names them (ADR-0045). Focus spells never go in a slot.
 */
export function preparedSlots(document: CharacterDocument, { spells, resolution }: PreparedReads): PreparedSlot[] {
  const access = new Set<ContentId>(document.build.spellAccess);
  const accessible = (spell: SpellOption, { pool }: SlotPlace): boolean =>
    pool !== undefined || !needsAccess(spell.rarity) || access.has(spell.id);
  const entries = characterSpellcasting(resolution).filter(
    ({ preparation }) => preparation === SpellPreparation.Prepared,
  );
  return entries
    .flatMap((entry) => entryPlaces(entry))
    .map((place): PreparedSlot => {
      const { key, entry, tradition, pool, rank } = place;
      const options = spells.spells.filter((spell) => fits(spell, place) && accessible(spell, place));
      const stored = document.build.choices[key];
      const named = stored === undefined ? undefined : spells.spell(stored);
      const pick = options.find((spell) => spell.id === named?.id);
      const problem = named === undefined || pick !== undefined ? undefined : problemOf(named, place);
      const castRank = rank === SlotRank.Cantrip ? cantripRank(document.level) : rank;
      return { key, entry, tradition, pool, rank, castRank, options, stored, pick, problem };
    });
}

/** Why a loaded spell isn't on offer in `place`: it needs access, or it doesn't fit. */
function problemOf(spell: SpellOption, place: SlotPlace): PreparedPickProblem {
  return fits(spell, place) ? PreparedPickProblem.NoAccess : PreparedPickProblem.Unfit;
}

/**
 * Why a prepared slot refuses a spell: the character hasn't the slot at its level, or it doesn't offer the spell, an
 * uncommon or rare one that fits but has no access saying so. A pool's slot needs no access, so it only ever doesn't
 * offer one.
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
  if (named === undefined || slot.pool !== undefined) {
    return PreparedRefusal.NotOffered;
  }
  const noAccess = problemOf(named, { ...slot, takes: undefined }) === PreparedPickProblem.NoAccess;
  return noAccess ? PreparedRefusal.NoAccess : PreparedRefusal.NotOffered;
}

/** Whether `slot` is a prepared slot's key, whether or not the character has it. */
export function isPreparedKey(slot: SlotKey): boolean {
  return slot.startsWith(PREPARED_PREFIX);
}

/** Why a spell can't be added to the build's access: no loaded spell for a slot has the id, it is common, or the list is full. */
export const SpellAccessProblem = {
  UnknownSpell: 'unknownSpell',
  Common: 'common',
  /** The build lists the most spells it can, and not this one. */
  Full: 'full',
} as const;
export type SpellAccessProblem = ValueOf<typeof SpellAccessProblem>;

/**
 * Why `spell` can't be granted access to, or undefined when it can: an uncommon, rare or unique spell that goes in a
 * slot, while the build lists fewer than the most it can (or lists it already).
 */
export function spellAccessProblem(
  spells: SpellContent,
  granted: readonly ContentId[],
  spell: ContentId,
): SpellAccessProblem | undefined {
  const named = spells.spell(spell);
  if (named === undefined) {
    return SpellAccessProblem.UnknownSpell;
  }
  if (!needsAccess(named.rarity)) {
    return SpellAccessProblem.Common;
  }
  const full = granted.length >= SPELL_ACCESS_MAX && !granted.includes(spell);
  return full ? SpellAccessProblem.Full : undefined;
}
