import type { ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

/** The four outcomes of a check against a DC, worst first. Values follow Foundry pf2e (ADR-0008). */
export const DegreeOfSuccess = {
  CriticalFailure: 'criticalFailure',
  Failure: 'failure',
  Success: 'success',
  CriticalSuccess: 'criticalSuccess',
} as const;
export type DegreeOfSuccess = ValueOf<typeof DegreeOfSuccess>;
export const DegreeOfSuccessSchema = z.enum(DegreeOfSuccess);

/**
 * How an `AdjustDegreeOfSuccess` effect changes a degree: one or two steps better or worse, or
 * straight to a given degree. Values follow Foundry pf2e (ADR-0008).
 */
export const DegreeChange = {
  OneDegreeBetter: 'one-degree-better',
  OneDegreeWorse: 'one-degree-worse',
  TwoDegreesBetter: 'two-degrees-better',
  TwoDegreesWorse: 'two-degrees-worse',
  ToCriticalSuccess: 'to-critical-success',
  ToSuccess: 'to-success',
  ToFailure: 'to-failure',
  ToCriticalFailure: 'to-critical-failure',
} as const;
export type DegreeChange = ValueOf<typeof DegreeChange>;
export const DegreeChangeSchema = z.enum(DegreeChange);
