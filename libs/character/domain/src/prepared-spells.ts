import type { SlotPool, SpellcastingInPlay, SpellSlots } from '@pioneer/rules/engine';
import type { ContentLookup, GrantResolution } from '@pioneer/rules/grants';
import { SlotKey, SlotRank, SPELL_RANK_MAX, SpellPreparation, SpellRank } from '@pioneer/rules/sdk';
import type {
  ChoiceValue,
  ContentId,
  GrantedSpell,
  MagicTradition,
  Origin,
  RuleSlug,
  SlotCount,
  Slug,
} from '@pioneer/rules/sdk';

import type { CharacterDocument } from './character-document';
import type { CharacterLevel } from './character-fields';
import { deityRanks, NO_DEITY_SPELLS } from './deity-ranks';
import type { DeityRanks } from './deity-ranks';
import { deityRepertoirePlaces } from './deity-repertoire-places';
import { PreparedPickProblem } from './prepared-pick-problem';
import { repertoireSlots } from './repertoire-slots';
import { needsAccess } from './spell-content';
import type { SpellContent, SpellOption } from './spell-content';
import { characterSpellcasting } from './spellcasting-build';

/**
 * Every prepared slot's key starts so: `prepared:wizard:cantrip:0`, `prepared:wizard:3:1`, and a pool's
 * `prepared:cleric:divine-font:4:0`.
 */
const PREPARED_PREFIX = 'prepared:';

/** Every repertoire slot's key starts so: `repertoire:bard:cantrip:0`, `repertoire:bard:3:1` (#479). */
const REPERTOIRE_PREFIX = 'repertoire:';

/** How the entries whose slots are picked cast: prepared each day, or from a repertoire (#479). */
export type PickedPreparation = typeof SpellPreparation.Prepared | typeof SpellPreparation.Spontaneous;

/** The key prefix of each kind of entry's slots. */
const PREFIXES: Readonly<Record<PickedPreparation, string>> = {
  [SpellPreparation.Prepared]: PREPARED_PREFIX,
  [SpellPreparation.Spontaneous]: REPERTOIRE_PREFIX,
};

function isPicked(preparation: SpellPreparation): preparation is PickedPreparation {
  return preparation === SpellPreparation.Prepared || preparation === SpellPreparation.Spontaneous;
}

/** The rank of a prepared slot: cantrips, or 1 to 10. */
export type PreparedRank = SpellRank | typeof SlotRank.Cantrip;

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
 * One prepared or repertoire slot on the character at its level: the entry it belongs to and how it casts, the pool
 * when it is one of a pool's, its rank, the rank a spell cast from it has (a cantrip's is half the character's level,
 * rounded up), what it offers, and its pick when it offers it. A repertoire slot is a spell the entry knows at its rank
 * (#479); a prepared one is a spell prepared in it for the day.
 */
export interface PreparedSlot {
  readonly key: SlotKey;
  readonly entry: Slug;
  readonly preparation: PickedPreparation;
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
  /** Whether a `RepertoireSpells` element fills the slot: it offers and holds that spell alone, whatever is stored (ADR-0062). */
  readonly granted: boolean;
  /** Whether a `RepertoireDeitySpells` element gave the slot: it offers only the spells of one deity (ADR-0063). */
  readonly deitySpell: boolean;
}

/** What prepared slots read: the spells, the character's grants at its level and the content they name. */
export interface PreparedReads {
  readonly spells: SpellContent;
  readonly resolution: GrantResolution;
  /** The installed content, for the deity a choice picked. */
  readonly lookup: ContentLookup;
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
export interface SlotHome {
  readonly entry: Slug;
  readonly preparation: PickedPreparation;
  readonly tradition: MagicTradition;
  readonly pool: PreparedPool | undefined;
  /** The spells a pool's slot takes; undefined for one of the entry's own, which takes its tradition's. */
  readonly takes: ReadonlySet<ContentId> | undefined;
  /**
   * The deity's spells an entry's own slot takes besides its tradition's, by the lowest rank each goes in (ADR-0048):
   * none in a pool's slot, or for an entry no `DeitySpells` element names.
   */
  readonly deity: DeityRanks;
  /** The spells a spontaneous entry must know, `RepertoireSpells` gives, in order; empty for any other. */
  readonly gifts: readonly GrantedSpell[];
  /** Whether a `RepertoireDeitySpells` element gave the slot: it takes a deity's spell of any rank it can, read at that rank (ADR-0063). */
  readonly floating: boolean;
}

/** A slot before it is read: where it is, its key and its rank. */
export interface SlotPlace extends SlotHome {
  readonly key: SlotKey;
  readonly rank: PreparedRank;
  /** The spell an element fills this slot with: the entry's first gift of its rank, then the next for the next slot. */
  readonly gift: ContentId | undefined;
}

/** Whether `spell` goes in a slot of `rank`: a cantrip in a cantrip slot, any other spell in a slot of its rank or higher. */
function fitsRank(spell: SpellOption, rank: PreparedRank): boolean {
  return rank === SlotRank.Cantrip ? spell.cantrip : !spell.cantrip && spell.rank <= rank;
}

/**
 * Whether `spell` fits `place`, access aside: in an entry's own slot, a spell of its tradition that fits the rank; in a
 * pool's, a spell the pool takes that fits the rank, whatever its tradition.
 */
function fits(spell: SpellOption, place: SlotPlace): boolean {
  const { tradition, rank, takes } = place;
  if (place.preparation === SpellPreparation.Spontaneous && rank === SPELL_RANK_MAX) {
    return !spell.cantrip && spell.rank === SPELL_RANK_MAX && spell.traditions.includes(tradition);
  }
  const taken = takes === undefined ? spell.traditions.includes(tradition) : takes.has(spell.id);
  return (taken && fitsRank(spell, rank)) || fitsAsDeitySpell(spell, place);
}

/**
 * Whether `spell` goes in `place` as one of the deity's: a spell the deity grants, in a slot of the rank it grants it
 * at or higher (a cantrip in a cantrip slot), whatever its tradition.
 */
function fitsAsDeitySpell(spell: SpellOption, { rank, deity }: SlotPlace): boolean {
  const granted = deity.get(spell.id);
  if (granted === undefined || !fitsRank(spell, rank)) {
    return false;
  }
  return rank === SlotRank.Cantrip || rank >= granted;
}

/**
 * The places of `slots` at `home`, cantrips first, then each rank lowest first, keyed `prepared:<entry>:<rank>:<n>`, or
 * `prepared:<entry>:<pool>:<rank>:<n>` in a pool; `repertoire:` for a spontaneous entry's.
 */
function placesOf(slots: SpellSlots, home: SlotHome): SlotPlace[] {
  const start = PREFIXES[home.preparation];
  const prefix = home.pool === undefined ? `${start}${home.entry}` : `${start}${home.entry}:${home.pool.slug}`;
  const counts: RankCount[] = [
    ...(slots.cantrips === undefined ? [] : [{ rank: SlotRank.Cantrip, count: slots.cantrips }]),
    ...slots.ranks,
  ];
  return counts.flatMap(({ rank, count }) =>
    Array.from({ length: count }, (_unused, index) => ({
      ...home,
      key: SlotKey.parse(`${prefix}:${rank}:${index}`),
      rank,
      gift: home.gifts.filter((gift) => gift.rank === rank).at(index)?.spell,
    })),
  );
}

/** The slots of one of an entry's pools, each taking the pool's spells. */
function poolPlaces(own: SlotHome, slotPool: SlotPool): SlotPlace[] {
  const pool = { slug: slotPool.pool, origin: slotPool.origin, spells: slotPool.spells };
  return placesOf(slotPool, {
    ...own,
    pool,
    takes: new Set(slotPool.spells),
    deity: NO_DEITY_SPELLS,
    gifts: [],
    floating: false,
  });
}

/**
 * The slots of one prepared or spontaneous entry: its own, cantrips first, then each rank lowest first; then each of
 * its pools' (#581) in pool order, the same way.
 */
function entryPlaces(entry: SpellcastingInPlay, preparation: PickedPreparation, reads: PreparedReads): SlotPlace[] {
  const { slug, tradition, slots, pools, deitySpells, grantedSpells: gifts, repertoireCounts } = entry;
  const own = deitySpells ? deityRanks(reads.resolution) : NO_DEITY_SPELLS;
  const home = {
    entry: slug,
    preparation,
    tradition,
    pool: undefined,
    takes: undefined,
    deity: own,
    gifts,
    floating: false,
  };
  const sized = preparation === SpellPreparation.Spontaneous ? repertoireSlots(slots, repertoireCounts) : slots;
  return [
    ...placesOf(sized, home),
    ...pools.flatMap((pool) => poolPlaces(home, pool)),
    ...(preparation === SpellPreparation.Spontaneous ? deityRepertoirePlaces(entry, home, reads) : []),
  ];
}

/**
 * Every prepared and repertoire slot on the character at its level (#478, #581, #479): one per cantrip and per spell
 * slot of each prepared entry, read from its class's table and the feats that add to it, then one per slot of each of
 * its pools; and as many of each rank for a spontaneous entry's repertoire, which grows as its slots do (Player Core,
 * Spell Repertoire). A repertoire slot is read like a prepared one: a spell learned at a higher rank than its own is
 * known heightened to that rank. Slots open only at the character's level, so a pick kept for one it no longer has (a
 * lower level, another class) is hidden, never planned. An entry's own slot offers the spells of its tradition that fit it: cantrips in a cantrip slot, any
 * other spell in a slot of its rank or higher (heightened), common ones always, uncommon and rare ones once the build
 * lists access to them. A pool's slot offers the spells the pool takes that fit it, whatever their tradition or
 * rarity, since the feature names them (ADR-0045). An entry a `DeitySpells` element names also offers the deity's spells
 * in its own slots of the rank the deity grants each at or higher, whatever their tradition or rarity (ADR-0048). Focus
 * spells never go in a slot.
 */
export function preparedSlots(document: CharacterDocument, reads: PreparedReads): PreparedSlot[] {
  const { spells, resolution } = reads;
  const access = new Set<ContentId>(document.build.spellAccess);
  const accessible = (spell: SpellOption, place: SlotPlace): boolean =>
    place.takes !== undefined || fitsAsDeitySpell(spell, place) || !needsAccess(spell.rarity) || access.has(spell.id);
  return characterSpellcasting(resolution)
    .flatMap((entry) => (isPicked(entry.preparation) ? entryPlaces(entry, entry.preparation, reads) : []))
    .map((place): PreparedSlot => {
      const { key, entry, preparation, tradition, pool } = place;
      const gift = place.gift === undefined ? undefined : spells.spell(place.gift);
      const options =
        gift === undefined ? spells.spells.filter((spell) => fits(spell, place) && accessible(spell, place)) : [gift];
      const stored = gift === undefined ? document.build.choices[key] : gift.id;
      const named = stored === undefined ? undefined : spells.spell(stored);
      const pick = options.find((spell) => spell.id === named?.id);
      const problem = named === undefined || pick !== undefined ? undefined : problemOf(named, place);
      const rank = place.floating && pick !== undefined ? pick.rank : place.rank;
      const castRank = rank === SlotRank.Cantrip ? cantripRank(document.level) : rank;
      const granted = gift !== undefined;
      const deitySpell = place.floating;
      return {
        key,
        entry,
        preparation,
        tradition,
        pool,
        rank,
        castRank,
        options,
        stored,
        pick,
        problem,
        granted,
        deitySpell,
      };
    });
}

/** Why a loaded spell isn't on offer in `place`: the pool doesn't take it, it needs access, or it doesn't fit. */
export function problemOf(spell: SpellOption, place: SlotPlace): PreparedPickProblem {
  if (place.takes !== undefined && !place.takes.has(spell.id)) {
    return PreparedPickProblem.NotInPool;
  }
  return fits(spell, place) ? PreparedPickProblem.NoAccess : PreparedPickProblem.Unfit;
}

/** Whether `slot` is a prepared or repertoire slot's key, whether or not the character has it. */
export function isSpellSlotKey(slot: SlotKey): boolean {
  return slot.startsWith(PREPARED_PREFIX) || slot.startsWith(REPERTOIRE_PREFIX);
}

/** Whether `slot` is a prepared slot's key (an entry's or a pool's), the slots daily preparations may change. */
export function isPreparedSlotKey(slot: SlotKey): boolean {
  return slot.startsWith(PREPARED_PREFIX);
}
