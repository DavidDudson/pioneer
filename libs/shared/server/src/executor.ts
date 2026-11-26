import type { BunSQLQueryResultHKT } from 'drizzle-orm/bun-sql';
import type { PgDatabase } from 'drizzle-orm/pg-core';

/** A database or a transaction. */
export type Executor = PgDatabase<BunSQLQueryResultHKT>;
