import type { HomebrewPackService } from '@pioneer/homebrew/application';
import { HomebrewContract } from '@pioneer/homebrew/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/**
 * HTTP adapter: binds the homebrew contract to the application service. Every route needs a signed-in user (401
 * otherwise); which packs that user may see is the service's policy.
 */
export function homebrewRoutes(packs: HomebrewPackService, auth: RequestAuthenticator): ContractRouter['app'] {
  return new ContractRouter('homebrew-routes')
    .handleSignedIn(HomebrewContract.list, auth, async ({ actor }) => [...(await packs.list(actor))])
    .handleSignedIn(HomebrewContract.get, auth, async ({ actor, params }) => packs.get(actor, params.id))
    .handleSignedIn(HomebrewContract.create, auth, async ({ actor, body }) => packs.create(actor, body)).app;
}
