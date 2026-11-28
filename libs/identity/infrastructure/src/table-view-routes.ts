import type { TableViewService } from '@pioneer/identity/application';
import { IdentityContract } from '@pioneer/identity/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';
import type { Elysia } from 'elysia';

/**
 * HTTP adapter for the signed-in user's table view preferences. Each request acts on the caller's own
 * preferences only, and is authenticated before its body is read.
 */
export function tableViewRoutes(views: TableViewService, auth: RequestAuthenticator): Elysia {
  return new ContractRouter('table-view-routes')
    .handleSignedIn(IdentityContract.tableView, auth, async ({ actor, params }) => views.get(actor, params.entity))
    .handleSignedIn(IdentityContract.saveTableView, auth, async ({ actor, params, body }) =>
      views.save(actor, params.entity, body),
    ).app;
}
