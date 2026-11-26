import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/**
 * How far an animal companion has advanced (Player Core p. 211). A mature companion becomes nimble or savage, and a
 * nimble or savage one can specialize. The master's feats decide it, so it is derived and never stored (ADR-0080).
 */
export const CompanionTier = {
  Young: 'young',
  Mature: 'mature',
  Nimble: 'nimble',
  Savage: 'savage',
  Specialized: 'specialized',
} as const;

export type CompanionTier = ValueOf<typeof CompanionTier>;

export const CompanionTierSchema = z.enum(CompanionTier);

/** The specializations a specialized companion takes, up to three, each once (Player Core p. 211). */
export const CompanionSpecialization = {
  Ambusher: 'ambusher',
  Bully: 'bully',
  Daredevil: 'daredevil',
  Racer: 'racer',
  Tracker: 'tracker',
  Wrecker: 'wrecker',
} as const;

export type CompanionSpecialization = ValueOf<typeof CompanionSpecialization>;

export const CompanionSpecializationSchema = z.enum(CompanionSpecialization);
