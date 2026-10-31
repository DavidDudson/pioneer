import type { ActionCost, ContentId, SpellRank, TargetValue } from '@pioneer/rules/sdk';

/** One way of casting: action glyphs (a variable cost runs from `cost` to `upTo`), or a time worded. */
export type SingleSpellCostLine =
  | { readonly kind: 'actions'; readonly cost: ActionCost; readonly upTo: ActionCost | undefined }
  | { readonly kind: 'time'; readonly text: string };

/** What casting costs: one way, or several the caster picks from ("2 actions or 2 rounds"). */
export type SpellCostLine =
  SingleSpellCostLine | { readonly kind: 'either'; readonly options: readonly SingleSpellCostLine[] };

/** One part of a spell's damage or healing, worded: "6d6 fire", "2d8 healing". */
export interface SpellEffectLine {
  /** Unique among the spell's parts: the part's key. */
  readonly key: string;
  readonly text: string;
}

/** What a spell, or one of its variants, takes and does at the rank it is cast; a field the spell has none of is left out. */
export interface SpellFieldsLine {
  readonly cost: SpellCostLine;
  readonly range: string | undefined;
  readonly area: string | undefined;
  readonly targets: string | undefined;
  readonly defence: string | undefined;
  readonly duration: string | undefined;
  /** Its damage and healing at the cast rank. */
  readonly effects: readonly SpellEffectLine[];
}

/** A variant of a spell (Heal's three versions), under its name. */
export interface SpellVariantLine extends SpellFieldsLine {
  readonly name: string;
}

/** A spell as a list shows it at the rank it is cast (#484). */
export interface SpellDetailLine extends SpellFieldsLine {
  /** The spell's content, which its name previews on hover. */
  readonly id: ContentId;
  readonly name: string;
  /** The rank it is cast at: heightened to the slot's. */
  readonly rank: SpellRank;
  /** What it targets as the spell facets sort it: one target, several, allies, itself or nothing. */
  readonly targetValues: readonly TargetValue[];
  /** It counteracts (Dispel Magic). */
  readonly counteract: boolean;
  /** Badges, as message keys: "Cantrip", "Focus", "Signature". */
  readonly tags: readonly string[];
  readonly variants: readonly SpellVariantLine[];
}
