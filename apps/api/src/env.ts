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

const EnvSchema = z
  .object({
    DATABASE_URL: z.url({ protocol: /^postgres(?:ql)?$/u }),
    PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
    /** Drizzle migrations folder, the one holding `meta/_journal.json`. */
    MIGRATIONS_DIR: z.string().min(1).default(REPO_MIGRATIONS_DIR),
    /** Apply migrations before serving. Off when a separate `migrate` step owns them (more than one instance). */
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
  })
  .superRefine((env, context) => {
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

/** Validate the environment once at startup; fail fast with every problem listed. */
export function readEnv(source: Readonly<Record<string, string | undefined>> = Bun.env): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
