import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { Selector } from '@pioneer/rules/sdk';
import type { StatisticLink } from '@pioneer/rules/ui';

/** The query parameter that opens the breakdown drawer; the drawer's own `open` value is what it carries. */
export const BREAKDOWN_DRAWER_PARAM = 'breakdown';

/** The query parameter that names the statistic the drawer shows, by selector. */
export const BREAKDOWN_STATISTIC_PARAM = 'statistic';

const OPEN = 'open';

/** The page at `url`, without its query: the page a stat link stays on while the drawer opens beside it. */
export function pathOf(url: string): string {
  return url.split('?')[0] ?? url;
}

/**
 * For the previews a sheet provides: where the breakdown of a selector opens, which is the page being shown with the
 * drawer open on it. Call it where `inject` works; the page is read when a link is asked for.
 */
export function injectStatisticLink(): (selector: Selector) => StatisticLink {
  const router = inject(Router);
  return (selector) => ({
    to: [pathOf(router.url)],
    queryParams: { [BREAKDOWN_DRAWER_PARAM]: OPEN, [BREAKDOWN_STATISTIC_PARAM]: selector },
  });
}
