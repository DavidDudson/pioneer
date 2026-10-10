import { CharacterService } from '@pioneer/character/application';
import { characterRoutes, DrizzleCharacterRepository } from '@pioneer/character/infrastructure';
import { contentCatalog } from '@pioneer/rules/catalog';
import { ContentRegistry } from '@pioneer/rules/sdk';
import type { Clock } from '@pioneer/shared/kernel';
import type { ContractRouter, RequestAuthenticator } from '@pioneer/shared/server';

import type { Database } from './database';

/** The character context's part of the composition root: content, service and routes. */
export async function characters(
  db: Database,
  clock: Clock,
  authenticator: RequestAuthenticator,
): Promise<ContractRouter['app']> {
  const content = new ContentRegistry();
  await Promise.all(contentCatalog.map(async (loader) => content.load(loader)));
  const service = new CharacterService(new DrizzleCharacterRepository(db), content, clock);
  return characterRoutes(service, authenticator);
}
