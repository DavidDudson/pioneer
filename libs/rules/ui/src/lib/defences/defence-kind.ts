import type { ValueOf } from '@pioneer/shared/kernel';

/** One of the three lists of a character's defences. */
export const DefenceKind = {
  Immunities: 'immunities',
  Weaknesses: 'weaknesses',
  Resistances: 'resistances',
} as const;
export type DefenceKind = ValueOf<typeof DefenceKind>;
