import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/** The only hosts an export is fetched from: Pathbuilder's own. */
const EXPORT_HOSTS: ReadonlySet<string> = new Set(['pathbuilder2e.com', 'www.pathbuilder2e.com']);

/** Where a character's export is served, less everything but its id. */
const EXPORT_ORIGIN = 'https://pathbuilder2e.com/json.php';

const EXPORT_PATH = '/json.php';

const ID = /^\d{1,12}$/u;

/** A character's export URL on Pathbuilder, with the id and nothing else: `https://pathbuilder2e.com/json.php?id=477708`. */
export const PathbuilderExportUrl = z.string().brand<'PathbuilderExportUrl'>();
export type PathbuilderExportUrl = z.infer<typeof PathbuilderExportUrl>;

/** Why a pasted URL is not one an export can be fetched from. */
export const ExportUrlProblem = {
  /** Not a URL at all. */
  NotUrl: 'not-url',
  /** A URL on another host, or on another path or port than Pathbuilder's export, or with credentials. */
  ForeignHost: 'foreign-host',
  /** No `id`, or one that is not a number. */
  BadId: 'bad-id',
} as const;
export type ExportUrlProblem = ValueOf<typeof ExportUrlProblem>;

export type ExportUrlResult =
  | { readonly ok: true; readonly url: PathbuilderExportUrl }
  | { readonly ok: false; readonly problem: ExportUrlProblem };

const ALLOWED_PROTOCOLS: ReadonlySet<string> = new Set(['https:', 'http:']);

/** Whether `text` reads as a URL, for telling a pasted link from pasted JSON. */
export function looksLikeUrl(text: string): boolean {
  return /^https?:\/\//iu.test(text.trim());
}

/**
 * The URL an export is fetched from, given what the user pasted. Only the numeric `id` is kept: every other parameter
 * (`fbclid`, a fragment) is dropped, and any other host or path is refused, so the server never fetches a URL the
 * user chose. An `http:` link is upgraded to `https:`; if `id` repeats, the first one is used.
 */
export function exportUrlOf(text: string): ExportUrlResult {
  const parsed = URL.parse(text.trim());
  if (parsed === null || !ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return { ok: false, problem: ExportUrlProblem.NotUrl };
  }
  const hasCredentials = parsed.username !== '' || parsed.password !== '';
  if (!EXPORT_HOSTS.has(parsed.hostname) || parsed.pathname !== EXPORT_PATH || parsed.port !== '' || hasCredentials) {
    return { ok: false, problem: ExportUrlProblem.ForeignHost };
  }
  const id = parsed.searchParams.get('id');
  if (id === null || !ID.test(id)) {
    return { ok: false, problem: ExportUrlProblem.BadId };
  }
  return { ok: true, url: PathbuilderExportUrl.parse(`${EXPORT_ORIGIN}?id=${id}`) };
}
