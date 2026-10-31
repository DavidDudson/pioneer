import { ExportFetchProblem, PathbuilderExportFetcher } from '@pioneer/character/application';
import type { FetchedExport } from '@pioneer/character/application';
import { exportUrlOf } from '@pioneer/interop/pathbuilder';
import type { PathbuilderExportUrl } from '@pioneer/interop/pathbuilder';

/** The largest export read: a level 20 character is a few hundred kilobytes, so this is a wide margin. */
const MAX_EXPORT_BYTES = 2_000_000;

const FETCH_TIMEOUT_MS = 8000;

/** How many redirects are followed, each one checked as a Pathbuilder export link again. */
const MAX_REDIRECTS = 3;

const MOVED_PERMANENTLY = 301;
const FOUND = 302;
const SEE_OTHER = 303;
const TEMPORARY_REDIRECT = 307;
const PERMANENT_REDIRECT = 308;
const REDIRECT_STATUSES: ReadonlySet<number> = new Set([
  MOVED_PERMANENTLY,
  FOUND,
  SEE_OTHER,
  TEMPORARY_REDIRECT,
  PERMANENT_REDIRECT,
]);

/** What the fetcher is held to. */
export interface ExportFetchLimits {
  readonly maxBytes: number;
  readonly timeoutMs: number;
}

const DEFAULT_LIMITS: ExportFetchLimits = { maxBytes: MAX_EXPORT_BYTES, timeoutMs: FETCH_TIMEOUT_MS };

/** `fetch`, as the fetcher needs it: injected so a test can answer without the network. */
type Fetch = (url: string, init: RequestInit) => Promise<Response>;

const platformFetch: Fetch = async (url, init): Promise<Response> => fetch(url, init);

/** `body`, failing once more than `maxBytes` have passed through. */
function capped(body: ReadableStream<Uint8Array>, maxBytes: number): ReadableStream<Uint8Array> {
  let size = 0;
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller): void {
        size += chunk.byteLength;
        if (size > maxBytes) {
          controller.error(new RangeError('The export is over the size limit'));
          return;
        }
        controller.enqueue(chunk);
      },
    }),
  );
}

/** The body of `response` as text; undefined once it passes `maxBytes`, declared or read. */
async function boundedText(response: Response, maxBytes: number): Promise<string | undefined> {
  const declared = Number(response.headers.get('content-length'));
  if (declared > maxBytes) {
    return undefined;
  }
  try {
    return await new Response(response.body === null ? undefined : capped(response.body, maxBytes)).text();
  } catch (error) {
    if (error instanceof RangeError) {
      return undefined;
    }
    throw error;
  }
}

/** Whether `error` is the abort a timeout signal raises. */
function isTimeout(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError');
}

function parsed(text: string): FetchedExport {
  try {
    return { ok: true, json: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, problem: ExportFetchProblem.NotJson };
  }
}

/** The link a redirect `response` from `from` points at, if it is another Pathbuilder export link. */
function redirectTarget(response: Response, from: string): PathbuilderExportUrl | undefined {
  const location = response.headers.get('location');
  const next = location === null ? undefined : exportUrlOf(new URL(location, from).href);
  return next?.ok === true ? next.url : undefined;
}

/**
 * Fetches a Pathbuilder export over HTTP. It is handed only a clean export URL, follows no redirect it has not checked
 * is a Pathbuilder export link too, and gives up past a timeout or a size, so no pasted link can make the server fetch
 * anything else.
 */
export class HttpPathbuilderExportFetcher extends PathbuilderExportFetcher {
  readonly #fetch: Fetch;
  readonly #limits: ExportFetchLimits;

  public constructor(fetchFn: Fetch = platformFetch, limits: ExportFetchLimits = DEFAULT_LIMITS) {
    super();
    this.#fetch = fetchFn;
    this.#limits = limits;
  }

  public override async fetch(url: PathbuilderExportUrl): Promise<FetchedExport> {
    try {
      const response = await this.#follow(url, AbortSignal.timeout(this.#limits.timeoutMs), MAX_REDIRECTS);
      if (response === undefined || !response.ok) {
        await response?.body?.cancel();
        return { ok: false, problem: ExportFetchProblem.Unavailable };
      }
      const text = await boundedText(response, this.#limits.maxBytes);
      return text === undefined ? { ok: false, problem: ExportFetchProblem.TooLarge } : parsed(text);
    } catch (error) {
      return { ok: false, problem: isTimeout(error) ? ExportFetchProblem.TimedOut : ExportFetchProblem.Unavailable };
    }
  }

  /** The response for `url`, following a redirect only to another Pathbuilder export link; undefined otherwise. */
  async #follow(url: string, signal: AbortSignal, redirectsLeft: number): Promise<Response | undefined> {
    const response = await this.#fetch(url, { redirect: 'manual', signal, headers: { accept: 'application/json' } });
    if (!REDIRECT_STATUSES.has(response.status)) {
      return response;
    }
    await response.body?.cancel();
    const next = redirectTarget(response, url);
    return next === undefined || redirectsLeft === 0 ? undefined : this.#follow(next, signal, redirectsLeft - 1);
  }
}
