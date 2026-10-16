import type { BugReportService, BugReportTriageService } from '@pioneer/identity/application';
import { IdentityContract } from '@pioneer/identity/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';
import type { Elysia } from 'elysia';

/**
 * HTTP adapter for bug reports. The reporter is always the caller, and the caller is authenticated before the body
 * is read. The list, one report and its status are for maintainers; to anyone else they are a 404.
 */
export function bugReportRoutes(
  reports: BugReportService,
  triage: BugReportTriageService,
  auth: RequestAuthenticator,
): Elysia {
  return new ContractRouter('bug-report-routes')
    .handleSignedIn(IdentityContract.reportBug, auth, async ({ actor, body }) => reports.submit(actor, body))
    .handleSignedIn(IdentityContract.listBugReports, auth, async ({ actor }) => triage.list(actor))
    .handleSignedIn(IdentityContract.readBugReport, auth, async ({ actor, params }) => triage.read(actor, params.id))
    .handleSignedIn(IdentityContract.triageBugReport, auth, async ({ actor, params, body }) =>
      triage.setStatus(actor, params.id, body.status),
    ).app;
}
