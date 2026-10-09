import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import type { SelectOption } from '@pioneer/frontier';
import { DamageGroup, DamageType } from '@pioneer/rules/sdk';
import type { DamageAdjustmentTarget } from '@pioneer/rules/sdk';
import { filter, merge } from 'rxjs';

import { DAMAGE_ADJUSTMENT_TARGET_KEYS, DAMAGE_TYPE_KEYS } from './dice-labels';

/** Choices for a target's immunities (damage types) and its weaknesses and resistances (types and groups). */
@Injectable({ providedIn: 'root' })
export class DamageTargetOptions {
  readonly #i18n = inject(TranslocoService);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Ticks when the locale changes or the `play` scope finishes loading. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  public readonly types = computed<readonly SelectOption<DamageType>[]>(() => {
    this.#messages();
    return Object.values(DamageType).map((value) => ({
      value,
      label: this.#i18n.translate(DAMAGE_TYPE_KEYS[value]),
    }));
  });

  public readonly targets = computed<readonly SelectOption<DamageAdjustmentTarget>[]>(() => {
    this.#messages();
    // Groups first: `physical` and `all` are the common stat-block entries.
    return [...Object.values(DamageGroup), ...Object.values(DamageType)].map((value) => ({
      value,
      label: this.#i18n.translate(DAMAGE_ADJUSTMENT_TARGET_KEYS[value]),
    }));
  });
}
