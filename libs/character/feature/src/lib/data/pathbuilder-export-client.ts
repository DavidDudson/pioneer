import { inject, Injectable } from '@angular/core';
import { PathbuilderImportContract } from '@pioneer/interop/pathbuilder';
import { ApiClient } from '@pioneer/shared/web';

/**
 * Asks the server to fetch the Pathbuilder export a pasted link points at (#663 feat(interop): import a Pathbuilder
 * character from its JSON URL). Nothing is created.
 */
@Injectable({ providedIn: 'root' })
export class PathbuilderExportClient {
  readonly #api = inject(ApiClient);

  /** The export `url` points at, as the server fetched it. */
  public async fetch(url: string): Promise<unknown> {
    const { export: fetched } = await this.#api.call(PathbuilderImportContract.fetchExport, {
      params: {},
      body: { url },
    });
    return fetched;
  }
}
