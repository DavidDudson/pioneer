import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Badge, LocaleFormat, Skeleton, Stack, Text } from '@pioneer/frontier';
import { formatSummary } from '@pioneer/rules/predicate';
import type { MessageDescriptor } from '@pioneer/shared/kernel';
import { filter, merge } from 'rxjs';

import { TRUTH_KEYS, TRUTH_TONES, VERDICT_KEYS, VerdictStatus } from '../predicate-verdict';
import type { VerdictCheck } from '../predicate-verdict';
import { RulesResult } from '../rules-result/rules-result.component';
import { VerdictStatements } from '../verdict-statements/verdict-statements.component';

/**
 * A predicate's verdict, when it would hold if that depends on the situation, then every statement's verdict as a
 * nested list. Problems with the predicate or the roll options show instead.
 */
@Component({
  selector: 'pio-predicate-verdict-result',
  imports: [Badge, RulesResult, Skeleton, Stack, Text, TranslocoPipe, VerdictStatements],
  templateUrl: './predicate-verdict-result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PredicateVerdictResult {
  protected readonly VerdictStatus = VerdictStatus;
  protected readonly TRUTH_KEYS = TRUTH_KEYS;
  protected readonly VERDICT_KEYS = VERDICT_KEYS;
  protected readonly TRUTH_TONES = TRUTH_TONES;
  public readonly check = input.required<VerdictCheck>();

  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  /** Ticks when the locale changes or a message scope (`predicate`) finishes loading. */
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));
  /** The summary in the UI locale, while the verdict is unknown. */
  protected readonly summary = computed((): string | undefined => {
    this.#messages();
    const result = this.check();
    if (result.status !== VerdictStatus.Valid || result.summary === undefined) {
      return undefined;
    }
    return formatSummary(result.summary, {
      message: (descriptor: MessageDescriptor): string => this.#i18n.translate(descriptor.key, descriptor.params),
      list: (items, style): string => this.#format.list(items, style),
    });
  });
}
