import type { ActionCost, ContentText, CreatureData, Level, RefNode, RichText, Trait } from '@pioneer/rules/sdk';

/** How much of the stat block shows: the preview keeps to what a glance needs, the full block is the printed one. */
export const StatBlockLayout = { Preview: 'preview', Full: 'full' } as const;
export type StatBlockLayout = (typeof StatBlockLayout)[keyof typeof StatBlockLayout];

/** A creature entry as the stat block reads it: the envelope's name, level and traits, and its `data`. */
export interface StatBlockCreature {
  readonly name: ContentText;
  readonly level: Level;
  /** The slugs of the creature's traits. */
  readonly traits: readonly Trait[];
  readonly data: CreatureData;
}

/** A labelled line of text ("Languages Common, Goblin"). */
export interface StatLine {
  readonly label: string;
  readonly text: string;
}

/** One part of a Strike's bracketed list: text, or a trait (its `text` the slug) shown as a chip. */
export interface StrikeTag {
  readonly text: string;
  readonly trait: Trait | undefined;
}

/** What a Strike's bracketed list holds: reach and range increment worded, and the real traits. */
export interface StrikeQualifiers {
  readonly reach: string | undefined;
  readonly increment: string | undefined;
  readonly traits: readonly Trait[];
}

/** A Strike, worded. */
export interface StrikeLine {
  readonly summary: string;
  /**
   * The reach, range increment and traits in brackets, as the parts the locale's list puts them in; empty for a
   * Strike with none. A trait part is a chip, the rest plain text.
   */
  readonly tags: readonly StrikeTag[];
  readonly damage: StatLine | undefined;
  readonly effects: RichText | undefined;
}

/** A labelled passage of rules text ("Trigger", "Requirements"). */
export interface StatPassage {
  readonly label: string;
  readonly text: RichText;
}

/** A special ability, worded; `cost` is absent for a passive one. */
export interface AbilityLine {
  readonly name: ContentText;
  readonly cost: ActionCost | undefined;
  readonly traits: readonly Trait[];
  readonly lines: readonly StatLine[];
  readonly passages: readonly StatPassage[];
  readonly description: RichText;
}

/** A spell a creature casts: a link to the spell, and how often. */
interface SpellLine {
  readonly ref: RefNode;
  readonly uses: string | undefined;
}

/** The spells of one rank. */
interface SpellRankLine {
  readonly rank: string;
  readonly spells: readonly SpellLine[];
}

/** A spellcasting entry, worded. */
export interface SpellcastingLine {
  readonly heading: string;
  readonly numbers: string;
  readonly ranks: readonly SpellRankLine[];
}

/** An item a creature carries: a link to it, and how many. */
export interface ItemLine {
  readonly ref: RefNode;
  readonly quantity: string | undefined;
}

/** Everything the template shows, worded; absent parts are empty and not shown. */
export interface StatBlockView {
  readonly level: string;
  /** The creature's size, worded: it heads the traits but is no trait. */
  readonly size: string;
  readonly traits: readonly Trait[];
  /** Perception and its senses: the one line a preview keeps of the creature's senses. */
  readonly senses: readonly StatLine[];
  /** Languages, skills and attributes. */
  readonly details: readonly StatLine[];
  /** Armor Class, saves, Hit Points, immunities, weaknesses, resistances and speeds. */
  readonly defences: readonly StatLine[];
  readonly strikes: readonly StrikeLine[];
  readonly abilities: readonly AbilityLine[];
  readonly spellcasting: readonly SpellcastingLine[];
  readonly items: readonly ItemLine[];
  readonly recallKnowledge: readonly StatPassage[];
}
