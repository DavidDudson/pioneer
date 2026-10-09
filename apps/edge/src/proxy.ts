import type { AwsClient } from 'aws4fetch';

/** Bindings the Worker gets from OpenTofu (`infra/cloudflare.tf`). */
export interface EdgeEnv {
  /** The API's Lambda Function URL, `https://<id>.lambda-url.ap-southeast-2.on.aws/`. */
  readonly FUNCTION_URL: string;
  /** The `pioneer-edge` IAM user, allowed to invoke that Function URL and nothing else (ADR-0015). */
  readonly AWS_ACCESS_KEY_ID: string;
  readonly AWS_SECRET_ACCESS_KEY: string;
}

/** The part of the Workers Cache API the proxy uses (`caches.default`). */
export interface EdgeCache {
  readonly match: (request: Request) => Promise<Response | undefined>;
  readonly put: (request: Request, response: Response) => Promise<void>;
}

/** The part of the Workers execution context the proxy uses. */
export interface EdgeContext {
  readonly waitUntil: (promise: Promise<unknown>) => void;
}

export type Upstream = (request: Request) => Promise<Response>;

const OK = 200;
const MOVED_PERMANENTLY = 301;

/**
 * Request headers the proxy owns. A client's `authorization` or `x-amz-*` would collide with the signature, and the
 * forwarding headers are rebuilt from what Cloudflare saw. `cf-*` headers are dropped by prefix.
 */
const OWNED_REQUEST_HEADERS = new Set([
  'authorization',
  'host',
  'forwarded',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-real-ip',
]);

/** Headers copied from the signed request: the signature and the values it covers. */
function isSignatureHeader(name: string): boolean {
  return name === 'authorization' || name.startsWith('x-amz-');
}

function isOwnedHeader(name: string): boolean {
  return OWNED_REQUEST_HEADERS.has(name) || name.startsWith('x-amz-') || name.startsWith('cf-');
}

/** The Function URL with the public request's path and query. */
export function upstreamUrl(publicUrl: URL, functionUrl: URL): URL {
  return new URL(`${publicUrl.pathname}${publicUrl.search}`, functionUrl);
}

/** The client's headers minus the ones the proxy owns, plus forwarding headers for the public origin. */
export function forwardedHeaders(incoming: Headers, publicUrl: URL): Headers {
  const headers = new Headers();
  for (const [name, value] of incoming) {
    if (!isOwnedHeader(name)) {
      headers.set(name, value);
    }
  }
  headers.set('x-forwarded-host', publicUrl.host);
  headers.set('x-forwarded-proto', 'https');
  const clientIp = incoming.get('cf-connecting-ip');
  if (clientIp !== null) {
    headers.set('x-forwarded-for', clientIp);
  }
  return headers;
}

/**
 * The public request, addressed to the Function URL and signed with SigV4. Only `host` and the `x-amz-*` headers
 * are signed: the runtime may still adjust other headers (`accept-encoding`) on the way out, which would break a
 * signature over them. The body is read once, since the signature covers its hash.
 */
export async function signedUpstreamRequest(request: Request, functionUrl: URL, signer: AwsClient): Promise<Request> {
  const publicUrl = new URL(request.url);
  const url = upstreamUrl(publicUrl, functionUrl);
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const init: RequestInit = hasBody ? { method: request.method, body: await request.arrayBuffer() } : {};
  const signed = await signer.sign(url.toString(), init);
  const headers = forwardedHeaders(request.headers, publicUrl);
  for (const [name, value] of signed.headers) {
    if (isSignatureHeader(name)) {
      headers.set(name, value);
    }
  }
  return new Request(url.toString(), { ...init, headers, redirect: 'manual' });
}

function cacheDirectives(response: Response): ReadonlySet<string> {
  const header = response.headers.get('cache-control') ?? '';
  return new Set(
    header
      .split(',')
      .map((directive) => directive.trim().toLowerCase())
      .filter((directive) => directive !== ''),
  );
}

/**
 * Whether the edge may keep a response: a successful GET marked `public` with a lifetime, and nothing that ties it
 * to one user. The API's hashed assets qualify (`public, max-age=31536000, immutable`); `index.html` (`no-cache`)
 * and API responses do not, so every deploy is seen at once.
 */
export function isCacheable(request: Request, response: Response): boolean {
  if (request.method !== 'GET' || response.status !== OK || response.headers.has('set-cookie')) {
    return false;
  }
  const directives = cacheDirectives(response);
  const restricted = ['private', 'no-store', 'no-cache'].some((directive) => directives.has(directive));
  const hasLifetime = [...directives].some((directive) => /^(?:max-age|s-maxage)=[1-9]\d*$/u.test(directive));
  return directives.has('public') && hasLifetime && !restricted;
}

/** Plain HTTP goes to HTTPS before anything reaches the API, so session cookies never travel unencrypted. */
function httpsRedirect(publicUrl: URL): Response | undefined {
  if (publicUrl.protocol !== 'http:') {
    return undefined;
  }
  const target = new URL(publicUrl);
  target.protocol = 'https:';
  return Response.redirect(target.toString(), MOVED_PERMANENTLY);
}

export interface ProxyDependencies {
  readonly functionUrl: URL;
  readonly signer: AwsClient;
  readonly cache: EdgeCache;
  readonly context: EdgeContext;
  readonly upstream: Upstream;
}

/** Two responses with the same status and headers over one body: one for the client, one for the cache. */
function split(response: Response): readonly [Response, Response] {
  if (response.body === null) {
    return [response, new Response(undefined, response)];
  }
  const [forClient, forCache] = response.body.tee();
  return [new Response(forClient, response), new Response(forCache, response)];
}

/** Ask the API, keeping a copy at the edge when the response allows it. */
async function fetchUpstream(request: Request, dependencies: ProxyDependencies): Promise<Response> {
  const upstreamRequest = await signedUpstreamRequest(request, dependencies.functionUrl, dependencies.signer);
  const response = await dependencies.upstream(upstreamRequest);
  if (!isCacheable(request, response)) {
    return response;
  }
  const [forClient, forCache] = split(response);
  dependencies.context.waitUntil(dependencies.cache.put(request, forCache));
  return forClient;
}

/** Serve one public request: from the edge cache when it holds it, otherwise from the API through a signed request. */
export async function proxy(request: Request, dependencies: ProxyDependencies): Promise<Response> {
  const redirect = httpsRedirect(new URL(request.url));
  if (redirect !== undefined) {
    return redirect;
  }
  const isGet = request.method === 'GET';
  const cached = isGet ? await dependencies.cache.match(request) : undefined;
  return cached ?? fetchUpstream(request, dependencies);
}
