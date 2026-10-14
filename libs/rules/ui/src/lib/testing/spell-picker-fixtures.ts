import {
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

import type { SpellPickerRow } from '../spell-picker/spell-picker-row';

/** Player Core, page 1: a source for a fixture spell. */
const PLAYER_CORE: readonly SourceRef[] = [SourceRef.parse({ kind: 'book', book: 'player-core', page: 1 })];

/** A common, arcane, 2-action, 30-foot, instant first-rank spell with one target, which `overrides` change. */
export function spellRow(overrides: Partial<SpellPickerRow> & Pick<SpellPickerRow, 'id' | 'name'>): SpellPickerRow {
  return {
    rank: 1,
    cantrip: false,
    heightenedTo: undefined,
    traditions: [MagicTradition.Arcane],
    rarity: Rarity.Common,
    cast: [CastActions.Two],
    range: [RangeBand.UpTo30],
    area: AreaValue.None,
    targets: [TargetValue.Single],
    defense: [DefenseValue.None],
    duration: [DurationValue.Instant],
    traits: [],
    sources: PLAYER_CORE,
    disabledReason: undefined,
    ...overrides,
  };
}
