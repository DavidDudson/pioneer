import type { Attribute, AttributeBoost, HitPoints, RichText, SourceRef } from '@pioneer/rules/sdk';

/** The columns a class picker sorts by; the others show facts to choose by. */
export const ClassPickerColumn = { Name: 'name', HitPoints: 'hitPoints', Modifier: 'modifier' } as const;

/** One class a slot offers: what a player weighs to choose it. */
export interface ClassPickerRow {
  /** The class's content id, which is the value picked. */
  readonly id: string;
  readonly name: string;
  /** The attributes its key attribute may be. */
  readonly keyAttribute: AttributeBoost;
  /** Hit points gained each level, before Constitution. */
  readonly hitPoints: HitPoints;
  /** The skills it trains outright, by name. */
  readonly skills: readonly string[];
  /** How many more skills the player trains, before the Intelligence modifier. */
  readonly additionalSkills: number;
  /** The traditions of its spellcasting, by name; none for a class that casts no spells. */
  readonly traditions: readonly string[];
  /** The ranks it starts with, skills aside, each as "Perception: Expert". */
  readonly proficiencies: readonly string[];
  readonly sources: readonly SourceRef[];
  /** A note on picking it, already translated: the skills it would train again; undefined when there is none. */
  readonly note: string | undefined;
  readonly disabledReason: string | undefined;
}

/** One subclass (a doctrine, muse, order or school) a slot offers. */
export interface SubclassPickerRow {
  /** The subclass's content id, which is the value picked. */
  readonly id: string;
  readonly name: string;
  /** What it grants, in its own words. */
  readonly summary: RichText;
  readonly sources: readonly SourceRef[];
  /** A note on picking it, already translated: the skills it would train again; undefined when there is none. */
  readonly note: string | undefined;
  readonly disabledReason: string | undefined;
}

/** One attribute a class lets the player pick as its key attribute, with where the character stands in it. */
export interface KeyAttributePickerRow {
  /** The attribute, which is the value picked. */
  readonly id: Attribute;
  /** The attribute's name. */
  readonly name: string;
  /** The character's modifier in it now. */
  readonly modifier: number;
  /** The score that modifier stands for. */
  readonly score: number;
  readonly disabledReason: string | undefined;
}
