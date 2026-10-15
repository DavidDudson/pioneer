import type { PathbuilderImportService } from '@pioneer/character/application';
import { PathbuilderImportContract } from '@pioneer/interop/pathbuilder';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/**
 * HTTP adapter: binds the Pathbuilder import contract to its service. Needs a signed-in user (401 otherwise); the new
 * character is theirs.
 */
export function pathbuilderImportRoutes(
  service: PathbuilderImportService,
  auth: RequestAuthenticator,
): ContractRouter['app'] {
  return new ContractRouter('pathbuilder-import-routes').handleSignedIn(
    PathbuilderImportContract.import,
    auth,
    async ({ actor, body }) => service.importPathbuilder(actor, body),
  ).app;
}
