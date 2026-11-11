import { Elysia } from 'elysia';
import type { Context, HTTPHeaders } from 'elysia';

/** Below this a body costs less to send than to compress, and the encoding header would be most of it. */
export const MIN_COMPRESSED_BYTES = 1024;
const OK = 200;

/** Whether `accept-encoding` allows gzip: named with a non-zero weight, or covered by `*` and not refused by name. */
function acceptsGzip(header: string | null): boolean {
  if (header === null) {
    return false;
  }
  const weights = new Map<string, number>();
  for (const part of header.split(',')) {
    const [coding = '', ...parameters] = part.split(';').map((piece) => piece.trim().toLowerCase());
    const weight = parameters.find((parameter) => parameter.startsWith('q='));
    weights.set(coding, weight === undefined ? 1 : Number(weight.slice(2)));
  }
  return (weights.get('gzip') ?? weights.get('*') ?? 0) > 0;
}

function isJsonValue(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !(value instanceof Response);
}

function responseHeaders(set: HTTPHeaders): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(set)) {
    headers.set(name, String(value));
  }
  return headers;
}

/**
 * Gzipped bodies kept by path and strong `ETag`. An `ETag` names the body (the manifest's changes with a pack hash, a
 * bundle's is the hash in its file name), so the same path and `ETag` is the same bytes, and a re-seed asks for a new
 * key. The handler has already allowed the request by the time a body reaches here.
 */
const KEPT_BODIES = 1024;
const compressed = new Map<string, Uint8Array>();

function remember(key: string, bytes: Uint8Array): void {
  compressed.delete(key);
  compressed.set(key, bytes);
  for (const oldest of compressed.keys()) {
    if (compressed.size <= KEPT_BODIES) {
      break;
    }
    compressed.delete(oldest);
  }
}

/** Where a body is kept: only a GET answered with a strong `ETag` has a key. */
function keyOf(request: Request, etag: string | undefined): string | undefined {
  if (request.method !== 'GET' || etag === undefined || etag.startsWith('W/')) {
    return undefined;
  }
  return `${new URL(request.url).pathname} ${etag}`;
}

async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** The gzip of `value`, from the cache when `request` is a GET whose strong `ETag` was already compressed. */
async function gzippedBytes(
  request: Request,
  value: unknown,
  etag: string | undefined,
): Promise<Uint8Array | undefined> {
  const key = keyOf(request, etag);
  const kept = key === undefined ? undefined : compressed.get(key);
  if (key !== undefined && kept !== undefined) {
    remember(key, kept);
    return kept;
  }
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  if (bytes.byteLength < MIN_COMPRESSED_BYTES) {
    return undefined;
  }
  const zipped = await gzip(bytes);
  if (key !== undefined) {
    remember(key, zipped);
  }
  return zipped;
}

function gzipped(bytes: Uint8Array, set: Context['set']): Response {
  const headers = responseHeaders(set.headers);
  const etag = headers.get('etag');
  if (etag !== null && !etag.startsWith('W/')) {
    headers.set('etag', `W/${etag}`);
  }
  headers.set('content-encoding', 'gzip');
  headers.set('content-type', 'application/json');
  headers.set('vary', 'accept-encoding');
  return new Response(bytes, { headers, status: Number(set.status ?? OK) });
}

/**
 * Gzips JSON bodies for clients that accept it, so the 585 KB content manifest crosses the wire as ~116 KB. A body with a
 * strong `ETag` is gzipped once per path and `ETag`, not on every request. Other
 * responses (static files, 304s, errors, small bodies) pass through untouched. The content-encoding changes the bytes
 * but not the `ETag`'s validator, so a strong one is weakened, as RFC 9110 asks.
 */
export const compression = new Elysia({ name: 'compression' }).mapResponse(
  { as: 'global' },
  async ({ request, responseValue, set }) => {
    if (!acceptsGzip(request.headers.get('accept-encoding')) || !isJsonValue(responseValue)) {
      return undefined;
    }
    const { etag } = set.headers;
    const bytes = await gzippedBytes(request, responseValue, etag);
    return bytes === undefined ? undefined : gzipped(bytes, set);
  },
);
