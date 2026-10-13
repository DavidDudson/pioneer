import type {
  AreaValue,
  CastActions,
  DefenseValue,
  DurationValue,
  MagicTradition,
  RangeBand,
  Rarity,
  SourceRef,
  TargetValue,
} from '@pioneer/rules/sdk';

/** The columns a spell picker sorts by; the others show facts to choose by. */
export const SpellPickerColumn = { Name: 'name', Rank: 'rank' } as const;

/** One spell a slot offers: what a player weighs to choose it. */
export interface SpellPickerRow {
  /** The spell's content id, which is the value picked. */
  readonly id: string;
  readonly name: string;
  readonly rank: number;
  readonly cantrip: boolean;
  /** The rank a slot casts it at when that is above its own (a cantrip's is half the level); undefined if none. */
  readonly heightenedTo: number | undefined;
  readonly traditions: readonly MagicTradition[];
  readonly rarity: Rarity;
  readonly cast: readonly CastActions[];
  readonly range: readonly RangeBand[];
  readonly area: AreaValue;
  readonly targets: readonly TargetValue[];
  /** What it is rolled against: an attack or a save, or none. */
  readonly defense: readonly DefenseValue[];
  readonly duration: readonly DurationValue[];
  /** Trait names. */
  readonly traits: readonly string[];
  readonly sources: readonly SourceRef[];
  /** Why the spell can't be picked, already translated; undefined when it can. */
  readonly disabledReason: string | undefined;
}
