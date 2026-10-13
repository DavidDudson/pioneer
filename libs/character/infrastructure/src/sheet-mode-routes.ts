import type { SheetModeService } from '@pioneer/character/application';
import { CharacterContract } from '@pioneer/character/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/**
 * HTTP adapter for the tab the signed-in user last had open on a character's sheet. Each request reads or sets the
 * caller's own; who may see the character is the service's policy.
 */
export function sheetModeRoutes(service: SheetModeService, auth: RequestAuthenticator): ContractRouter['app'] {
  return new ContractRouter('sheet-mode-routes')
    .handleSignedIn(CharacterContract.sheetMode, auth, async ({ actor, params }) => service.get(actor, params.id))
    .handleSignedIn(CharacterContract.setSheetMode, auth, async ({ actor, params, body }) =>
      service.set(actor, params.id, body),
    ).app;
}
