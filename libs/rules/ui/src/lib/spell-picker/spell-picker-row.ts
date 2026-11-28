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

import type { Chip } from '../picker-cells/chip-list/chip-list.component';

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
  readonly traditions: ReadonlyArray<MagicTradition>;
  readonly rarity: Rarity;
  readonly cast: ReadonlyArray<CastActions>;
  readonly range: ReadonlyArray<RangeBand>;
  readonly area: AreaValue;
  readonly targets: ReadonlyArray<TargetValue>;
  /** What it is rolled against: an attack or a save, or none. */
  readonly defense: ReadonlyArray<DefenseValue>;
  readonly duration: ReadonlyArray<DurationValue>;
  /** Its traits, each a chip that opens the trait's card. */
  readonly traits: ReadonlyArray<Chip>;
  readonly sources: ReadonlyArray<SourceRef>;
  /** Why the spell can't be picked, already translated; undefined when it can. */
  readonly disabledReason: string | undefined;
}
