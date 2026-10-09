import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Badge, List, ListItem, LocaleFormat, Stack, Text } from '@pioneer/frontier';
import { OverrideStatusKind } from '@pioneer/rules/engine';
import { formatSummary } from '@pioneer/rules/predicate';
import type { MessageDescriptor } from '@pioneer/shared/kernel';
import { filter, merge } from 'rxjs';

import { OVERRIDE_STATE_KEYS, OVERRIDE_STATE_TONES, RULE_NAME_KEYS } from '../breakdown-lines';
import type { OverrideRow, OverrideState, RuleName } from '../breakdown-lines';

/** An override line as shown: its state, its name, what it did, and what explains its state. */
interface ShownOverride {
  readonly key: string;
  readonly state: OverrideStatusKind;
  readonly name: string;
  readonly manual: boolean;
  readonly effect: string;
  readonly detail: string | undefined;
}

/**
 * A statistic's `Change`s and set overrides: each with the value it replaced and the value it left, who or what
 * did it, and why one did not apply.
 */
@Component({
  selector: 'pio-override-list',
  imports: [Badge, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './override-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverrideList {
  protected readonly OVERRIDE_STATE_KEYS = OVERRIDE_STATE_KEYS;
  protected readonly OVERRIDE_STATE_TONES = OVERRIDE_STATE_TONES;
  public readonly overrides = input.required<readonly OverrideRow[]>();

  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  /** Ticks when the locale changes or a message scope (`play`, `predicate`) finishes loading. */
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly shown = computed((): readonly ShownOverride[] => {
    this.#messages();
    this.#format.locale();
    return this.overrides().map((line) => ({
      key: `${line.name.source}-${line.name.number}`,
      state: line.state.kind,
      name: line.label ?? this.#ruleName(line.name),
      manual: line.manual,
      effect: this.#translate({
        key: 'play.rules.overrideEffect',
        params: {
          mode: line.mode,
          replaced: this.#format.number(line.replaced),
          result: this.#format.number(line.result),
        },
      }),
      detail: this.#detail(line.state),
    }));
  });

  #ruleName({ source, number }: RuleName): string {
    return this.#translate({ key: RULE_NAME_KEYS[source], params: { number } });
  }

  #translate(descriptor: MessageDescriptor): string {
    return this.#i18n.translate(descriptor.key, descriptor.params);
  }

  #detail(state: OverrideState): string | undefined {
    switch (state.kind) {
      case OverrideStatusKind.Replaced: {
        return this.#translate({ key: 'play.rules.line.replacedBy', params: { rule: this.#ruleName(state.by) } });
      }
      case OverrideStatusKind.Conditional: {
        const summary =
          state.summary === undefined
            ? undefined
            : formatSummary(state.summary, {
                message: (descriptor) => this.#translate(descriptor),
                list: (items, style): string => this.#format.list(items, style),
              });
        return summary === undefined ? undefined : this.#translate({ key: 'play.rules.summary', params: { summary } });
      }
      case OverrideStatusKind.Inactive: {
        return this.#translate({ key: 'play.rules.line.predicateFails' });
      }
      case OverrideStatusKind.Failed: {
        return this.#translate(state.error);
      }
      case OverrideStatusKind.Applied: {
        return undefined;
      }
      default: {
        return state satisfies never;
      }
    }
  }
}
