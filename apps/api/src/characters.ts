import { CharacterService } from '@pioneer/character/application';
import { characterRoutes, DrizzleCharacterRepository } from '@pioneer/character/infrastructure';
import { ContentRepository, StoredContentSource } from '@pioneer/rules/infrastructure';
import type { Clock } from '@pioneer/shared/kernel';
import type { ContractRouter, RequestAuthenticator } from '@pioneer/shared/server';

import type { Database } from './database';

/**
 * The character context's part of the composition root: content, service and routes. Content is read from the
 * content tables the seed fills, so a re-seed is served without a restart.
 */
export function characters(db: Database, clock: Clock, authenticator: RequestAuthenticator): ContractRouter['app'] {
  const content = new StoredContentSource(new ContentRepository(db));
  const service = new CharacterService(new DrizzleCharacterRepository(db), content, clock);
  return characterRoutes(service, authenticator);
}
