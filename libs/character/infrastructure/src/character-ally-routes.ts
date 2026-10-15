import type { CharacterAllyService } from '@pioneer/character/application';
import { CharacterContract } from '@pioneer/character/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/** HTTP adapter for the allies a character can name as the giver of an effect. Needs a signed-in user (401 otherwise). */
export function characterAllyRoutes(service: CharacterAllyService, auth: RequestAuthenticator): ContractRouter['app'] {
  return new ContractRouter('character-ally-routes').handleSignedIn(
    CharacterContract.allies,
    auth,
    async ({ actor, params }) => service.allies(actor, params.id),
  ).app;
}
