import type { PioneerFileService } from '@pioneer/character/application';
import { PioneerExportContract, PioneerImportContract } from '@pioneer/interop/pioneer';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/**
 * HTTP adapter: binds the Pioneer character file contracts to their service. Every route needs a signed-in user (401
 * otherwise); what that user may export or import is the service's policy.
 */
export function pioneerFileRoutes(service: PioneerFileService, auth: RequestAuthenticator): ContractRouter['app'] {
  return new ContractRouter('pioneer-file-routes')
    .handleSignedIn(PioneerExportContract.export, auth, async ({ actor, params }) => service.export(actor, params.id))
    .handleSignedIn(PioneerImportContract.preview, auth, async ({ actor, body }) => service.preview(actor, body))
    .handleSignedIn(PioneerImportContract.import, auth, async ({ actor, body }) => service.import(actor, body)).app;
}
