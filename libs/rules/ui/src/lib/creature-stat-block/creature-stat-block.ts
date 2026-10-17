import type { ActionCost, ContentText, CreatureData, Level, RefNode, RichText } from '@pioneer/rules/sdk';

/** How much of the stat block shows: the preview keeps to what a glance needs, the full block is the printed one. */
export const StatBlockLayout = { Preview: 'preview', Full: 'full' } as const;
export type StatBlockLayout = (typeof StatBlockLayout)[keyof typeof StatBlockLayout];

/** A creature entry as the stat block reads it: the envelope's name, level and traits, and its `data`. */
export interface StatBlockCreature {
  readonly name: ContentText;
  readonly level: Level;
  /** Trait names as content gives them. */
  readonly traits: readonly string[];
  readonly data: CreatureData;
}

/** A labelled line of text ("Languages Common, Goblin"). */
export interface StatLine {
  readonly label: string;
  readonly text: string;
}

/** A Strike, worded. */
export interface StrikeLine {
  readonly summary: string;
  /** The traits, reach and range increment in brackets; empty for a Strike with none. */
  readonly traitsText: string;
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
  readonly traits: readonly string[];
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
  readonly traits: readonly string[];
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
