import type { PathbuilderExportUrl } from '@pioneer/interop/pathbuilder';
import type { ValueOf } from '@pioneer/shared/kernel';

/** Why an export could not be fetched from Pathbuilder. */
export const ExportFetchProblem = {
  /** No answer in time. */
  TimedOut: 'timed-out',
  /** The answer is larger than any export. */
  TooLarge: 'too-large',
  /** The answer is not JSON. */
  NotJson: 'not-json',
  /** Pathbuilder refused, redirected off its host or could not be reached. */
  Unavailable: 'unavailable',
} as const;
export type ExportFetchProblem = ValueOf<typeof ExportFetchProblem>;

export type FetchedExport =
  { readonly ok: true; readonly json: unknown } | { readonly ok: false; readonly problem: ExportFetchProblem };

/** Fetches the JSON served at a clean Pathbuilder export URL; the only way the server reaches the network for an import. */
export abstract class PathbuilderExportFetcher {
  public abstract fetch(url: PathbuilderExportUrl): Promise<FetchedExport>;
}
