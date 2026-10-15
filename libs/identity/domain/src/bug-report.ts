import { InstantCodec, LocaleSchema, Uuid } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { BugReportId, UserId } from './identity-fields';

export const BUG_REPORT_ROUTE_MAX_LENGTH = 512;
export const BUG_REPORT_APP_VERSION_MAX_LENGTH = 64;
export const BUG_REPORT_USER_AGENT_MAX_LENGTH = 512;
export const BUG_REPORT_TEXT_MAX_LENGTH = 4000;

/** Where a report is in the maintainer's queue. */
export const BugReportStatus = {
  Open: 'open',
  Closed: 'closed',
} as const;
export type BugReportStatus = ValueOf<typeof BugReportStatus>;
export const BugReportStatusSchema = z.enum(BugReportStatus);

export const ReportedRoute = z.string().trim().min(1).max(BUG_REPORT_ROUTE_MAX_LENGTH).brand<'ReportedRoute'>();
export type ReportedRoute = z.infer<typeof ReportedRoute>;

export const AppVersion = z.string().trim().min(1).max(BUG_REPORT_APP_VERSION_MAX_LENGTH).brand<'AppVersion'>();
export type AppVersion = z.infer<typeof AppVersion>;

export const UserAgent = z.string().trim().min(1).max(BUG_REPORT_USER_AGENT_MAX_LENGTH).brand<'UserAgent'>();
export type UserAgent = z.infer<typeof UserAgent>;

/** Free text the reporter wrote: what went wrong, or the steps to see it (which may be empty). */
export const ReportText = z.string().trim().max(BUG_REPORT_TEXT_MAX_LENGTH).brand<'ReportText'>();
export type ReportText = z.infer<typeof ReportText>;

export const ReportDescription = ReportText.refine((text) => text.length > 0);

/**
 * What a signed-in user sends to report a bug. The reporter and the time are the server's to
 * stamp. `characterId` is the character they were looking at, kept as a plain reference: the
 * report outlives the character.
 */
export const BugReportSubmission = z.strictObject({
  route: ReportedRoute,
  appVersion: AppVersion,
  locale: LocaleSchema,
  userAgent: UserAgent,
  description: ReportDescription,
  steps: ReportText,
  characterId: Uuid.optional(),
});
export type BugReportSubmission = z.output<typeof BugReportSubmission>;

/** A stored bug report, as the API returns it. */
export const BugReport = z.strictObject({
  ...BugReportSubmission.shape,
  id: BugReportId,
  reporter: UserId,
  createdAt: InstantCodec,
  status: BugReportStatusSchema,
});
export type BugReport = z.output<typeof BugReport>;
