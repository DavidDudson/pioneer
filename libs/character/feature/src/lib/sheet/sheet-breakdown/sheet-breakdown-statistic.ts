import { computed, inject, Injectable } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Selector } from '@pioneer/rules/sdk';
import type { NamedStatistic } from '@pioneer/rules/ui';

import { SheetState } from '../sheet-state';
import { namedStatistics } from '../sheet-statistics';
import { BREAKDOWN_DRAWER_PARAM, BREAKDOWN_STATISTIC_PARAM } from './sheet-breakdown';

/**
 * The statistic the breakdown drawer shows: the one a stat link in a preview names in the URL
 * (`statistic=perception`), so a reload or a shared link keeps it. Undefined while the content loads, and for a
 * selector the sheet derives nothing for. Provided per sheet.
 */
@Injectable()
export class SheetBreakdownStatistic {
  readonly #sheet = inject(SheetState);
  readonly #query = toSignal(inject(ActivatedRoute).queryParamMap);

  /** The query parameter the drawer's open state is kept in. */
  public readonly param = BREAKDOWN_DRAWER_PARAM;

  public readonly statistic: Signal<NamedStatistic | undefined> = computed(() => {
    const registry = this.#sheet.engine();
    const character = this.#sheet.character();
    const selector = Selector.safeParse(this.#query()?.get(BREAKDOWN_STATISTIC_PARAM));
    if (registry === undefined || character === undefined || !selector.success) {
      return undefined;
    }
    return namedStatistics(registry, character, [selector.data]).get(selector.data);
  });
}
