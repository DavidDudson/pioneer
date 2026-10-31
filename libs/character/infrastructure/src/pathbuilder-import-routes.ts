import type { PathbuilderExportService, PathbuilderImportService } from '@pioneer/character/application';
import { PathbuilderImportContract } from '@pioneer/interop/pathbuilder';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/** What the Pathbuilder routes work through. */
export interface PathbuilderImportServices {
  readonly importer: PathbuilderImportService;
  readonly exports: PathbuilderExportService;
}

/**
 * HTTP adapter: binds the Pathbuilder import contract to its services. Needs a signed-in user (401 otherwise); the new
 * character is theirs, and only a signed-in user can have the server fetch a link.
 */
export function pathbuilderImportRoutes(
  { importer, exports }: PathbuilderImportServices,
  auth: RequestAuthenticator,
): ContractRouter['app'] {
  return new ContractRouter('pathbuilder-import-routes')
    .handleSignedIn(PathbuilderImportContract.import, auth, async ({ actor, body }) =>
      importer.importPathbuilder(actor, body),
    )
    .handleSignedIn(PathbuilderImportContract.fetchExport, auth, async ({ body }) => exports.fetchExport(body.url)).app;
}
