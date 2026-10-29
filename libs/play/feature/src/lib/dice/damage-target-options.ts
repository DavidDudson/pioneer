import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { DAMAGE_TYPE_KEYS } from '@pioneer/play/ui';
import { DamageGroup, DamageType } from '@pioneer/rules/sdk';
import { filter, merge } from 'rxjs';

import { categoryOf, categoryOfGroup, damageTargetColumns, TargetCategory, typesOf } from './damage-target-table';
import type { DamageTargetRow } from './damage-target-table';
import { DAMAGE_ADJUSTMENT_TARGET_KEYS } from './dice-labels';

/** Each category's name, spelled out so the message check sees every key. */
const CATEGORY_KEYS: Readonly<Record<TargetCategory, string>> = {
  [TargetCategory.Group]: 'play.dice.targetCategory.group',
  [TargetCategory.Physical]: 'play.dice.targetCategory.physical',
  [TargetCategory.Energy]: 'play.dice.targetCategory.energy',
  [TargetCategory.Other]: 'play.dice.targetCategory.other',
};

/** Choices for a target's immunities (damage types) and its weaknesses and resistances (types and groups). */
@Injectable({ providedIn: 'root' })
export class DamageTargetOptions {
  readonly #i18n = inject(TranslocoService);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Ticks when the locale changes or the `play` scope finishes loading. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  /** The columns of both pickers. */
  public readonly columns = computed(() => {
    this.#messages();
    return damageTargetColumns(
      {
        name: this.#i18n.translate('play.dice.targetColumns.name'),
        category: this.#i18n.translate('play.dice.targetColumns.category'),
        includes: this.#i18n.translate('play.dice.targetColumns.includes'),
      },
      (category) => this.#i18n.translate(CATEGORY_KEYS[category]),
    );
  });

  public readonly types = computed((): readonly DamageTargetRow[] => {
    this.#messages();
    return Object.values(DamageType).map((value) => ({
      value,
      label: this.#i18n.translate(DAMAGE_TYPE_KEYS[value]),
      category: categoryOf(value),
      includes: [],
    }));
  });

  public readonly targets = computed((): readonly DamageTargetRow[] => {
    this.#messages();
    // Groups first: `physical` and `all` are the common stat-block entries.
    const groups = Object.values(DamageGroup).map((value): DamageTargetRow => ({
      value,
      label: this.#i18n.translate(DAMAGE_ADJUSTMENT_TARGET_KEYS[value]),
      category: categoryOfGroup(value),
      includes: typesOf(value).map((type) => this.#i18n.translate(DAMAGE_TYPE_KEYS[type])),
    }));
    return [...groups, ...this.types()];
  });
}
