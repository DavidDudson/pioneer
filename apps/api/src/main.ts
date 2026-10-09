import { Elysia } from 'elysia';

import { createApp } from './app';
import { connect, runMigrations } from './database';
import { readEnv } from './env';
import { spa } from './spa';

/** `pioneer-api migrate` applies migrations and exits; no argument serves. */
const MIGRATE_COMMAND = 'migrate';

const env = readEnv();
const db = connect(env.DATABASE_URL);
const command = Bun.argv.at(2);

if (command === MIGRATE_COMMAND) {
  await runMigrations(db, env.MIGRATIONS_DIR);
  await db.$client.close();
  console.info('migrations applied');
} else if (command === undefined) {
  if (env.MIGRATE_ON_START) {
    await runMigrations(db, env.MIGRATIONS_DIR);
  }
  const server = new Elysia().use(await createApp(db, env));
  if (env.WEB_DIST !== undefined) {
    server.use(spa(env.WEB_DIST));
  }
  server.listen(env.PORT);
  console.info(`pioneer api listening on :${env.PORT}`);
} else {
  throw new Error(`Unknown command "${command}"; expected "${MIGRATE_COMMAND}" or none`);
}
