import * as z from 'zod';

const RETURN_PATH_MAX_LENGTH = 2048;

/**
 * Where to send the browser after sign-in: a same-origin absolute path. Rejects anything a
 * browser could read as another origin (`//evil.example`, `/\evil.example`, `https://…`) and
 * anything outside printable ASCII, so sign-in can't become an open redirect.
 */
export const ReturnPath = z
  .string()
  .max(RETURN_PATH_MAX_LENGTH)
  .regex(/^\/(?!\/)[!-[\]-~]*$/u)
  .brand<'ReturnPath'>();
export type ReturnPath = z.infer<typeof ReturnPath>;

export const HOME_PATH: ReturnPath = ReturnPath.parse('/');

/** The requested path when it is safe, home otherwise. */
export function returnPathOr(requested: unknown): ReturnPath {
  const parsed = ReturnPath.safeParse(requested);
  return parsed.success ? parsed.data : HOME_PATH;
}
