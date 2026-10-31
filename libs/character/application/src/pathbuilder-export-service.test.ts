import { describe, expect, test } from 'bun:test';

import { PathbuilderExportUrl } from '@pioneer/interop/pathbuilder';
import { ValidationError } from '@pioneer/shared/kernel';

import { ExportFetchProblem, PathbuilderExportFetcher } from './pathbuilder-export-fetcher';
import type { FetchedExport } from './pathbuilder-export-fetcher';
import { PathbuilderExportService } from './pathbuilder-export-service';

const CLEAN = PathbuilderExportUrl.parse('https://pathbuilder2e.com/json.php?id=477708');

/** A fetcher that answers `answer` and keeps the URLs it was asked for. */
class FakeFetcher extends PathbuilderExportFetcher {
  public readonly asked: PathbuilderExportUrl[] = [];
  readonly #answer: FetchedExport;

  public constructor(answer: FetchedExport) {
    super();
    this.#answer = answer;
  }

  public override async fetch(url: PathbuilderExportUrl): Promise<FetchedExport> {
    this.asked.push(url);
    return this.#answer;
  }
}

/** The key of the one issue a refusal gives. */
async function refusedWith(service: PathbuilderExportService, pasted: string): Promise<string | undefined> {
  try {
    await service.fetchExport(pasted);
    return undefined;
  } catch (error) {
    return error instanceof ValidationError ? error.issues[0]?.message.key : undefined;
  }
}

describe('PathbuilderExportService', () => {
  test('fetches the clean URL for a link with tracking parameters, and hands back what it served', async () => {
    const fetcher = new FakeFetcher({ ok: true, json: { success: true } });
    const result = await new PathbuilderExportService(fetcher).fetchExport(`${CLEAN}&fbclid=IwAR0abc`);

    expect(result).toEqual({ export: { success: true } });
    expect(fetcher.asked).toEqual([CLEAN]);
  });

  test('never reaches the network for a link that is foreign, has no numeric id or is not a link', async () => {
    const fetcher = new FakeFetcher({ ok: true, json: {} });
    const service = new PathbuilderExportService(fetcher);

    expect(await refusedWith(service, 'https://evil.test/json.php?id=1')).toBe(
      'character.validation.exportUrl.foreignHost',
    );
    expect(await refusedWith(service, 'https://pathbuilder2e.com/json.php?id=abc')).toBe(
      'character.validation.exportUrl.badId',
    );
    expect(await refusedWith(service, '{"success":true}')).toBe('character.validation.exportUrl.notUrl');
    expect(fetcher.asked).toEqual([]);
  });

  test('names each way the fetch can fail', async () => {
    const keys = await Promise.all(
      Object.values(ExportFetchProblem).map(async (problem) =>
        refusedWith(new PathbuilderExportService(new FakeFetcher({ ok: false, problem })), CLEAN),
      ),
    );

    expect(keys).toEqual([
      'character.validation.exportUrl.timedOut',
      'character.validation.exportUrl.tooLarge',
      'character.validation.exportUrl.notJson',
      'character.validation.exportUrl.unavailable',
    ]);
  });
});
