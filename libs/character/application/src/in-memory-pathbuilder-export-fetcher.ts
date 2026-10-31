import type { PathbuilderExportUrl } from '@pioneer/interop/pathbuilder';

import { ExportFetchProblem, PathbuilderExportFetcher } from './pathbuilder-export-fetcher';
import type { FetchedExport } from './pathbuilder-export-fetcher';

const UNREACHABLE: FetchedExport = { ok: false, problem: ExportFetchProblem.Unavailable };

/** A fetcher that serves one answer for every URL (Pathbuilder unreachable unless given one) and keeps the URLs it was asked for, for tests. */
export class InMemoryPathbuilderExportFetcher extends PathbuilderExportFetcher {
  public readonly asked: PathbuilderExportUrl[] = [];
  readonly #answer: FetchedExport;

  public constructor(answer: FetchedExport = UNREACHABLE) {
    super();
    this.#answer = answer;
  }

  public override async fetch(url: PathbuilderExportUrl): Promise<FetchedExport> {
    this.asked.push(url);
    return this.#answer;
  }
}
