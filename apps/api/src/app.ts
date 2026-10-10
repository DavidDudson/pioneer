import { CampaignService } from '@pioneer/campaign/application';
import { campaignRoutes, DrizzleCampaignRepository } from '@pioneer/campaign/infrastructure';
import { CharacterService } from '@pioneer/character/application';
import { characterRoutes, DrizzleCharacterRepository } from '@pioneer/character/infrastructure';
import { contentCatalog } from '@pioneer/rules/catalog';
import { ContentRegistry } from '@pioneer/rules/sdk';
import { systemClock } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import type { Database } from './database';
import type { Env } from './env';
import { API_PREFIX, csrf, identity } from './identity';

/** Composition root: the only place adapters, services and routes meet. */
export async function createApp(db: Database, env: Env): Promise<AnyElysia> {
  const content = new ContentRegistry();
  await Promise.all(contentCatalog.map(async (loader) => content.load(loader)));

  const clock = systemClock;
  const characters = new CharacterService(new DrizzleCharacterRepository(db), content, clock);
  const campaigns = new CampaignService(new DrizzleCampaignRepository(db), clock);
  const { routes: identityRoutes, authenticator } = identity(db, env, clock);

  return new Elysia({ prefix: API_PREFIX })
    .use(problemHandler)
    .use(csrf(env))
    .get('/health', () => ({ status: 'ok' }))
    .use(identityRoutes)
    .use(characterRoutes(characters, authenticator))
    .use(campaignRoutes(campaigns, authenticator));
}
