import { describe, expect, test } from 'bun:test';

import { disallowedPaths, PoliteClient } from './polite-fetch';

const AGENT = 'pioneer-importer/0.1 (+https://github.com/DavidDudson/pioneer)';
const PAGE = new URL('https://2e.aonprd.com/Sources.aspx?ID=1');

interface Call {
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly at: number;
}

interface Harness {
  readonly client: PoliteClient;
  readonly calls: Call[];
}

/** A client over scripted responses; the clock moves only when the client sleeps. */
function harness(...responses: Response[]): Harness {
  const calls: Call[] = [];
  let clock = 0;
  const client = new PoliteClient({
    userAgent: AGENT,
    intervalMs: 2000,
    now: (): number => clock,
    sleep: async (ms): Promise<void> => {
      clock += ms;
    },
    fetch: (async (input: URL, init: RequestInit) => {
      calls.push({ url: String(input), headers: init.headers as Record<string, string>, at: clock });
      return responses.shift() ?? new Response('', { status: 500 });
    }) as unknown as typeof fetch,
  });
  return { client, calls };
}

function noRobots(): Response {
  return new Response('', { status: 404 });
}

describe('PoliteClient', () => {
  test('identifies itself and keeps its gap between requests', async () => {
    const { client, calls } = harness(noRobots(), new Response('<p>ok</p>', { headers: { ETag: '"a"' } }));
    expect(await client.get(PAGE, undefined)).toEqual({ kind: 'fresh', html: '<p>ok</p>', etag: '"a"' });
    expect(calls.map((call) => call.headers['User-Agent'])).toEqual([AGENT, AGENT]);
    expect(calls.map((call) => call.at)).toEqual([0, 2000]);
  });

  test('sends the stored ETag and treats 304 as unchanged', async () => {
    const { client, calls } = harness(noRobots(), new Response(undefined, { status: 304 }));
    expect(await client.get(PAGE, '"a"')).toEqual({ kind: 'unchanged' });
    expect(calls[1]?.headers['If-None-Match']).toBe('"a"');
  });

  test('stops on 429 and reports Retry-After, without retrying', async () => {
    const { client, calls } = harness(noRobots(), new Response('', { status: 429, headers: { 'Retry-After': '30' } }));
    expect(await client.get(PAGE, undefined)).toEqual({
      kind: 'refused',
      reason: `${PAGE.href} answered 429, Retry-After 30s`,
    });
    expect(calls).toHaveLength(2);
  });

  test('refuses a path robots.txt disallows, and fetches nothing else', async () => {
    const { client, calls } = harness(new Response('User-agent: *\nDisallow: /Sources'));
    expect(await client.get(PAGE, undefined)).toEqual({
      kind: 'refused',
      reason: 'robots.txt disallows /Sources.aspx?ID=1',
    });
    expect(calls).toHaveLength(1);
  });

  test('refuses when robots.txt cannot be read', async () => {
    const { client } = harness(new Response('', { status: 503 }));
    expect(await client.get(PAGE, undefined)).toEqual({ kind: 'refused', reason: 'robots.txt answered 503' });
  });

  test('reads robots.txt once per run', async () => {
    const { client, calls } = harness(noRobots(), new Response('a'), new Response('b'));
    await client.get(PAGE, undefined);
    await client.get(PAGE, undefined);
    expect(calls.map((call) => new URL(call.url).pathname)).toEqual(['/robots.txt', '/Sources.aspx', '/Sources.aspx']);
  });
});

describe('disallowedPaths', () => {
  test('collects the rules for * and for the robot, not for others', () => {
    const robots = [
      'User-agent: other',
      'Disallow: /a',
      '',
      'User-agent: *',
      'Disallow: /b # why',
      '',
      'User-agent: pioneer-importer',
      'Disallow: /c',
      'Disallow:',
    ].join('\n');
    expect(disallowedPaths(robots, AGENT)).toEqual(['/b', '/c']);
  });
});
