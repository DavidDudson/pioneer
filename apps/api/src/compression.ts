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

function gzipped(bytes: Uint8Array, set: Context['set']): Response {
  const headers = responseHeaders(set.headers);
  const etag = headers.get('etag');
  if (etag !== null && !etag.startsWith('W/')) {
    headers.set('etag', `W/${etag}`);
  }
  headers.set('content-encoding', 'gzip');
  headers.set('content-type', 'application/json');
  headers.set('vary', 'accept-encoding');
  const body = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(body, { headers, status: Number(set.status ?? OK) });
}

/**
 * Gzips JSON bodies for clients that accept it, so the 585 KB content manifest crosses the wire as ~116 KB. Other
 * responses (static files, 304s, errors, small bodies) pass through untouched. The content-encoding changes the bytes
 * but not the `ETag`'s validator, so a strong one is weakened, as RFC 9110 asks.
 */
export const compression = new Elysia({ name: 'compression' }).mapResponse(
  { as: 'global' },
  ({ request, responseValue, set }) => {
    if (!acceptsGzip(request.headers.get('accept-encoding')) || !isJsonValue(responseValue)) {
      return undefined;
    }
    const bytes = new TextEncoder().encode(JSON.stringify(responseValue));
    return bytes.byteLength < MIN_COMPRESSED_BYTES ? undefined : gzipped(bytes, set);
  },
);
