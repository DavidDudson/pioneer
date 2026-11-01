import type { CharacterSheetBundleService } from '@pioneer/character/application';
import { CharacterContract } from '@pioneer/character/domain';
import { ContractRouter, inRequestScope } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/** HTTP adapter for opening a sheet in one request. Needs a signed-in user (401 otherwise). */
export function characterSheetBundleRoutes(
  service: CharacterSheetBundleService,
  auth: RequestAuthenticator,
): ContractRouter['app'] {
  return new ContractRouter('character-sheet-bundle-routes').handleSignedIn(
    CharacterContract.sheetBundle,
    auth,
    async ({ actor, params }) => inRequestScope(async () => service.bundle(actor, params.id)),
  ).app;
}
