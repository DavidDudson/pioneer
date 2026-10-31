import { inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import type { QueryParams } from '@pioneer/rules/sdk';

import type { FilterSources } from './sheet-slot-filter';

const NO_PARAMS: QueryParams = {};

/** The current URL's query params as the pickers' filter store: read, and changed in place (no history entry). */
export function injectFilterSources(): FilterSources {
  const route = inject(ActivatedRoute);
  const router = inject(Router);
  return {
    params: toSignal(route.queryParams, { initialValue: NO_PARAMS }),
    write: async (changes) => {
      await router.navigate([], {
        relativeTo: route,
        queryParams: changes,
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    },
  };
}
