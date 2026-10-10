import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Field, FieldError, FieldHint, Label, Segmented } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { filter, merge } from 'rxjs';

import { STATISTIC_SOURCE_KEYS, StatisticSource } from '../statistic-sources';

/** Where the statistics tool takes its definitions from, with the problem when a pack failed to load. */
@Component({
  selector: 'pio-statistic-source-field',
  imports: [Field, FieldError, FieldHint, Label, Segmented, TranslocoPipe],
  templateUrl: './statistic-source-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticSourceField {
  public readonly value = input.required<StatisticSource>();
  /** Whether the last pack picked failed to load. */
  public readonly failed = input.required<boolean>();
  public readonly chosen = output<StatisticSource>();

  readonly #i18n = inject(TranslocoService);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Ticks when the locale changes or a message scope (`play`) finishes loading. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));
  protected readonly sources = computed((): readonly SelectOption<StatisticSource>[] => {
    this.#messages();
    return Object.values(StatisticSource).map((source) => ({
      value: source,
      label: this.#i18n.translate(STATISTIC_SOURCE_KEYS[source]),
    }));
  });

  protected choose(source: StatisticSource | undefined): void {
    if (source !== undefined) {
      this.chosen.emit(source);
    }
  }
}
