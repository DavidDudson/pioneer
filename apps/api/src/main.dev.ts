/**
 * Local development entrypoint (`nx serve api`, `just dev`): the server from main.ts plus the dev users, seeded on
 * start, and their one-click sign-in (ADR-0020). The production binary is built from main.ts, which never imports
 * this file or ./dev, so none of it ships; the `verify-dev-free` target checks the built output.
 */
import { systemClock } from '@pioneer/shared/kernel';
import { Elysia } from 'elysia';

import { createApp } from './app';
import { connect, runMigrations } from './database';
import { devSignInRoutes } from './dev/dev-sign-in';
import { assertLocalOrigin, DEV_HOSTNAME } from './dev/local-only';
import { seedDevData } from './dev/seed';
import { readEnv } from './env';

/** `main.dev.ts seed` migrates and seeds, then exits; no argument also serves. */
const SEED_COMMAND = 'seed';

const command = Bun.argv.at(2);
if (command !== undefined && command !== SEED_COMMAND) {
  throw new Error(`Unknown command "${command}"; expected ${SEED_COMMAND} or none`);
}

const env = readEnv();
assertLocalOrigin(env.PUBLIC_ORIGIN);

const db = connect(env.DATABASE_URL);
await runMigrations(db, env.MIGRATIONS_DIR);
await seedDevData(db, systemClock);

if (command === SEED_COMMAND) {
  await db.$client.close();
  console.info('dev data seeded');
} else {
  // Loopback only: nothing else on the network can reach the dev sign-in.
  new Elysia().use(await createApp(db, env, [devSignInRoutes])).listen({ port: env.PORT, hostname: DEV_HOSTNAME });
  console.info(`pioneer api (dev) listening on ${DEV_HOSTNAME}:${env.PORT}`);
}
