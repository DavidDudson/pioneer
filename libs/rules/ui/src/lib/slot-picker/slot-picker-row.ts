import type { Attribute, Proficiency, Rarity, SourceRef } from '@pioneer/rules/sdk';

/** The columns a slot picker sorts by; the others show facts to choose by. */
export const SlotPickerColumn = {
  Name: 'name',
  Rank: 'rank',
  Modifier: 'modifier',
  Boosted: 'boosted',
  Rarity: 'rarity',
} as const;

/** One option of a slot that lists its options: its name, and the source of its content entry when it has one. */
export interface SlotPickerRow {
  /** The option's value, which is what is picked. */
  readonly id: string;
  readonly name: string;
  readonly sources: readonly SourceRef[];
  readonly disabledReason: string | undefined;
}

/** One skill a trained skill or skill increase slot offers, with where the character stands in it. */
export interface SkillPickerRow {
  /** The skill's content id, which is the value picked. */
  readonly id: string;
  readonly name: string;
  /** The attribute that governs it; undefined for a skill that has none. */
  readonly attribute: Attribute | undefined;
  /** The rank the character has in it now. */
  readonly rank: Proficiency;
  /** The skill's total modifier now; undefined while the engine has no value for it. */
  readonly modifier: number | undefined;
  readonly disabledReason: string | undefined;
}

/** One attribute a boost slot offers, with the character's modifier in it and what the boost would make it. */
export interface AttributePickerRow {
  /** The attribute, which is the value picked. */
  readonly id: Attribute;
  readonly name: string;
  /** The modifier now, without this slot's boost. */
  readonly modifier: number;
  /** The modifier once this slot's boost is in. */
  readonly boosted: number;
  readonly disabledReason: string | undefined;
}

/** One language the next open language slot offers. */
export interface LanguagePickerRow {
  /** The language's content id, which is the value picked. */
  readonly id: string;
  readonly name: string;
  readonly rarity: Rarity;
  /** The character knows it already. */
  readonly known: boolean;
  readonly sources: readonly SourceRef[];
  readonly disabledReason: string | undefined;
}
