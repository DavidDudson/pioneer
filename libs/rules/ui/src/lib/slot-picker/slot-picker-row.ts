import type { Attribute, Proficiency, Rarity, RichText, SourceRef } from '@pioneer/rules/sdk';

/** The columns a slot picker sorts by; the others show facts to choose by. */
export const SlotPickerColumn = {
  Name: 'name',
  Rank: 'rank',
  Modifier: 'modifier',
  Level: 'level',
  Boosted: 'boosted',
  ArmorPenalty: 'armorPenalty',
  Rarity: 'rarity',
  Script: 'script',
} as const;

/** What an option's content entry says of itself, to choose by. */
export interface SlotPickerFacts {
  /** Absent for an entry without a level. */
  readonly level: number | undefined;
  readonly rarity: Rarity;
  /** Trait names. */
  readonly traits: readonly string[];
  readonly summary: RichText;
  /** From a pre-remaster book, so the table says so beside its traits. */
  readonly legacy?: true;
  /** From a pack the character no longer has in force, so the table says so beside its traits. */
  readonly unsupported?: true;
  /** The names of the entries that replace it, so the table says so beside its traits. */
  readonly replacedBy?: readonly string[];
}

/** One option of a slot that lists its options: its name, and the source of its content entry when it has one. */
export interface SlotPickerRow {
  /** The option's value, which is what is picked. */
  readonly id: string;
  readonly name: string;
  readonly sources: readonly SourceRef[];
  /** What its content entry says of itself; undefined for an option no entry stands behind. */
  readonly facts: SlotPickerFacts | undefined;
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
  /** The penalty the worn armour gives it now, negative; undefined when the armour gives it none. */
  readonly armorPenalty: number | undefined;
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
  /** The writing system it is written in; undefined where the rules give none. */
  readonly script: string | undefined;
  /** The character knows it already. */
  readonly known: boolean;
  readonly sources: readonly SourceRef[];
  readonly disabledReason: string | undefined;
}
