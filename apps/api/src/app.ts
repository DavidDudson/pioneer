import { systemClock } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { campaigns } from './campaigns';
import { characters } from './characters';
import type { Database } from './database';
import type { Env } from './env';
import { API_PREFIX, csrf, identity } from './identity';
import type { Identity } from './identity';

/**
 * Extra routes mounted under the API prefix, after the CSRF guard (which only checks unsafe methods). The dev
 * entrypoint adds its sign-in this way.
 */
export type AppExtension = (identity: Identity) => AnyElysia;

/** Composition root: the only place adapters, services and routes meet. */
export async function createApp(db: Database, env: Env, extensions: readonly AppExtension[] = []): Promise<AnyElysia> {
  const clock = systemClock;
  const identityParts = identity(db, env, clock);
  const characterRoutes = await characters(db, clock, identityParts.authenticator);

  let app: AnyElysia = new Elysia({ prefix: API_PREFIX })
    .use(problemHandler)
    .use(csrf(env))
    .get('/health', () => ({ status: 'ok' }))
    .use(identityParts.routes)
    .use(characterRoutes)
    .use(campaigns(db, clock, identityParts.authenticator));
  for (const extend of extensions) {
    app = app.use(extend(identityParts));
  }
  return app;
}
