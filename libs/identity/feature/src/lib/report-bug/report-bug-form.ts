import { ReportDescription, ReportText } from '@pioneer/identity/domain';
import * as z from 'zod';

/** What the report form submits; the same text rules the server validates with. */
export const ReportBugForm = z.object({
  description: ReportDescription,
  steps: ReportText,
  /** Whether a copy of the attached character goes with the report. It means nothing without one. */
  shareCharacter: z.boolean(),
});
