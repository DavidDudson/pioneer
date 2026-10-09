import type { CharacterService } from '@pioneer/character/application';
import { CharacterContract } from '@pioneer/character/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/**
 * HTTP adapter: binds the character contract to the application service. Every route needs a
 * signed-in user (401 otherwise); what that user may see is the service's policy.
 */
export function characterRoutes(service: CharacterService, auth: RequestAuthenticator): ContractRouter['app'] {
  return new ContractRouter('character-routes')
    .handle(CharacterContract.list, async ({ query, ...exchange }) => [
      ...(await service.list(await auth.actingUser(exchange), query)),
    ])
    .handle(CharacterContract.get, async ({ params, ...exchange }) =>
      service.get(await auth.actingUser(exchange), params.id),
    )
    .handle(CharacterContract.create, async ({ body, ...exchange }) =>
      service.create(await auth.actingUser(exchange), body),
    )
    .handle(CharacterContract.patch, async ({ params, body, ...exchange }) =>
      service.patch(await auth.actingUser(exchange), params.id, body),
    ).app;
}
