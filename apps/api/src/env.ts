import { z } from 'zod';

const DEFAULT_PORT = 3000;

const EnvSchema = z
  .object({
    DATABASE_URL: z.url({ protocol: /^postgres(?:ql)?$/u }),
    PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
    /** Built web app to serve as a SPA; unset in dev (Angular dev server proxies /api). */
    WEB_DIST: z.string().min(1).optional(),
    /** Origin browsers use (the web app's in dev). OAuth callbacks are registered under it. */
    PUBLIC_ORIGIN: z.url({ protocol: /^https?$/u }).optional(),
    /** GitHub OAuth app; sign-in with GitHub is off unless both are set. */
    GITHUB_CLIENT_ID: z.string().min(1).optional(),
    GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
  })
  .superRefine((env, context) => {
    const github = [env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET].filter((value) => value !== undefined);
    if (github.length === 1) {
      context.addIssue({
        code: 'custom',
        path: ['GITHUB_CLIENT_SECRET'],
        message: 'Set both GitHub variables or neither',
      });
    }
    if (github.length > 0 && env.PUBLIC_ORIGIN === undefined) {
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
