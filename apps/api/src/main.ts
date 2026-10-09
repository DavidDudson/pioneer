import { Elysia } from 'elysia';

import { createApp } from './app';
import { connect, runMigrations } from './database';
import { readEnv, readHealthEnv, readMigrateEnv } from './env';
import { API_PREFIX } from './identity';
import { spa } from './spa';

/** `pioneer-api migrate` applies migrations and exits; no argument serves. */
const MIGRATE_COMMAND = 'migrate';
/** `pioneer-api health` exits 0 when the server on PORT answers its health check: the container HEALTHCHECK. */
const HEALTH_COMMAND = 'health';
const COMMANDS: readonly string[] = [MIGRATE_COMMAND, HEALTH_COMMAND];
const HEALTH_TIMEOUT = 5000;

const command = Bun.argv.at(2);
if (command !== undefined && !COMMANDS.includes(command)) {
  throw new Error(`Unknown command "${command}"; expected one of ${COMMANDS.join(', ')} or none`);
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
} else if (command === HEALTH_COMMAND) {
  const env = readHealthEnv();
  const status = await fetch(`http://127.0.0.1:${env.PORT}${API_PREFIX}/health`, {
    signal: AbortSignal.timeout(HEALTH_TIMEOUT),
  }).then((response): string => (response.ok ? '' : `HTTP ${response.status}`), String);
  // One line, not a stack trace: the container runtime keeps the last few as health check logs.
  if (status !== '') {
    console.error(`health check failed: ${status}`);
    process.exitCode = 1;
  }
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
