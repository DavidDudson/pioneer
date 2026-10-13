import { CharacterService, FeatDisplayService, PlayService, SheetModeService } from '@pioneer/character/application';
import {
  characterRoutes,
  featDisplayRoutes,
  DrizzleCharacterRepository,
  DrizzleFeatDisplayRepository,
  DrizzleSheetModeRepository,
  playRoutes,
  sheetModeRoutes,
} from '@pioneer/character/infrastructure';
import { ContentRepository, StoredContentSource } from '@pioneer/rules/infrastructure';
import type { Clock } from '@pioneer/shared/kernel';
import type { ContractRouter, RequestAuthenticator } from '@pioneer/shared/server';

import type { Database } from './database';

/**
 * The character context's part of the composition root: content, services and routes. Content is read from the
 * content tables the seed fills, so a re-seed is served without a restart.
 */
export function characters(db: Database, clock: Clock, authenticator: RequestAuthenticator): ContractRouter['app'] {
  const content = new StoredContentSource(new ContentRepository(db));
  const repository = new DrizzleCharacterRepository(db);
  const service = new CharacterService(repository, content, clock);
  const sheetModes = new SheetModeService(repository, new DrizzleSheetModeRepository(db), clock);
  const featDisplay = new FeatDisplayService(repository, new DrizzleFeatDisplayRepository(db), clock);
  const play = new PlayService(repository, content, clock);
  return characterRoutes(service, authenticator)
    .use(sheetModeRoutes(sheetModes, authenticator))
    .use(featDisplayRoutes(featDisplay, authenticator))
    .use(playRoutes(play, authenticator));
}
