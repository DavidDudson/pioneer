import { describe, expect, test } from 'bun:test';

import { ExportFetchProblem } from '@pioneer/character/application';
import type { FetchedExport } from '@pioneer/character/application';
import { PathbuilderExportUrl } from '@pioneer/interop/pathbuilder';

import { HttpPathbuilderExportFetcher } from './http-pathbuilder-export-fetcher';

const CLEAN = PathbuilderExportUrl.parse('https://pathbuilder2e.com/json.php?id=477708');
const LIMITS = { maxBytes: 100, timeoutMs: 50 };

type Answer = (url: string) => Response | Promise<Response>;

/** A fetcher answering with `answer`, and the URLs it was asked for. */
interface FetcherUnderTest {
  readonly fetcher: HttpPathbuilderExportFetcher;
  readonly asked: string[];
}

function fetcherOf(answer: Answer): FetcherUnderTest {
  const asked: string[] = [];
  const fetcher = new HttpPathbuilderExportFetcher(async (url, init) => {
    asked.push(url);
    expect(init.redirect).toBe('manual');
    return answer(url);
  }, LIMITS);
  return { fetcher, asked };
}

/** The next of the queued answers; the test is wrong if it asks for more than it queued. */
function nextOf(answers: Response[]): Response {
  const [next] = answers.splice(0, 1);
  if (next === undefined) {
    throw new Error('No answer queued');
  }
  return next;
}

function redirect(location: string): Response {
  return new Response(undefined, { status: 302, headers: { location } });
}

async function problemOf(fetched: Promise<FetchedExport>): Promise<string | undefined> {
  const result = await fetched;
  return result.ok ? undefined : result.problem;
}

describe('HttpPathbuilderExportFetcher', () => {
  test('reads the JSON Pathbuilder serves', async () => {
    const { fetcher, asked } = fetcherOf(() => Response.json({ success: true }));

    expect(await fetcher.fetch(CLEAN)).toEqual({ ok: true, json: { success: true } });
    expect(asked).toEqual([CLEAN]);
  });

  test('follows a redirect to another Pathbuilder export link', async () => {
    const answers = [redirect('https://www.pathbuilder2e.com/json.php?id=477708&utm=x'), Response.json({ ok: 1 })];
    const { fetcher, asked } = fetcherOf(() => nextOf(answers));

    expect(await fetcher.fetch(CLEAN)).toEqual({ ok: true, json: { ok: 1 } });
    expect(asked).toEqual([CLEAN, CLEAN]);
  });

  test('refuses a redirect off Pathbuilder’s host, and never requests it', async () => {
    const { fetcher, asked } = fetcherOf(() => redirect('http://169.254.169.254/latest/meta-data'));

    expect(await problemOf(fetcher.fetch(CLEAN))).toBe(ExportFetchProblem.Unavailable);
    expect(asked).toEqual([CLEAN]);
  });

  test('refuses a redirect to another path on Pathbuilder’s host', async () => {
    const { fetcher } = fetcherOf(() => redirect('/admin'));

    expect(await problemOf(fetcher.fetch(CLEAN))).toBe(ExportFetchProblem.Unavailable);
  });

  test('stops following redirects that loop', async () => {
    const { fetcher, asked } = fetcherOf(() => redirect(CLEAN));

    expect(await problemOf(fetcher.fetch(CLEAN))).toBe(ExportFetchProblem.Unavailable);
    expect(asked).toHaveLength(4);
  });

  test('gives a typed problem for a non-JSON answer, an error status and a network failure', async () => {
    const text = fetcherOf(() => new Response('<html>nope</html>'));
    const status = fetcherOf(() => new Response('{}', { status: 500 }));
    const network = fetcherOf(() => {
      throw new TypeError('fetch failed');
    });

    expect(await problemOf(text.fetcher.fetch(CLEAN))).toBe(ExportFetchProblem.NotJson);
    expect(await problemOf(status.fetcher.fetch(CLEAN))).toBe(ExportFetchProblem.Unavailable);
    expect(await problemOf(network.fetcher.fetch(CLEAN))).toBe(ExportFetchProblem.Unavailable);
  });

  test('refuses a body over the size limit, declared or streamed', async () => {
    const declared = fetcherOf(() => new Response('{}', { headers: { 'content-length': '5000' } }));
    const streamed = fetcherOf(() => Response.json({ big: 'x'.repeat(500) }));

    expect(await problemOf(declared.fetcher.fetch(CLEAN))).toBe(ExportFetchProblem.TooLarge);
    expect(await problemOf(streamed.fetcher.fetch(CLEAN))).toBe(ExportFetchProblem.TooLarge);
  });

  test('gives up when Pathbuilder does not answer in time', async () => {
    // The fetch is handed the timeout signal and honours it, as the platform fetch does.
    const silent = new HttpPathbuilderExportFetcher(
      async (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(new DOMException('Timed out', 'TimeoutError'));
          });
        }),
      LIMITS,
    );

    expect(await problemOf(silent.fetch(CLEAN))).toBe(ExportFetchProblem.TimedOut);
  });
});
