import { exportUrlOf, ExportUrlProblem } from '@pioneer/interop/pathbuilder';
import type { FetchExportResponse } from '@pioneer/interop/pathbuilder';
import { message, ValidationError } from '@pioneer/shared/kernel';

import { ExportFetchProblem } from './pathbuilder-export-fetcher';
import type { PathbuilderExportFetcher } from './pathbuilder-export-fetcher';

const URL_PROBLEMS: Readonly<Record<ExportUrlProblem, string>> = {
  [ExportUrlProblem.NotUrl]: 'character.validation.exportUrl.notUrl',
  [ExportUrlProblem.ForeignHost]: 'character.validation.exportUrl.foreignHost',
  [ExportUrlProblem.BadId]: 'character.validation.exportUrl.badId',
};

const FETCH_PROBLEMS: Readonly<Record<ExportFetchProblem, string>> = {
  [ExportFetchProblem.TimedOut]: 'character.validation.exportUrl.timedOut',
  [ExportFetchProblem.TooLarge]: 'character.validation.exportUrl.tooLarge',
  [ExportFetchProblem.NotJson]: 'character.validation.exportUrl.notJson',
  [ExportFetchProblem.Unavailable]: 'character.validation.exportUrl.unavailable',
};

function refuse(key: string): ValidationError {
  return new ValidationError([{ path: ['url'], message: message(key) }]);
}

/**
 * Fetches the Pathbuilder export a pasted link points at, so the preview can read it like a pasted one. Only the id is
 * taken from the link: the server fetches Pathbuilder's own URL for it and nothing else.
 */
export class PathbuilderExportService {
  readonly #fetcher: PathbuilderExportFetcher;

  public constructor(fetcher: PathbuilderExportFetcher) {
    this.#fetcher = fetcher;
  }

  /** The export at `pasted`; refused, naming the url, when it is not a Pathbuilder export link or cannot be fetched. */
  public async fetchExport(pasted: string): Promise<FetchExportResponse> {
    const link = exportUrlOf(pasted);
    if (!link.ok) {
      throw refuse(URL_PROBLEMS[link.problem]);
    }
    const fetched = await this.#fetcher.fetch(link.url);
    if (!fetched.ok) {
      throw refuse(FETCH_PROBLEMS[fetched.problem]);
    }
    return { export: fetched.json };
  }
}
