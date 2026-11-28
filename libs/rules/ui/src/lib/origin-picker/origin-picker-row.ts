import type { Attribute, AttributeBoost, Feet, HitPoints, RichText, Size, SourceRef } from '@pioneer/rules/sdk';

import type { Chip } from '../picker-cells/chip-list/chip-list.component';

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
  readonly boosts: ReadonlyArray<AttributeBoost>;
  readonly flaws: ReadonlyArray<Attribute>;
  /** The languages every member speaks, by name. */
  readonly languages: ReadonlyArray<string>;
  /** Its traits, each a chip that opens the trait's card. */
  readonly traits: ReadonlyArray<Chip>;
  readonly sources: ReadonlyArray<SourceRef>;
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
  readonly grants: ReadonlyArray<string>;
  readonly sources: ReadonlyArray<SourceRef>;
  readonly disabledReason: string | undefined;
}

/** One background a slot offers. */
export interface BackgroundPickerRow {
  /** The background's content id, which is the value picked. */
  readonly id: string;
  readonly name: string;
  readonly boosts: ReadonlyArray<AttributeBoost>;
  /** The skills it trains, by name. */
  readonly skills: ReadonlyArray<string>;
  /** The Lores it trains, by name. */
  readonly lores: ReadonlyArray<string>;
  /** The feats it grants, by name. */
  readonly feats: ReadonlyArray<string>;
  readonly sources: ReadonlyArray<SourceRef>;
  /** A note on picking it, already translated: the skills it would train again; undefined when there is none. */
  readonly note: string | undefined;
  readonly disabledReason: string | undefined;
}
