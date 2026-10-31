import type { Routes } from '@angular/router';

import { provideBareInlineRoller } from './bare-inline-roller';

/**
 * `routes` with the roller for text read where no character is. It lives in its own lazily loaded file, not in
 * `app.config.ts`: its `rules/ui` and engine imports would otherwise be part of the initial bundle.
 */
export function withBareRoller(routes: Routes): Routes {
  return [{ path: '', providers: provideBareInlineRoller(), children: routes }];
}
