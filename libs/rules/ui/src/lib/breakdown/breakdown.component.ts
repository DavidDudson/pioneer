import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LocaleFormat, Stack, Text } from '@pioneer/frontier';
import { BaseTermKind, LineStatusKind, SuppressionReason, TermSign } from '@pioneer/rules/engine';
import type { BaseTerm, BreakdownLine, LineStatus, RuleId, StatisticValue } from '@pioneer/rules/engine';
import { formatSummary } from '@pioneer/rules/predicate';
import type { ContentId } from '@pioneer/rules/sdk';
import type { MessageDescriptor } from '@pioneer/shared/kernel';
import { filter, merge } from 'rxjs';

import { BaseTerms } from './base-terms/base-terms.component';
import { BreakdownLines } from './breakdown-lines/breakdown-lines.component';
import { BreakdownMessage, LINE_STATUS_ORDER, MODIFIER_TYPE_MESSAGES } from './breakdown-messages';
import type { ShownBreakdown, ShownLine, ShownTerm } from './shown-breakdown';

/** PF2e modifiers always show their sign, `+0` included. */
const SIGNED: Intl.NumberFormatOptions = { signDisplay: 'always' };

/** A line and where it was in the engine's list, so lines of one status keep the engine's order. */
interface Placed {
  readonly line: BreakdownLine;
  readonly index: number;
}

function rank(status: LineStatus): number {
  return LINE_STATUS_ORDER.indexOf(status.kind);
}

/**
 * A statistic's breakdown (rules-engine.md, "Modifiers and stacking"): its base and the terms of the base formula
 * that give it, then every modifier that reaches it. Lines are listed applied first, then conditional, suppressed,
 * inactive and failed; each reads as its name, signed value and type ("+1 status"), and one that does not simply
 * apply is marked in text with what explains it: the line that beat or removed it, when it would hold, or why it
 * failed.
 *
 * Read-only and presentational (ADR-0028): the caller passes the engine's `StatisticValue` and the display names of
 * the entries its lines and terms come from. A line is called by its `display.label`, else by the name the caller
 * gives its rule in `ruleNames`, else by its entry's name, else by the engine's message; a missing entry name shows
 * the id.
 *
 * ```html
 * <pio-breakdown [statistic]="ac" [entryNames]="names()" />
 * ```
 */
@Component({
  selector: 'pio-breakdown',
  imports: [BaseTerms, BreakdownLines, Stack, Text, TranslocoPipe],
  templateUrl: './breakdown.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreakdownView {
  public readonly statistic = input.required<StatisticValue>();
  /** Display names of the entries the lines come from, and of the variant rules that set a term. */
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  /** Names for rules that have no label of their own, before their entry's name (the playground's "Rule element 2"). */
  public readonly ruleNames = input<ReadonlyMap<RuleId, MessageDescriptor>>(new Map());

  protected readonly Message = BreakdownMessage;

  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  /** Ticks when the locale changes or a message scope (`rules`, `predicate`, `engine`) finishes loading. */
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly shown = computed((): ShownBreakdown => {
    this.#messages();
    this.#format.locale();
    const statistic = this.statistic();
    const placed = statistic.lines.map((line, index): Placed => ({ line, index }));
    const ordered = placed.toSorted(
      (left, right) => rank(left.line.status) - rank(right.line.status) || left.index - right.index,
    );
    return {
      base: this.#i18n.translate(BreakdownMessage.Base, { value: this.#format.number(statistic.baseValue) }),
      terms: statistic.base.map((term, index) => this.#term(term, index)),
      lines: ordered.map(({ line }) => this.#line(line, statistic.lines)),
    };
  });

  #term(term: BaseTerm, index: number): ShownTerm {
    const value = this.#i18n.translate(BreakdownMessage.TermValue, { value: this.#format.number(term.value) });
    if (term.kind === BaseTermKind.Rounding) {
      return { code: undefined, value, variant: undefined };
    }
    const leading = index === 0 && term.sign === TermSign.Plus;
    const variant =
      term.origin === undefined
        ? undefined
        : this.#i18n.translate(BreakdownMessage.TermVariant, { name: this.#entryName(term.origin.entry) });
    return { code: leading ? term.formula : `${term.sign} ${term.formula}`, value, variant };
  }

  #line(line: BreakdownLine, lines: readonly BreakdownLine[]): ShownLine {
    const { modifier, value, status } = line;
    const shown = {
      name: this.#lineName(line),
      value: this.#i18n.translate(BreakdownMessage.LineValue, {
        hasValue: value === undefined ? 'no' : 'yes',
        value: value === undefined ? '' : this.#format.number(value, SIGNED),
        type: this.#translate({ key: MODIFIER_TYPE_MESSAGES[modifier.type] }),
      }),
    };
    if (status.kind === LineStatusKind.Applied) {
      return { ...shown, status: undefined, detail: undefined };
    }
    return { ...shown, status: status.kind, detail: this.#detail(status, lines) };
  }

  #detail(
    status: Exclude<LineStatus, { readonly kind: typeof LineStatusKind.Applied }>,
    lines: readonly BreakdownLine[],
  ): string | undefined {
    switch (status.kind) {
      case LineStatusKind.Suppressed: {
        const key =
          status.reason === SuppressionReason.Stacking ? BreakdownMessage.SuppressedBy : BreakdownMessage.RemovedBy;
        return this.#i18n.translate(key, { name: this.#ruleName(status.by, lines) });
      }
      case LineStatusKind.Conditional: {
        if (status.summary === undefined) {
          return undefined;
        }
        const summary = formatSummary(status.summary, {
          message: (descriptor) => this.#translate(descriptor),
          list: (items, style): string => this.#format.list(items, style),
        });
        return this.#i18n.translate(BreakdownMessage.AppliesWhen, { summary });
      }
      case LineStatusKind.Inactive: {
        return this.#i18n.translate(BreakdownMessage.Inactive);
      }
      case LineStatusKind.Failed: {
        return this.#translate(status.error);
      }
      default: {
        return status satisfies never;
      }
    }
  }

  /** The rule a line is suppressed by: the line it made, by name; else the caller's name for it; else its id. */
  #ruleName(id: RuleId, lines: readonly BreakdownLine[]): string {
    const line = lines.find((candidate) => candidate.modifier.id === id);
    if (line !== undefined) {
      return this.#lineName(line);
    }
    const named = this.ruleNames().get(id);
    return named === undefined ? id : this.#translate(named);
  }

  #lineName({ modifier: { id, label } }: BreakdownLine): string {
    if ('text' in label) {
      return label.text;
    }
    const named = this.ruleNames().get(id);
    if (named !== undefined) {
      return this.#translate(named);
    }
    return 'entry' in label ? this.#entryName(label.entry) : this.#translate(label.message);
  }

  #entryName(entry: ContentId): string {
    return this.entryNames().get(entry) ?? entry;
  }

  #translate(descriptor: MessageDescriptor): string {
    return this.#i18n.translate(descriptor.key, descriptor.params);
  }
}
