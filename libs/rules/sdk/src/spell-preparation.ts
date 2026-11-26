import type { ValueOf } from '@pioneer/shared/kernel';

/**
 * How an entry's spells are cast: prepared each day, from a repertoire, innate, or as focus spells for Focus Points
 * (ADR-0050).
 */
export const SpellPreparation = {
  Prepared: 'prepared',
  Spontaneous: 'spontaneous',
  Innate: 'innate',
  Focus: 'focus',
} as const;

export type SpellPreparation = ValueOf<typeof SpellPreparation>;
