import { InstantCodec, LocaleSchema, Uuid } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { BugReportId, DisplayName, UserId } from './identity-fields';

export const BUG_REPORT_ROUTE_MAX_LENGTH = 512;
export const BUG_REPORT_APP_VERSION_MAX_LENGTH = 64;
export const BUG_REPORT_USER_AGENT_MAX_LENGTH = 512;
export const BUG_REPORT_TEXT_MAX_LENGTH = 4000;

/** Where a report is in the maintainer's queue. */
export const BugReportStatus = {
  Open: 'open',
  Confirmed: 'confirmed',
  Fixed: 'fixed',
  Declined: 'declined',
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
 * What the reporter tells us about the bug. `characterId` is the character they were looking at,
 * kept as a plain reference: the report outlives the character.
 */
const BugReportDetails = {
  route: ReportedRoute,
  appVersion: AppVersion,
  locale: LocaleSchema,
  userAgent: UserAgent,
  description: ReportDescription,
  steps: ReportText,
  characterId: Uuid.optional(),
};

/**
 * What a signed-in user sends to report a bug. The reporter and the time are the server's to
 * stamp. `shareCharacter` asks for a frozen copy of `characterId`'s stored inputs to go with the
 * report; it is off unless the sender says so, and means nothing without a `characterId`.
 */
export const BugReportSubmission = z.strictObject({
  ...BugReportDetails,
  shareCharacter: z.boolean().default(false),
});
export type BugReportSubmission = z.output<typeof BugReportSubmission>;

/**
 * A frozen copy of a character's stored inputs (ADR-0004) as the Pioneer character file holds them,
 * so it carries that file's `format` and `formatVersion`. To identity it is an opaque document: it
 * is written once, when the report is filed, and later edits to the character never reach it.
 */
export const CharacterSnapshot = z.looseObject({});
export type CharacterSnapshot = z.output<typeof CharacterSnapshot>;

/** A stored bug report. */
export const BugReport = z.strictObject({
  ...BugReportDetails,
  id: BugReportId,
  reporter: UserId,
  createdAt: InstantCodec,
  status: BugReportStatusSchema,
  snapshot: CharacterSnapshot.optional(),
});
export type BugReport = z.output<typeof BugReport>;

/**
 * What the API answers with once a report is filed: the report without its snapshot, which is for
 * maintainers, and whether one was taken. A report that asked for a character but got none (the
 * character is gone, or can't be exported) is still filed, and says so here.
 */
export const BugReportReceipt = z.strictObject({
  ...BugReport.omit({ snapshot: true }).shape,
  snapshotTaken: z.boolean(),
});
export type BugReportReceipt = z.output<typeof BugReportReceipt>;

/** The most reports a maintainer's list shows, newest first. */
export const BUG_REPORT_LIST_LIMIT = 100;

/** One row of the maintainers' list: where a report stands and who sent it, not what it says in full. */
export const BugReportListItem = z.strictObject({
  id: BugReportId,
  status: BugReportStatusSchema,
  route: ReportedRoute,
  description: ReportDescription,
  reporter: UserId,
  /** Their name now; absent if the account has gone. */
  reporterName: DisplayName.optional(),
  createdAt: InstantCodec,
  /** Whether the reporter shared a copy of their character. */
  hasSnapshot: z.boolean(),
});
export type BugReportListItem = z.output<typeof BugReportListItem>;

/** A report as a maintainer reads it: everything the reporter sent, and the snapshot if they shared one. */
export const BugReportDetail = z.strictObject({
  ...BugReport.shape,
  reporterName: DisplayName.optional(),
});
export type BugReportDetail = z.output<typeof BugReportDetail>;

/** A maintainer's change to a report: where it stands now. */
export const BugReportTriage = z.strictObject({ status: BugReportStatusSchema });
export type BugReportTriage = z.output<typeof BugReportTriage>;
