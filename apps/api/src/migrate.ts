import { connect, runMigrations } from './database';
import { readEnv } from './env';

await runMigrations(connect(readEnv().DATABASE_URL));
console.info('migrations applied');
