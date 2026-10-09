import { Elysia } from 'elysia';

import { createApp } from './app';
import { connect, runMigrations } from './database';
import { readEnv, readMigrateEnv } from './env';
import { spa } from './spa';

/** `pioneer-api migrate` applies migrations and exits; no argument serves. */
const MIGRATE_COMMAND = 'migrate';

const command = Bun.argv.at(2);
if (command !== undefined && command !== MIGRATE_COMMAND) {
  throw new Error(`Unknown command "${command}"; expected "${MIGRATE_COMMAND}" or none`);
}

if (command === MIGRATE_COMMAND) {
  const env = readMigrateEnv();
  const db = connect(env.DATABASE_URL);
  try {
    await runMigrations(db, env.MIGRATIONS_DIR);
  } finally {
    await db.$client.close();
  }
  console.info('migrations applied');
} else {
  const env = readEnv();
  const db = connect(env.DATABASE_URL);
  if (env.MIGRATE_ON_START) {
    await runMigrations(db, env.MIGRATIONS_DIR);
  }
  const server = new Elysia().use(await createApp(db, env));
  if (env.WEB_DIST !== undefined) {
    server.use(spa(env.WEB_DIST));
  }
  server.listen(env.PORT);
  console.info(`pioneer api listening on :${env.PORT}`);
}
