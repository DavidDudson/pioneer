import type { ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message, Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { AttributeSchema } from './attribute';
import { ContentId } from './content-id';
import { RulesMessage } from './messages';
import { RuleElementKey, ruleElementBase, RuleSlug } from './rule-element-base';
import { SpellRank } from './spell-rank';
import { MagicTraditionSchema } from './spellcasting-tradition';
import { SOURCE_SLUG_MAX } from './statistic';
import { uniqueItems } from './unique-items';

/**
 * How an entry's spells are cast: prepared each day, from a repertoire, innate, or as focus spells for Focus Points
 * (ADR-0050).
 */
export const SpellPreparation = {
  Prepared: 'prepared',
  Spontaneous: 'spontaneous',
  Innate: 'innate',
  Focus: 'focus',
} as const;
export type SpellPreparation = ValueOf<typeof SpellPreparation>;
const SpellPreparationSchema = z.enum(SpellPreparation);

/** An entry's slug, short enough that its `spell-attack:<slug>` and `spell-dc:<slug>` stay selectors. */
const EntrySourceSlug = RuleSlug.refine(
  (slug) => slug.length <= SOURCE_SLUG_MAX,
  issueParams(message(RulesMessage.SpellcastingSlugLength, { maximum: SOURCE_SLUG_MAX })),
);

/**
 * Gives the character a spellcasting entry: a tradition, the attribute its spell attack and DC read, and how its
 * spells are prepared. Each entry in play has its own `spell-attack:<slug>` and `spell-dc:<slug>`, and makes the
 * character trained in `spellcasting`, the one rank every entry reads; a `Proficiency` element raises it further. Two in play with
 * one slug are one entry. A Pioneer element with no Foundry counterpart: Foundry's spellcasting entries are items the
 * player adds by hand (ADR-0040).
 */
export const SpellcastingEntryElement = z.strictObject({
  key: z.literal(RuleElementKey.SpellcastingEntry),
  slug: EntrySourceSlug,
  tradition: MagicTraditionSchema,
  attribute: AttributeSchema,
  preparation: SpellPreparationSchema,
  ...ruleElementBase,
});
export type SpellcastingEntryElement = z.infer<typeof SpellcastingEntryElement>;

/** The most spell slots of one rank, or cantrips, an entry or pool counts; more is clamped here. */
export const SLOT_COUNT_MAX = 99;

/** How many spell slots or cantrips a `SpellSlots` element adds, or an entry has of one rank. */
export const SlotCount = Pg.smallint().min(1).max(SLOT_COUNT_MAX).brand<'SlotCount'>();
export type SlotCount = z.infer<typeof SlotCount>;

/** The ranks a `SpellSlots` element names besides 1 to 10: cantrips, and the entry's highest rank of slots. */
export const SlotRank = {
  Cantrip: 'cantrip',
  Highest: 'highest',
} as const;
export type SlotRank = ValueOf<typeof SlotRank>;

/**
 * Adds spell slots of one rank, or cantrips, to a spellcasting entry: to its own slots, or to a `pool` of slots kept
 * apart because only some spells go in them (a cleric's divine font, a wizard's curriculum). `highest` is the highest
 * rank below 10th the entry's own slots reach, since 10th-rank slots never take abilities that add slots. Counts add
 * up per entry, pool and rank, so a class's table is one element per rank and level the count changes at, read with
 * level predicates. One for an entry not in play adds nothing. A Pioneer element with no Foundry counterpart, like
 * `SpellcastingEntry` (ADR-0041).
 */
export const SpellSlotsElement = z.strictObject({
  key: z.literal(RuleElementKey.SpellSlots),
  entry: EntrySourceSlug,
  rank: z.union([z.enum(SlotRank), SpellRank]),
  value: SlotCount,
  pool: RuleSlug.optional(),
  ...ruleElementBase,
});
export type SpellSlotsElement = z.infer<typeof SpellSlotsElement>;

/** The most spells a `PoolSpells` element names: a school's curriculum lists about twenty. */
const POOL_SPELLS_MAX = 64;

/**
 * The spells a `pool` of an entry's slots takes (ADR-0045): a divine font's heal or harm, a school's curriculum. A pool
 * slot takes any of them that fits it, a cantrip in a cantrip slot and any other spell in a slot of its rank or higher,
 * heightened; tradition and rarity aside, since the feature names them. Those of every element in play for a pool add
 * up; a pool with none takes nothing. A Pioneer element with no Foundry counterpart, like `SpellSlots`.
 */
export const PoolSpellsElement = z.strictObject({
  key: z.literal(RuleElementKey.PoolSpells),
  entry: EntrySourceSlug,
  pool: RuleSlug,
  spells: z.array(ContentId).min(1).max(POOL_SPELLS_MAX).readonly().check(uniqueItems),
  ...ruleElementBase,
});
export type PoolSpellsElement = z.infer<typeof PoolSpellsElement>;

/**
 * Adds the character's deity's spells to an entry's list (ADR-0048): each goes in the entry's own slots like a spell of
 * its tradition, in a slot of the rank the deity grants it at or higher, heightened, whatever its tradition or rarity.
 * Player Core's Deity (Cleric) gives one for the cleric's entry. One for an entry not in play, or with no deity on the
 * character, adds nothing. A Pioneer element with no Foundry counterpart, like `SpellSlots`.
 */
export const DeitySpellsElement = z.strictObject({
  key: z.literal(RuleElementKey.DeitySpells),
  entry: EntrySourceSlug,
  ...ruleElementBase,
});
export type DeitySpellsElement = z.infer<typeof DeitySpellsElement>;

/**
 * Gives a spontaneous entry signature spells (ADR-0047): one spell of each rank of its slots, picked from its
 * repertoire at that rank, which it casts heightened to any rank of its slots, or lower down to its own rank, without
 * learning each rank apart. One for an entry not in play, or a prepared one, gives none. A Pioneer element with no
 * Foundry counterpart, like `SpellSlots`.
 */
export const SignatureSpellsElement = z.strictObject({
  key: z.literal(RuleElementKey.SignatureSpells),
  entry: EntrySourceSlug,
  ...ruleElementBase,
});
export type SignatureSpellsElement = z.infer<typeof SignatureSpellsElement>;

/** The most spells a `FocusSpells` element names: a feature grants one or two. */
const FOCUS_SPELLS_MAX = 8;

/**
 * Gives a focus entry focus spells (ADR-0050): a domain spell, a composition, a hex, an order or school spell, focus
 * cantrips included. They are cast heightened to half the character's level rounded up, with the entry's spell attack
 * and DC. Those of every element in play for an entry add up, each spell once; one for an entry not in play, or for
 * one that isn't a focus entry, gives none. The focus pool follows from them, one Focus Point per focus spell that
 * isn't a cantrip, at most 3, so the element names no points. A Pioneer element with no Foundry counterpart: Foundry's
 * focus spells are items the player adds to a focus entry by hand.
 */
export const FocusSpellsElement = z.strictObject({
  key: z.literal(RuleElementKey.FocusSpells),
  entry: EntrySourceSlug,
  spells: z.array(ContentId).min(1).max(FOCUS_SPELLS_MAX).readonly().check(uniqueItems),
  ...ruleElementBase,
});
export type FocusSpellsElement = z.infer<typeof FocusSpellsElement>;

/** The most Focus Points a focus pool holds, however many focus spells feed it (Player Core). */
export const FOCUS_POOL_MAX = 3;

/** A number of Focus Points: a focus pool's maximum, or the points in it. */
export const FocusPoints = Pg.smallint().min(0).max(FOCUS_POOL_MAX).brand<'FocusPoints'>();
export type FocusPoints = z.infer<typeof FocusPoints>;
