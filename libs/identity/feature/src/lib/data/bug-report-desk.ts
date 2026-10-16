import { inject, Injectable } from '@angular/core';
import { IdentityContract } from '@pioneer/identity/domain';
import type { BugReportDetail, BugReportListItem, BugReportStatus } from '@pioneer/identity/domain';
import { ApiClient } from '@pioneer/shared/web';
import { injectQuery, QueryClient } from '@tanstack/angular-query-experimental';
import type { CreateQueryResult } from '@tanstack/angular-query-experimental';

const bugReportKeys = {
  all: ['identity', 'bug-reports'] as const,
  list: () => [...bugReportKeys.all, 'list'] as const,
  detail: (id: BugReportDetail['id']) => [...bugReportKeys.all, 'detail', id] as const,
};

/**
 * The maintainers' bug reports, cached by TanStack Query: the list, and one report at a time. Setting a status
 * updates both, so the list and the open report agree. Everything is a 404 for an account that is not a maintainer.
 * Provided per route.
 */
@Injectable()
export class BugReportDesk {
  readonly #api = inject(ApiClient);
  readonly #client = inject(QueryClient);

  public readonly list = injectQuery(() => ({
    queryKey: bugReportKeys.list(),
    queryFn: async (): Promise<BugReportListItem[]> =>
      this.#api.call(IdentityContract.listBugReports, { params: {}, body: undefined }),
  }));

  /** A query for one report; call it from an injection context. `id` is read each time the query runs. */
  public detail(id: () => BugReportDetail['id']): CreateQueryResult<BugReportDetail> {
    return injectQuery(() => ({
      queryKey: bugReportKeys.detail(id()),
      queryFn: async (): Promise<BugReportDetail> =>
        this.#api.call(IdentityContract.readBugReport, { params: { id: id() }, body: undefined }),
    }));
  }

  /** Sets where a report stands, and brings the cached list and report up to date. */
  public async setStatus(id: BugReportDetail['id'], status: BugReportStatus): Promise<void> {
    const updated = await this.#api.call(IdentityContract.triageBugReport, { params: { id }, body: { status } });
    this.#client.setQueryData<BugReportDetail>(bugReportKeys.detail(id), updated);
    this.#client.setQueryData<BugReportListItem[]>(bugReportKeys.list(), (items) =>
      items?.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  }
}
