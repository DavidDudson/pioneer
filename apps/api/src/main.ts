import { Elysia } from 'elysia';

import { createApp } from './app';
import { connect, runMigrations } from './database';
import { readEnv } from './env';
import { spa } from './spa';

const env = readEnv();
const db = connect(env.DATABASE_URL);
await runMigrations(db);

const server = new Elysia().use(await createApp(db));
if (env.WEB_DIST !== undefined) {
  server.use(spa(env.WEB_DIST));
}
server.listen(env.PORT);

console.info(`pioneer api listening on :${env.PORT}`);
