import type { Attribute, AttributeBoost, Feet, HitPoints, RichText, Size, SourceRef } from '@pioneer/rules/sdk';

/** The columns an origin picker sorts by; the others show facts to choose by. */
export const OriginPickerColumn = { Name: 'name', HitPoints: 'hitPoints', Speed: 'speed' } as const;

/** One ancestry a slot offers: what a player weighs to choose it. */
export interface AncestryPickerRow {
  /** The ancestry's id, which is the value picked. */
  readonly id: string;
  readonly name: string;
  readonly hitPoints: HitPoints;
  readonly size: Size;
  readonly speed: Feet;
  readonly boosts: readonly AttributeBoost[];
  readonly flaws: readonly Attribute[];
  /** The languages every member speaks, by name. */
  readonly languages: readonly string[];
  /** Its traits, by name. */
  readonly traits: readonly string[];
  readonly sources: readonly SourceRef[];
  /** Why the ancestry can't be picked, already translated; undefined when it can. */
  readonly disabledReason: string | undefined;
}

/** One heritage a slot offers. */
export interface HeritagePickerRow {
  /** The heritage's content id, which is the value picked. */
  readonly id: string;
  readonly name: string;
  /** The ancestry it belongs to, by name; undefined for a versatile heritage, which any ancestry can take. */
  readonly ancestry: string | undefined;
  /** What it does, in its own words. */
  readonly summary: RichText;
  /** The features and feats it grants, by name. */
  readonly grants: readonly string[];
  readonly sources: readonly SourceRef[];
  readonly disabledReason: string | undefined;
}

/** One background a slot offers. */
export interface BackgroundPickerRow {
  /** The background's content id, which is the value picked. */
  readonly id: string;
  readonly name: string;
  readonly boosts: readonly AttributeBoost[];
  /** The skills it trains, by name. */
  readonly skills: readonly string[];
  /** The Lores it trains, by name. */
  readonly lores: readonly string[];
  /** The feats it grants, by name. */
  readonly feats: readonly string[];
  readonly sources: readonly SourceRef[];
  /** A note on picking it, already translated: the skills it would train again; undefined when there is none. */
  readonly note: string | undefined;
  readonly disabledReason: string | undefined;
}
