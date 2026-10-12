import type { Proficiency } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import type { NamedStatistic } from '../statistics/statistics.component';

export const VitalBasisKind = { Armor: 'armor', Unarmored: 'unarmored' } as const;
export type VitalBasisKind = ValueOf<typeof VitalBasisKind>;

/** What sets Armor Class: the worn armour, by name, or none. */
export type VitalBasis =
  | { readonly kind: typeof VitalBasisKind.Armor; readonly name: string }
  | { readonly kind: typeof VitalBasisKind.Unarmored };

/**
 * One statistic of the sheet's vitals row: Armor Class, a save or Perception, the rank its proficiency bonus reads
 * (undefined when the content has no rank for it), and for Armor Class what sets it.
 */
export interface Vital {
  readonly statistic: NamedStatistic;
  readonly rank: Proficiency | undefined;
  readonly basis?: VitalBasis;
}
