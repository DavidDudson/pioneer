import { describe, expect, test } from 'bun:test';

import { AwsClient } from 'aws4fetch';

import { forwardedHeaders, isCacheable, proxy, signedUpstreamRequest, upstreamUrl } from './proxy';
import type { EdgeCache, EdgeContext, ProxyDependencies, Upstream } from './proxy';

const FUNCTION_URL = new URL('https://abc123.lambda-url.ap-southeast-2.on.aws/');
const signer = new AwsClient({
  accessKeyId: 'AKIDEXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
  service: 'lambda',
  retries: 0,
});

const IMMUTABLE = 'public, max-age=31536000, immutable';

class MemoryCache implements EdgeCache {
  private readonly bodies = new Map<string, string>();

  public readonly match = async (request: Request): Promise<Response | undefined> => {
    const body = this.bodies.get(request.url);
    return body === undefined ? undefined : new Response(body);
  };

  public readonly put = async (request: Request, response: Response): Promise<void> => {
    this.bodies.set(request.url, await response.text());
  };
}

class Context implements EdgeContext {
  public readonly pending: Promise<unknown>[] = [];

  public readonly waitUntil = (promise: Promise<unknown>): void => {
    this.pending.push(promise);
  };
}

interface Harness {
  readonly dependencies: ProxyDependencies;
  readonly cache: MemoryCache;
  readonly context: Context;
  readonly sent: Request[];
}

function harness(respond: (request: Request) => Response): Harness {
  const cache = new MemoryCache();
  const context = new Context();
  const sent: Request[] = [];
  const upstream: Upstream = async (request: Request): Promise<Response> => {
    sent.push(request);
    return respond(request);
  };
  return { dependencies: { functionUrl: FUNCTION_URL, signer, cache, context, upstream }, cache, context, sent };
}

function withCacheControl(
  cacheControl: string,
  status = 200,
  headers: Readonly<Record<string, string>> = {},
): Response {
  return new Response('body', { status, headers: { 'cache-control': cacheControl, ...headers } });
}

describe('upstreamUrl', () => {
  test('keeps the path and query, swaps the origin', () => {
    const url = upstreamUrl(new URL('https://pioneer.example/api/characters?page=2'), FUNCTION_URL);
    expect(url.toString()).toBe('https://abc123.lambda-url.ap-southeast-2.on.aws/api/characters?page=2');
  });
});

describe('forwardedHeaders', () => {
  test('drops headers the proxy owns and forwards the client address and public host', () => {
    const headers = forwardedHeaders(
      new Headers({
        cookie: 'session=1',
        authorization: 'Bearer forged',
        'x-amz-date': '20000101T000000Z',
        'x-forwarded-for': '10.0.0.1',
        'cf-connecting-ip': '203.0.113.7',
        'cf-ray': 'abc',
      }),
      new URL('https://pioneer.example/'),
    );
    expect(Object.fromEntries(headers)).toEqual({
      cookie: 'session=1',
      'x-forwarded-host': 'pioneer.example',
      'x-forwarded-proto': 'https',
      'x-forwarded-for': '203.0.113.7',
    });
  });
});

describe('signedUpstreamRequest', () => {
  test('signs only host and x-amz-* headers for the Function URL region', async () => {
    const request = new Request('https://pioneer.example/api/characters', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'session=1', 'accept-encoding': 'gzip' },
      body: '{"name":"Ezren"}',
    });
    const signed = await signedUpstreamRequest(request, FUNCTION_URL, signer);
    const authorization = String(signed.headers.get('authorization'));
    expect(signed.url).toBe('https://abc123.lambda-url.ap-southeast-2.on.aws/api/characters');
    expect(authorization).toContain('/ap-southeast-2/lambda/aws4_request');
    expect(authorization).toMatch(/SignedHeaders=host;x-amz-date,/u);
    expect(signed.headers.get('cookie')).toBe('session=1');
    expect(await signed.text()).toBe('{"name":"Ezren"}');
  });

  test('a GET carries no body', async () => {
    const signed = await signedUpstreamRequest(new Request('https://pioneer.example/'), FUNCTION_URL, signer);
    expect(signed.body).toBeNull();
    expect(signed.headers.get('x-amz-date')).not.toBeNull();
  });
});

describe('isCacheable', () => {
  const get = new Request('https://pioneer.example/chunk-BgoYYQMx.js');

  test('keeps public responses with a lifetime', () => {
    expect(isCacheable(get, withCacheControl(IMMUTABLE))).toBe(true);
    expect(isCacheable(get, withCacheControl('public, s-maxage=60'))).toBe(true);
  });

  test.each(['no-cache', 'public, max-age=0', 'public', 'public, max-age=60, private', 'max-age=60', ''])(
    'skips %p',
    (cacheControl) => {
      expect(isCacheable(get, withCacheControl(cacheControl))).toBe(false);
    },
  );

  test('skips responses that set a cookie, fail or answer anything but GET', () => {
    expect(isCacheable(get, withCacheControl(IMMUTABLE, 200, { 'set-cookie': 'a=b' }))).toBe(false);
    expect(isCacheable(get, withCacheControl(IMMUTABLE, 404))).toBe(false);
    const head = new Request(get.url, { method: 'HEAD' });
    expect(isCacheable(head, withCacheControl(IMMUTABLE))).toBe(false);
  });
});

describe('proxy', () => {
  test('redirects plain HTTP to HTTPS without calling the API', async () => {
    const { dependencies, sent } = harness(() => new Response('unreachable'));
    const response = await proxy(new Request('http://pioneer.example/characters?x=1'), dependencies);
    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe('https://pioneer.example/characters?x=1');
    expect(sent).toHaveLength(0);
  });

  test('serves a hashed asset from the edge cache after the first request', async () => {
    const { dependencies, context, sent } = harness(() => withCacheControl(IMMUTABLE));
    const url = 'https://pioneer.example/chunk-BgoYYQMx.js';
    const first = await proxy(new Request(url), dependencies);
    expect(await first.text()).toBe('body');
    await Promise.all(context.pending);
    const second = await proxy(new Request(url), dependencies);
    expect(await second.text()).toBe('body');
    expect(sent).toHaveLength(1);
  });

  test('always asks the API for index.html', async () => {
    const { dependencies, context, sent } = harness(() => withCacheControl('no-cache'));
    await proxy(new Request('https://pioneer.example/'), dependencies);
    await Promise.all(context.pending);
    await proxy(new Request('https://pioneer.example/'), dependencies);
    expect(sent).toHaveLength(2);
  });

  test('passes API responses through unchanged', async () => {
    const { dependencies, sent } = harness(() => new Response('{}', { status: 201, headers: { 'set-cookie': 's=1' } }));
    const response = await proxy(
      new Request('https://pioneer.example/api/characters', { method: 'POST' }),
      dependencies,
    );
    expect(response.status).toBe(201);
    expect(response.headers.get('set-cookie')).toBe('s=1');
    expect(sent[0]?.headers.get('authorization')).toStartWith('AWS4-HMAC-SHA256 ');
  });
});
