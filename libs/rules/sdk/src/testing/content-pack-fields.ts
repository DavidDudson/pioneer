import type { ConditionRecovery } from '../condition';
import type { RichText } from '../rich-text';

/** A deity's `data` as tests give it: any field left out is empty, and the category is `deity`. */
export type DeityFields = Partial<
  Record<'domains' | 'font' | 'attributes' | 'skills' | 'weapons' | 'spells', unknown>
> & {
  readonly category?: string;
  readonly sanctification?: object;
  readonly description?: readonly object[];
};

/** An item's kind `data`, with the traits (`invested`) and rule elements as JSON a magic item has. */
export interface MagicItemFields {
  readonly data: object;
  readonly traits?: readonly string[];
  readonly rules?: readonly object[];
  /** Its item level, 0 when left out. */
  readonly level?: number;
}

/** What a test condition has beyond its rule elements. */
export interface ConditionFields {
  /** Whether it carries a value (Clumsy 1). */
  readonly valued?: boolean;
  /** How it recovers, by trigger (Fatigued is removed by Rest). */
  readonly recovery?: ConditionRecovery;
}

/** What a test spell has: its rank and traditions, and its traits (`cantrip`, `focus`) and rarity. */
export interface SpellFields {
  readonly rank: number;
  readonly traditions: readonly string[];
  readonly traits?: readonly string[];
  readonly rarity?: string;
  /** How long it lasts, as the content writes it. */
  readonly duration?: object;
  /** Whether ending it takes the Dismiss action. */
  readonly dismiss?: true;
  /** What ending it early needs, when it is not the Dismiss action. */
  readonly dismissNote?: RichText;
  /** The ids of the effects casting it can put on the caster. */
  readonly effects?: readonly string[];
}

/** What a test class has beyond its key attribute. */
export interface ClassFields {
  readonly hitPoints?: number;
  readonly rules?: readonly object[];
}

/** What a test class feature has. */
export interface ClassFeatureFields {
  readonly tags?: readonly string[];
  readonly rules?: readonly object[];
  /** Attributes it adds to its class's key attribute options (a rogue's racket). */
  readonly keyAttributeOptions?: readonly string[];
}
