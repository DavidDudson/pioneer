import { systemClock } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { campaigns } from './campaigns';
import { characters } from './characters';
import { content } from './content';
import type { Database } from './database';
import type { Env } from './env';
import { homebrew } from './homebrew';
import { API_PREFIX, csrf, identity } from './identity';
import type { Identity } from './identity';
import { PioneerCharacterSnapshots } from './pioneer-character-snapshots';

/**
 * Extra routes mounted under the API prefix, after the CSRF guard (which only checks unsafe methods). The dev
 * entrypoint adds its sign-in this way.
 */
export type AppExtension = (identity: Identity) => AnyElysia;

/** Composition root: the only place adapters, services and routes meet. */
export function createApp(db: Database, env: Env, extensions: readonly AppExtension[] = []): AnyElysia {
  const clock = systemClock;
  // Identity needs the character export for bug report snapshots, and the characters need identity's authenticator.
  const snapshots = new PioneerCharacterSnapshots();
  const identityParts = identity(db, env, { clock, snapshots });
  const character = characters(db, clock, identityParts.authenticator);
  snapshots.bind(character.pioneerFiles);

  let app: AnyElysia = new Elysia({ prefix: API_PREFIX })
    .use(problemHandler)
    .use(csrf(env))
    .get('/health', () => ({ status: 'ok' }))
    .use(identityParts.routes)
    .use(character.routes)
    .use(campaigns(db, clock, identityParts.authenticator))
    .use(homebrew(db, clock, identityParts.authenticator))
    .use(content(db, identityParts.authenticator));
  for (const extend of extensions) {
    app = app.use(extend(identityParts));
  }
  return app;
}
