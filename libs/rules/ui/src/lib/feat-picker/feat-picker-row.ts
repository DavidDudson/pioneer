import type { FeatCategory, Rarity, SourceRef } from '@pioneer/rules/sdk';

import type { ActionKind } from '../picker-cells/picker-cell-messages';
import type { PrerequisiteLine } from '../picker-cells/prerequisite-list/prerequisite-list.component';

/** The columns a feat picker sorts by; the others show facts to choose by. */
export const FeatPickerColumn = { Name: 'name', Level: 'level' } as const;

/** One feat a slot offers: what a player weighs to choose it. */
export interface FeatPickerRow {
  /** The feat's content id, which is the value picked. */
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly category: FeatCategory;
  readonly action: ActionKind;
  readonly rarity: Rarity;
  /** Trait names. */
  readonly traits: readonly string[];
  readonly prerequisites: readonly PrerequisiteLine[];
  readonly sources: readonly SourceRef[];
  /** Why the feat can't be picked, already translated; undefined when it can. */
  readonly disabledReason: string | undefined;
  /** Something to know before picking a feat that can be, already translated (it would train a skill again). */
  readonly note: string | undefined;
}
