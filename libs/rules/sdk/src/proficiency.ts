import type { ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

export const Proficiency = {
  Untrained: 'untrained',
  Trained: 'trained',
  Expert: 'expert',
  Master: 'master',
  Legendary: 'legendary',
} as const;
export type Proficiency = ValueOf<typeof Proficiency>;
export const ProficiencySchema = z.enum(Proficiency);

const RANK_BONUS = {
  [Proficiency.Untrained]: 0,
  [Proficiency.Trained]: 2,
  [Proficiency.Expert]: 4,
  [Proficiency.Master]: 6,
  [Proficiency.Legendary]: 8,
} as const satisfies Record<Proficiency, number>;

/** Proficiency bonus: untrained adds nothing, otherwise rank bonus + level. */
export function proficiencyBonus(rank: Proficiency, level: number): number {
  return rank === Proficiency.Untrained ? 0 : RANK_BONUS[rank] + level;
}
