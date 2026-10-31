import { computed, inject, Injectable } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { OverrideId, OverrideMode, overrideOf } from '@pioneer/character/domain';
import type { Override } from '@pioneer/character/domain';
import { Selector } from '@pioneer/rules/sdk';
import { STATISTIC_OVERRIDES, StatisticOverrideMode } from '@pioneer/rules/ui';
import type { NamedStatistic, StatisticLink, StatisticOverrides } from '@pioneer/rules/ui';
import * as z from 'zod';

import { SheetState } from '../sheet-state';
import { namedStatistics } from '../sheet-statistics';

/** The query parameter that opens the override drawer; the drawer's own `open` value is what it carries. */
const OVERRIDE_DRAWER_PARAM = 'override';

/** The query parameter that names the statistic being overridden, by selector. */
const OVERRIDE_STATISTIC_PARAM = 'overrideStatistic';

/** The query parameter that names how: `adjust` or `set`. */
const OVERRIDE_MODE_PARAM = 'overrideMode';

/** The query parameter that names the override being edited, by id; it replaces the statistic and the mode. */
const OVERRIDE_ID_PARAM = 'overrideId';

const OPEN = 'open';

/** Each mode the rules UI links with, as the character domain names it. */
const MODES: Readonly<Record<StatisticOverrideMode, OverrideMode>> = {
  [StatisticOverrideMode.Adjust]: OverrideMode.Adjust,
  [StatisticOverrideMode.Set]: OverrideMode.Set,
};

/** The page at `url`, without its query: the page a link stays on while the drawer opens beside it. */
function pathOf(url: string): string {
  return url.split('?')[0] ?? url;
}

/** The statistic an override is being made on, how, and what the engine derived for it. */
export interface OverrideTarget {
  readonly selector: Selector;
  readonly mode: OverrideMode;
  readonly statistic: NamedStatistic;
  /** The override being edited; undefined when a new one is being made. */
  readonly existing: Override | undefined;
}

/**
 * Where a statistic's Adjust and Set open: the page being shown with the override drawer open on it, naming the
 * statistic and the mode in the URL so a reload or a shared link keeps the form. Reads the same URL back as the target
 * the form is for: undefined while the content loads, and for a selector the sheet derives nothing for. Provided per
 * sheet.
 */
@Injectable()
export class SheetOverrides implements StatisticOverrides {
  readonly #router = inject(Router);
  readonly #sheet = inject(SheetState);
  readonly #query = toSignal(inject(ActivatedRoute).queryParamMap);

  /** The query parameter the drawer's open state is kept in. */
  public readonly param = OVERRIDE_DRAWER_PARAM;

  public readonly link = (selector: Selector, mode: StatisticOverrideMode): StatisticLink => ({
    to: [pathOf(this.#router.url)],
    queryParams: {
      [OVERRIDE_DRAWER_PARAM]: OPEN,
      [OVERRIDE_STATISTIC_PARAM]: selector,
      [OVERRIDE_MODE_PARAM]: MODES[mode],
    },
  });

  /** Where editing the override `id` opens: the page being shown, with the drawer open on that override. */
  public readonly edit = (id: OverrideId): StatisticLink => ({
    to: [pathOf(this.#router.url)],
    queryParams: { [OVERRIDE_DRAWER_PARAM]: OPEN, [OVERRIDE_ID_PARAM]: id },
  });

  public readonly target: Signal<OverrideTarget | undefined> = computed(() => {
    const registry = this.#sheet.engine();
    const character = this.#sheet.character();
    if (registry === undefined || character === undefined) {
      return undefined;
    }
    const id = OverrideId.safeParse(this.#query()?.get(OVERRIDE_ID_PARAM));
    const existing = id.success ? overrideOf(character.document, id.data) : undefined;
    const selector = existing?.target ?? Selector.safeParse(this.#query()?.get(OVERRIDE_STATISTIC_PARAM)).data;
    const mode = existing?.mode ?? z.enum(OverrideMode).safeParse(this.#query()?.get(OVERRIDE_MODE_PARAM)).data;
    if (selector === undefined || mode === undefined) {
      return undefined;
    }
    const statistic = namedStatistics(registry, character, [selector]).get(selector);
    return statistic === undefined ? undefined : { selector, mode, statistic, existing };
  });
}

/** What the sheet provides so its statistics offer Adjust and Set. */
export const SHEET_OVERRIDES_PROVIDERS = [
  SheetOverrides,
  { provide: STATISTIC_OVERRIDES, useExisting: SheetOverrides },
];
