import { Proficiency } from '@pioneer/rules/sdk';

import type { Vital } from '../vitals/vital';
import { VitalBasisKind } from '../vitals/vital';
import { FIGHTER_STATISTICS } from './breakdown-fixtures';

const [ARMOR_CLASS, FORTITUDE, WILL] = FIGHTER_STATISTICS;

function present<TValue>(value: TValue | undefined): TValue {
  if (value === undefined) {
    throw new Error('Expected the fighter fixtures to hold AC, Fortitude and Will');
  }
  return value;
}

/** A level 3 fighter's vitals: AC in a breastplate, trained; Fortitude expert; Will without a rank. */
export const FIGHTER_VITALS: readonly Vital[] = [
  {
    statistic: present(ARMOR_CLASS),
    rank: Proficiency.Trained,
    basis: { kind: VitalBasisKind.Armor, name: 'Breastplate' },
  },
  { statistic: present(FORTITUDE), rank: Proficiency.Expert },
  { statistic: present(WILL), rank: undefined },
];

/** The fighter out of armour. */
export const UNARMORED_VITALS: readonly Vital[] = [
  { statistic: present(ARMOR_CLASS), rank: Proficiency.Trained, basis: { kind: VitalBasisKind.Unarmored } },
];
