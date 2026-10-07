import type { CharacterService } from '@pioneer/character/application';
import { CharacterContract } from '@pioneer/character/domain';
import { ContractRouter } from '@pioneer/shared/server';

/** HTTP adapter: binds the character contract to the application service. */
export function characterRoutes(service: CharacterService): ContractRouter['app'] {
  return new ContractRouter('character-routes')
    .handle(CharacterContract.list, async ({ query }) => [...(await service.list(query))])
    .handle(CharacterContract.get, async ({ params }) => service.get(params.id))
    .handle(CharacterContract.create, async ({ body }) => service.create(body))
    .handle(CharacterContract.patch, async ({ params, body }) =>
      service.patch(params.id, body.expectedVersion, body.patch),
    ).app;
}
