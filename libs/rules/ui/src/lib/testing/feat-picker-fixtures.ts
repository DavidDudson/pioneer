import { FeatCategory, Rarity, SourceRef } from '@pioneer/rules/sdk';

import type { FeatPickerRow } from '../feat-picker/feat-picker-row';
import { ActionKind } from '../picker-cells/picker-cell-messages';

/** Player Core, page 1: a source for a fixture feat. */
export const PLAYER_CORE: readonly SourceRef[] = [SourceRef.parse({ kind: 'book', book: 'player-core', page: 1 })];

/** A passive, common, general feat with nothing in the way, which `overrides` change. */
export function featRow(overrides: Partial<FeatPickerRow> & Pick<FeatPickerRow, 'id' | 'name'>): FeatPickerRow {
  return {
    level: 1,
    category: FeatCategory.General,
    action: ActionKind.Passive,
    rarity: Rarity.Common,
    traits: [],
    prerequisites: [],
    sources: PLAYER_CORE,
    disabledReason: undefined,
    note: undefined,
    ...overrides,
  };
}
