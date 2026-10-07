import { z } from 'zod';

const DEFAULT_PORT = 3000;

const EnvSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(?:ql)?$/u }),
  PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
  /** Built web app to serve as a SPA; unset in dev (Angular dev server proxies /api). */
  WEB_DIST: z.string().min(1).optional(),
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
