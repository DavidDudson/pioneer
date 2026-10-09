import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { testDatabaseUrl } from '@pioneer/shared/server/testing';
import { $ } from 'bun';
import { z } from 'zod';

/**
 * The compiled `pioneer-api` binary, run from a temp folder with its migrations copied beside it, as a container
 * runs it. Uses the disposable TEST_DATABASE_URL (see AGENTS.md).
 */
const adminUrl = testDatabaseUrl();
const SOURCE_MIGRATIONS = new URL('../migrations', import.meta.url).pathname;
const MAIN = new URL('main.ts', import.meta.url).pathname;
const COMPILE_TIMEOUT = 60_000;
const RUN_TIMEOUT = 30_000;
/** Kills a spawned binary that hangs, so a failing test never leaks a server. */
const CHILD_TIMEOUT = 20_000;
const FETCH_TIMEOUT = 5000;
const CONCURRENT_MIGRATIONS = 3;
const LISTENING = /listening on :(?<port>\d+)/u;

const JournalEntry = z.object({ tag: z.string() });
const Journal = z.object({ entries: z.array(JournalEntry) });
const CountRow = z.object({ count: z.coerce.number() });
const CountRows = z.array(CountRow);
const ExistsRow = z.object({ exists: z.boolean() });
const ExistsRows = z.array(ExistsRow);
const Health = z.object({ status: z.literal('ok') });
type Health = z.infer<typeof Health>;

interface Workspace {
  readonly folder: string;
  readonly binary: string;
  readonly migrations: string;
}

interface Exit {
  readonly code: number;
  readonly output: string;
}

/** A port nothing listens on right now, so parallel suites do not collide. */
async function freePort(): Promise<number> {
  const probe = Bun.serve({ port: 0, fetch: (): Response => new Response() });
  const { port } = probe;
  await probe.stop(true);
  return port ?? 0;
}

/** Rows in Drizzle's migrations journal table; 0 when it does not exist yet. */
async function appliedMigrations(databaseUrl: string): Promise<number> {
  const db = new Bun.SQL(databaseUrl);
  const tables = ExistsRows.parse(await db`select to_regclass('drizzle.__drizzle_migrations') is not null as exists`);
  const hasTable = tables[0]?.exists ?? false;
  const rows = hasTable ? CountRows.parse(await db`select count(*) as count from drizzle.__drizzle_migrations`) : [];
  await db.close();
  return rows[0]?.count ?? 0;
}

describe.skipIf(adminUrl === undefined)('compiled api binary (postgres)', () => {
  const admin = new Bun.SQL(adminUrl ?? '');
  const databases: string[] = [];
  let workspace: Workspace = { folder: '', binary: '', migrations: '' };
  let migrationCount = 0;

  async function emptyDatabase(): Promise<string> {
    const name = `pioneer_test_${crypto.randomUUID().replaceAll('-', '')}`;
    await admin.unsafe(`create database ${name}`);
    databases.push(name);
    const url = new URL(adminUrl ?? '');
    url.pathname = `/${name}`;
    return url.toString();
  }

  async function environment(
    databaseUrl: string,
    overrides: Readonly<Record<string, string>>,
  ): Promise<Record<string, string>> {
    const port = await freePort();
    return {
      PATH: Bun.env['PATH'] ?? '',
      DATABASE_URL: databaseUrl,
      MIGRATIONS_DIR: workspace.migrations,
      PORT: String(port),
      ...overrides,
    };
  }

  async function run(args: readonly string[], env: Record<string, string>): Promise<Exit> {
    const child = Bun.spawn([workspace.binary, ...args], {
      cwd: workspace.folder,
      env,
      timeout: CHILD_TIMEOUT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    return { code, output: `${stdout}${stderr}` };
  }

  /** Start the server, wait until it listens, check health, then stop it. */
  async function serveHealth(env: Record<string, string>): Promise<Health> {
    const child = Bun.spawn([workspace.binary], {
      cwd: workspace.folder,
      env,
      timeout: CHILD_TIMEOUT,
      stdout: 'pipe',
      stderr: 'inherit',
    });
    try {
      let output = '';
      const decoder = new TextDecoder();
      for await (const chunk of child.stdout) {
        output += decoder.decode(chunk);
        const port = LISTENING.exec(output)?.groups?.['port'];
        if (port !== undefined) {
          const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
            signal: AbortSignal.timeout(FETCH_TIMEOUT),
          });
          const body: unknown = await response.json();
          return Health.parse(body);
        }
      }
      throw new Error(`pioneer-api exited before listening: ${output}`);
    } finally {
      child.kill();
      await child.exited;
    }
  }

  beforeAll(async () => {
    const folder = `${Bun.env['TMPDIR'] ?? '/tmp'}/pioneer-api-${crypto.randomUUID()}`;
    await $`mkdir -p ${folder}`;
    workspace = { folder, binary: `${folder}/pioneer-api`, migrations: `${folder}/migrations` };
    await $`cp -R ${SOURCE_MIGRATIONS} ${workspace.migrations}`;
    const journal: unknown = await Bun.file(`${workspace.migrations}/meta/_journal.json`).json();
    migrationCount = Journal.parse(journal).entries.length;
    await $`${process.execPath} build ${MAIN} --compile --outfile ${workspace.binary}`.quiet();
  }, COMPILE_TIMEOUT);

  afterAll(async () => {
    await Promise.all(
      databases.map(async (name): Promise<void> => {
        await admin.unsafe(`drop database if exists ${name} with (force)`);
      }),
    );
    await admin.close();
    await $`rm -rf ${workspace.folder}`;
  });

  test(
    'migrates on start from MIGRATIONS_DIR outside the source tree, then serves',
    async () => {
      const databaseUrl = await emptyDatabase();
      const env = await environment(databaseUrl, {});
      expect(await serveHealth(env)).toStrictEqual({ status: 'ok' });
      expect(await appliedMigrations(databaseUrl)).toBe(migrationCount);
    },
    RUN_TIMEOUT,
  );

  test(
    'MIGRATE_ON_START=false serves without migrating, and `migrate` applies them ignoring server settings',
    async () => {
      const databaseUrl = await emptyDatabase();
      const env = await environment(databaseUrl, {
        MIGRATE_ON_START: 'false',
      });
      expect(await serveHealth(env)).toStrictEqual({ status: 'ok' });
      expect(await appliedMigrations(databaseUrl)).toBe(0);
      // A provider id without its secret stops the server, never a migrate job.
      expect(await run(['migrate'], { ...env, GITHUB_CLIENT_ID: 'id' })).toStrictEqual({
        code: 0,
        output: 'migrations applied\n',
      });
      expect(await appliedMigrations(databaseUrl)).toBe(migrationCount);
    },
    RUN_TIMEOUT,
  );

  test(
    'fails without MIGRATIONS_DIR: the default resolves into the binary, which holds no migrations',
    async () => {
      const databaseUrl = await emptyDatabase();
      const { MIGRATIONS_DIR: _unset, ...env } = await environment(databaseUrl, {});
      const result = await run(['migrate'], env);
      expect(result.code).not.toBe(0);
      expect(result.output).toContain('No migrations in MIGRATIONS_DIR=');
      expect(result.output).toContain('meta/_journal.json is missing');
      expect(await appliedMigrations(databaseUrl)).toBe(0);
    },
    RUN_TIMEOUT,
  );

  test(
    'instances migrating at once serialise on the lock and all succeed',
    async () => {
      const databaseUrl = await emptyDatabase();
      const env = await environment(databaseUrl, {});
      const runs = Array.from({ length: CONCURRENT_MIGRATIONS }, async (): Promise<Exit> => run(['migrate'], env));
      const results = await Promise.all(runs);
      expect(results.map(({ code }) => code)).toStrictEqual([0, 0, 0]);
      expect(await appliedMigrations(databaseUrl)).toBe(migrationCount);
    },
    RUN_TIMEOUT,
  );

  test(
    'rejects an unknown command before touching the database',
    async () => {
      const env = await environment('postgres://127.0.0.1:1/unreachable', {});
      const result = await run(['migrat'], env);
      expect(result.code).not.toBe(0);
      expect(result.output).toContain('Unknown command "migrat"');
    },
    RUN_TIMEOUT,
  );
});
