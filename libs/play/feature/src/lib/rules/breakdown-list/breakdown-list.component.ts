import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Badge, List, ListItem, LocaleFormat, Stack, Text } from '@pioneer/frontier';
import { LineStatusKind } from '@pioneer/rules/engine';
import { formatSummary } from '@pioneer/rules/predicate';
import type { MessageDescriptor } from '@pioneer/shared/kernel';
import { filter, merge } from 'rxjs';

import { LINE_STATE_KEYS, LINE_STATE_TONES, MODIFIER_TYPE_KEYS } from '../breakdown-lines';
import type { LineRow, LineState } from '../breakdown-lines';

/** A line as shown: its state badge, its name, its typed value and what explains its state. */
interface ShownLine {
  readonly rule: number;
  readonly state: LineStatusKind;
  readonly name: string;
  readonly value: string;
  readonly detail: string | undefined;
}

/** A statistic's modifier lines: applied, suppressed by what, conditional on what, inactive, or failed and why. */
@Component({
  selector: 'pio-breakdown-list',
  imports: [Badge, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './breakdown-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreakdownList {
  protected readonly LINE_STATE_KEYS = LINE_STATE_KEYS;
  protected readonly LINE_STATE_TONES = LINE_STATE_TONES;
  public readonly lines = input.required<readonly LineRow[]>();

  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  /** Ticks when the locale changes or a message scope (`play`, `predicate`) finishes loading. */
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly shown = computed((): readonly ShownLine[] => {
    this.#messages();
    this.#format.locale();
    return this.lines().map((line) => ({
      rule: line.rule,
      state: line.state.kind,
      name: line.label ?? this.#i18n.translate('play.rules.ruleNumber', { number: line.rule }),
      value: this.#i18n.translate('play.rules.lineValue', {
        type: this.#translate({ key: MODIFIER_TYPE_KEYS[line.type] }),
        value: line.value === undefined ? '' : this.#format.number(line.value, { signDisplay: 'exceptZero' }),
      }),
      detail: this.#detail(line.state),
    }));
  });

  #translate(descriptor: MessageDescriptor): string {
    return this.#i18n.translate(descriptor.key, descriptor.params);
  }

  #detail(state: LineState): string | undefined {
    switch (state.kind) {
      case LineStatusKind.Suppressed: {
        return this.#i18n.translate('play.rules.line.suppressedBy', { rule: state.by });
      }
      case LineStatusKind.Conditional: {
        const summary =
          state.summary === undefined
            ? undefined
            : formatSummary(state.summary, {
                message: (descriptor) => this.#translate(descriptor),
                list: (items, style): string => this.#format.list(items, style),
              });
        return summary === undefined ? undefined : this.#i18n.translate('play.rules.summary', { summary });
      }
      case LineStatusKind.Inactive: {
        return this.#i18n.translate('play.rules.line.predicateFails');
      }
      case LineStatusKind.Failed: {
        return this.#translate(state.error);
      }
      case LineStatusKind.Applied: {
        return undefined;
      }
      default: {
        return state satisfies never;
      }
    }
  }
}
