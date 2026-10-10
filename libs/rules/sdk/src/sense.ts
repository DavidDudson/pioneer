import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/** How exactly a sense locates what it detects. */
export const SenseAcuity = { Precise: 'precise', Imprecise: 'imprecise', Vague: 'vague' } as const;
export type SenseAcuity = ValueOf<typeof SenseAcuity>;
const SenseAcuitySchema = z.enum(SenseAcuity);

/**
 * A sense's `data` on the `ContentEntry` envelope. A creature lists its own acuity and range for most senses
 * (tremorsense (imprecise) 30 feet); these are the senses that fix them by definition.
 */
export const SenseData = z.strictObject({
  /** The acuity the sense always has (darkvision is precise). */
  acuity: SenseAcuitySchema.optional(),
  /** The sense reaches as far as the creature can perceive (darkvision, low-light vision). */
  unlimitedRange: z.boolean().optional(),
});
export type SenseData = z.infer<typeof SenseData>;
