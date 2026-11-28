import { Level, SlotKey, SlotRank, Slug, SpellRank } from '@pioneer/rules/sdk';
import type { ChoiceValue } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import type { CharacterDocument } from './character-document';
import { preparedSlots } from './prepared-spells';
import type { PreparedRank, PreparedReads, PreparedSlot } from './prepared-spells';
import type { SlotPick } from './slot-offer';
import type { SpellOption } from './spell-content';

/** Every slot of the spells a familiar knows has a key that starts so: `familiar:cantrip:0`, `familiar:level:3:1`. */
const FAMILIAR_SPELL_PREFIX = 'familiar:';

/** The class whose familiar is its spell repository: the witch's (Player Core 2, Witch). */
export const FAMILIAR_REPOSITORY_ENTRY = Slug.parse('witch');

/** What the familiar starts out knowing (Witch): 10 cantrips, five 1st-rank spells and one from the patron's lesson. */
const STARTING_CANTRIPS = 10;
const STARTING_FIRST_RANK = 5;

/** Each level after the first, the patron teaches the familiar two spells of any rank the witch can cast. */
const SPELLS_PER_LEVEL = 2;

/** Why a familiar's slot takes the spells it does. */
export const FamiliarSlotKind = {
  /** One of the ten cantrips it starts with. */
  Cantrip: 'cantrip',
  /** One of the five 1st-rank spells it starts with. */
  FirstRank: 'first-rank',
  /** The spell the patron's initial lesson gives. */
  Lesson: 'lesson',
  /** One of the two spells the patron teaches at a level. */
  Level: 'level',
} as const;

export type FamiliarSlotKind = ValueOf<typeof FamiliarSlotKind>;

/**
 * One spell a familiar knows, as a slot on the character at its level (ADR-0044): the repository a witch prepares from.
 * It belongs to the witch and not to the creature, so a replacement familiar knows the same spells with nothing copied.
 */
export interface FamiliarSpellSlot {
  readonly key: SlotKey;
  readonly entry: Slug;
  readonly kind: FamiliarSlotKind;
  /** A cantrip, or the highest rank the slot takes: a spell of that rank or lower, or exactly 1st for the starting ones. */
  readonly rank: PreparedRank;
  /** The level the patron teaches it at; undefined for the starting spells. */
  readonly level: Level | undefined;
  /** Every spell the slot takes, common ones and those the build lists access to, by name. */
  readonly options: ReadonlyArray<SpellOption>;
  readonly stored: ChoiceValue | undefined;
  /** Undefined while the slot is empty, or holds something it doesn't offer. */
  readonly pick: SpellOption | undefined;
}

/** Which spells a slot takes: cantrips, 1st-rank ones, or any up to the highest rank the witch can cast. */
const ReachOf = { Cantrip: 'cantrip', First: 'first', Top: 'top' } as const;

type ReachOf = ValueOf<typeof ReachOf>;

/** A slot a familiar has before the spells it takes are known: its key, kind and the rank it takes. */
interface Place {
  readonly key: SlotKey;
  readonly kind: FamiliarSlotKind;
  readonly rank: ReachOf;
  readonly level: Level | undefined;
}

/** The slots a witch's familiar has at `level`, before the spells they take are known. */
function placesAt(level: Level): ReadonlyArray<Place> {
  const cantrips = Array.from({ length: STARTING_CANTRIPS }, (_unused, index): Place => ({
    key: SlotKey.parse(`${FAMILIAR_SPELL_PREFIX}cantrip:${index}`),
    kind: FamiliarSlotKind.Cantrip,
    rank: ReachOf.Cantrip,
    level: undefined,
  }));

  const first = Array.from({ length: STARTING_FIRST_RANK }, (_unused, index): Place => ({
    key: SlotKey.parse(`${FAMILIAR_SPELL_PREFIX}first-rank:${index}`),
    kind: FamiliarSlotKind.FirstRank,
    rank: ReachOf.First,
    level: undefined,
  }));

  const lesson: Place = {
    key: SlotKey.parse(`${FAMILIAR_SPELL_PREFIX}lesson`),
    kind: FamiliarSlotKind.Lesson,
    rank: ReachOf.First,
    level: undefined,
  };

  const taught = Array.from({ length: Math.max(0, level - 1) }, (_unused, step) =>
    Array.from({ length: SPELLS_PER_LEVEL }, (_slot, index): Place => ({
      key: SlotKey.parse(`${FAMILIAR_SPELL_PREFIX}level:${step + 2}:${index}`),
      kind: FamiliarSlotKind.Level,
      rank: ReachOf.Top,
      level: Level.parse(step + 2),
    })),
  ).flat();

  return [...cantrips, ...first, lesson, ...taught];
}

/** The spells the witch's own prepared slots of `rank` offer: every one the tradition and her access give, by name. */
function offeredAt(slots: ReadonlyArray<PreparedSlot>, rank: PreparedRank): ReadonlyArray<SpellOption> {
  return (
    slots.find((slot) => slot.entry === FAMILIAR_REPOSITORY_ENTRY && slot.pool === undefined && slot.rank === rank)
      ?.options ?? []
  );
}

/**
 * Every slot of the spells the character's familiar knows at its level: none unless the character is a witch, whose
 * familiar is the repository its patron fills (Witch). The starting ones are 10 cantrips, five 1st-rank spells and the
 * lesson's, then two more each level, of any rank the witch can cast. Each takes what the witch's own slots of that rank
 * would, so common spells and those the build lists access to are on offer.
 */
export function familiarSpellSlots(document: CharacterDocument, reads: PreparedReads): Array<FamiliarSpellSlot> {
  const slots = preparedSlots(document, reads).filter((slot) => slot.entry === FAMILIAR_REPOSITORY_ENTRY);

  if (slots.length === 0) {
    return [];
  }

  const top = slots.findLast((slot) => slot.pool === undefined && slot.rank !== SlotRank.Cantrip)?.rank;

  const rankOf = {
    [ReachOf.Cantrip]: SlotRank.Cantrip,
    [ReachOf.First]: SpellRank.parse(1),
    [ReachOf.Top]: top ?? SpellRank.parse(1),
  } as const;

  return placesAt(Level.parse(document.level)).map((place): FamiliarSpellSlot => {
    const rank = rankOf[place.rank];
    const { key } = place;
    const options = offeredAt(slots, rank).filter((spell) => place.rank !== ReachOf.First || spell.rank === 1);
    const stored = document.build.choices[key];
    const pick = options.find((spell) => spell.id === stored);

    return { key, entry: FAMILIAR_REPOSITORY_ENTRY, kind: place.kind, rank, level: place.level, options, stored, pick };
  });
}

/** Why a familiar's slot refuses a spell: the character hasn't the slot, or it doesn't take the spell. */
export const FamiliarSpellRefusal = { NotOpen: 'notOpen', NotOffered: 'notOffered' } as const;

export type FamiliarSpellRefusal = ValueOf<typeof FamiliarSpellRefusal>;

/** Why a pick's spell can't be one the familiar knows in its slot, or undefined when it can. */
export function familiarSpellRefusal(
  document: CharacterDocument,
  reads: PreparedReads,
  { slot: key, selection }: SlotPick,
): FamiliarSpellRefusal | undefined {
  const slot = familiarSpellSlots(document, reads).find((each) => each.key === key);

  if (slot === undefined) {
    return FamiliarSpellRefusal.NotOpen;
  }

  return slot.options.some((spell) => spell.id === selection) ? undefined : FamiliarSpellRefusal.NotOffered;
}

/** Whether `slot` is a familiar spell slot's key, whether or not the character has it. */
export function isFamiliarSpellKey(slot: SlotKey): boolean {
  return slot.startsWith(FAMILIAR_SPELL_PREFIX);
}
