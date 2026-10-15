import { RuleElementKey } from '@pioneer/rules/sdk';

/**
 * The spell slots of Player Core's casters, as `SpellSlots` elements by the entry slug they go on (ADR-0041). Foundry
 * keeps no slot tables: a spellcasting entry's slots are numbers the player sets by hand. These are the book's
 * spells-per-day tables and the features and feats that add slots.
 */

interface SlotFields {
  readonly entry: string;
  readonly rank: number | string;
  readonly value: number;
  readonly pool?: string;
}

/** Holds from `level` on; absent from 1st, where it always holds. */
function fromLevel(level: number): object {
  return level <= 1 ? {} : { predicate: [{ gte: ['self:level', level] }] };
}

function slots({ entry, rank, value, pool }: SlotFields, level: number): object {
  return {
    key: RuleElementKey.SpellSlots,
    entry,
    rank,
    value,
    ...(pool === undefined ? {} : { pool }),
    ...fromLevel(level),
  };
}

const CANTRIP = 'cantrip';
const HIGHEST = 'highest';
const CLASS_CANTRIPS = 5;
const NEW_RANK_SLOTS = 2;
const SORCERER_NEW_RANK_SLOTS = 3;
const NINTH = 9;
const TENTH = 10;
const TENTH_RANK_LEVEL = 19;

/** The level a class caster gains its first slots of `rank`: 1st rank at 1st level, 2nd at 3rd, up to 9th at 17th. */
function rankOpens(rank: number): number {
  return rank * NEW_RANK_SLOTS - 1;
}

const RANKS = Array.from({ length: NINTH }, (_unused, index) => index + 1);

/**
 * A Player Core class caster's spells per day, which every caster in the book shares: five cantrips; two slots of each
 * new rank from the level it opens at, three from the next level; one 10th-rank slot from 19th level.
 */
function classTable(entry: string, opening = NEW_RANK_SLOTS): readonly object[] {
  return [
    slots({ entry, rank: CANTRIP, value: CLASS_CANTRIPS }, 1),
    ...RANKS.flatMap((rank) => [
      slots({ entry, rank, value: opening }, rankOpens(rank)),
      slots({ entry, rank, value: 1 }, rankOpens(rank) + 1),
    ]),
    slots({ entry, rank: TENTH, value: 1 }, TENTH_RANK_LEVEL),
  ];
}

const DIVINE_FONT = 'divine-font';
const FONT_SLOTS = 4;
const FONT_FIRST_RAISE = 5;
const FONT_SECOND_RAISE = 15;

/** Four slots at the cleric's highest rank for heal or harm, five from 5th level, six from 15th. */
const DIVINE_FONT_SLOTS: readonly object[] = [
  slots({ entry: 'cleric', rank: HIGHEST, value: FONT_SLOTS, pool: DIVINE_FONT }, 1),
  slots({ entry: 'cleric', rank: HIGHEST, value: 1, pool: DIVINE_FONT }, FONT_FIRST_RAISE),
  slots({ entry: 'cleric', rank: HIGHEST, value: 1, pool: DIVINE_FONT }, FONT_SECOND_RAISE),
];

const CURRICULUM = 'curriculum';

/**
 * A wizard school's curriculum: one extra cantrip, and one extra slot of each rank the wizard can cast. A curriculum
 * lists spells up to 9th rank, so it adds no 10th-rank slot.
 */
const CURRICULUM_SLOTS: readonly object[] = [
  slots({ entry: 'wizard', rank: CANTRIP, value: 1, pool: CURRICULUM }, 1),
  ...RANKS.map((rank) => slots({ entry: 'wizard', rank, value: 1, pool: CURRICULUM }, rankOpens(rank))),
];

const DEDICATION_CANTRIPS = 2;

/** A multiclass dedication's two cantrips. */
function dedication(entry: string): readonly object[] {
  return [slots({ entry, rank: CANTRIP, value: DEDICATION_CANTRIPS }, 1)];
}

/** The highest rank of slot each archetype spellcasting feat grants; each grants the ranks from the one before. */
const BASIC_TOP = 3;
const EXPERT_TOP = 6;
const MASTER_TOP = 8;
/** How many levels after a class caster a multiclass caster gains a rank: 1st rank at 4th level to 3rd at 8th. */
const BASIC_LAG = 3;
/** From 4th rank: 4th at 12th level to 8th at 20th. */
const LATER_LAG = 5;

/** One slot of each rank from `lowest` to `highest`, each from the level the spellcasting benefits name. */
function archetypeSlots(entry: string, lowest: number, highest: number): readonly object[] {
  return RANKS.filter((rank) => rank >= lowest && rank <= highest).map((rank) =>
    slots({ entry, rank, value: 1 }, rankOpens(rank) + (rank <= BASIC_TOP ? BASIC_LAG : LATER_LAG)),
  );
}

/** Each multiclass caster's dedication and Basic, Expert and Master Spellcasting feats, by entry slug. */
function archetype(entry: string): readonly (readonly [string, readonly object[]])[] {
  return [
    [`feat:${entry}-dedication`, dedication(entry)],
    [`feat:basic-${entry}-spellcasting`, archetypeSlots(entry, 1, BASIC_TOP)],
    [`feat:expert-${entry}-spellcasting`, archetypeSlots(entry, BASIC_TOP + 1, EXPERT_TOP)],
    [`feat:master-${entry}-spellcasting`, archetypeSlots(entry, EXPERT_TOP + 1, MASTER_TOP)],
  ];
}

/** Every school but Unified Magical Theory, which has no curriculum. */
const CURRICULUM_SCHOOLS = [
  'school-of-ars-grammatica',
  'school-of-battle-magic',
  'school-of-civic-wizardry',
  'school-of-mentalism',
  'school-of-protean-form',
  'school-of-the-boundary',
];

/**
 * The `SpellSlots` elements each entry gains, by its entry slug. A witch's slots are on Witch Spellcasting, though the
 * patron gives the entry, since every patron's witch casts from the same table. The witch dedication has no entry yet
 * (its tradition is unknown), so its feats add no slots.
 */
export const SPELL_SLOTS: ReadonlyMap<string, readonly object[]> = new Map([
  ['class-feature:bard-spellcasting', classTable('bard')],
  ['class-feature:cleric-spellcasting', classTable('cleric')],
  ['class-feature:druid-spellcasting', classTable('druid')],
  ['class-feature:witch-spellcasting', classTable('witch')],
  ['class-feature:wizard-spellcasting', classTable('wizard')],
  // A sorcerer and an oracle cast from a repertoire with a slot more of each rank than a bard (Player Core 2).
  ['class-feature:sorcerer-spellcasting', classTable('sorcerer', SORCERER_NEW_RANK_SLOTS)],
  ['class-feature:oracle-spellcasting', classTable('oracle', SORCERER_NEW_RANK_SLOTS)],
  ['class-feature:divine-font', DIVINE_FONT_SLOTS],
  ...CURRICULUM_SCHOOLS.map((school): [string, readonly object[]] => [`class-feature:${school}`, CURRICULUM_SLOTS]),
  ...['bard', 'cleric', 'druid', 'wizard'].flatMap((entry) => archetype(entry)),
]);
