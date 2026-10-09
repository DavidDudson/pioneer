import { z } from 'zod';

const DEFAULT_PORT = 3000;

const Credential = z.string().min(1).optional();

/**
 * The repo's migrations folder. Inside a `--compile` binary this resolves into Bun's virtual FS, which holds no
 * migrations, so a binary sets MIGRATIONS_DIR.
 */
const REPO_MIGRATIONS_DIR = `${import.meta.dir}/../migrations`;

/** Each sign-in provider's OAuth app: both variables or neither. */
const PROVIDER_CREDENTIALS = [
  ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
  ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET'],
  ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
] as const;

/** What `pioneer-api migrate` needs. Nothing server-only, so a migrate job carries no OAuth or web settings. */
const MigrateEnvSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(?:ql)?$/u }),
  /** Drizzle migrations folder, the one holding `meta/_journal.json`. */
  MIGRATIONS_DIR: z.string().min(1).default(REPO_MIGRATIONS_DIR),
});
export type MigrateEnv = z.infer<typeof MigrateEnvSchema>;

const EnvSchema = MigrateEnvSchema.extend({
  PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
  /**
   * Apply migrations before serving. Off when a separate `migrate` step owns them. Accepts true/false, 1/0,
   * yes/no, on/off, y/n and enabled/disabled, in any case.
   */
  MIGRATE_ON_START: z.stringbool().default(true),
  /** Built web app to serve as a SPA; unset in dev (Angular dev server proxies /api). */
  WEB_DIST: z.string().min(1).optional(),
  /** Origin browsers use (the web app's in dev). OAuth callbacks are registered under it. */
  PUBLIC_ORIGIN: z.url({ protocol: /^https?$/u }).optional(),
  /** Sign-in providers; each is off unless both its variables are set. */
  GITHUB_CLIENT_ID: Credential,
  GITHUB_CLIENT_SECRET: Credential,
  DISCORD_CLIENT_ID: Credential,
  DISCORD_CLIENT_SECRET: Credential,
  GOOGLE_CLIENT_ID: Credential,
  GOOGLE_CLIENT_SECRET: Credential,
}).superRefine((env, context) => {
  let anyProvider = false;
  for (const [id, secret] of PROVIDER_CREDENTIALS) {
    const hasId = env[id] !== undefined;
    const hasSecret = env[secret] !== undefined;
    if (hasId !== hasSecret) {
      context.addIssue({
        code: 'custom',
        path: [hasId ? secret : id],
        message: `Set both ${id} and ${secret}, or neither`,
      });
    }
    anyProvider ||= hasId && hasSecret;
  }
  if (anyProvider && env.PUBLIC_ORIGIN === undefined) {
    context.addIssue({ code: 'custom', path: ['PUBLIC_ORIGIN'], message: 'Required when a sign-in provider is set' });
  }
});
export type Env = z.infer<typeof EnvSchema>;

type EnvSource = Readonly<Record<string, string | undefined>>;

function parseEnv<Parsed>(schema: z.ZodType<Parsed>, source: EnvSource): Parsed {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/** Validate the server's environment once at startup; fail fast with every problem listed. */
export function readEnv(source: EnvSource = Bun.env): Env {
  return parseEnv(EnvSchema, source);
}

/** Validate only what `pioneer-api migrate` needs. */
export function readMigrateEnv(source: EnvSource = Bun.env): MigrateEnv {
  return parseEnv(MigrateEnvSchema, source);
}
