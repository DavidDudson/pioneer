import type { BugReportService } from '@pioneer/identity/application';
import { IdentityContract } from '@pioneer/identity/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';
import type { Elysia } from 'elysia';

/**
 * HTTP adapter for filing bug reports. The reporter is always the caller, and the caller is
 * authenticated before the body is read.
 */
export function bugReportRoutes(reports: BugReportService, auth: RequestAuthenticator): Elysia {
  return new ContractRouter('bug-report-routes').handleSignedIn(
    IdentityContract.reportBug,
    auth,
    async ({ actor, body }) => reports.submit(actor, body),
  ).app;
}
