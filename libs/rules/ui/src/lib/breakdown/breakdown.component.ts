import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LocaleFormat, Stack, Text } from '@pioneer/frontier';
import { BaseTermKind, LineStatusKind, OverrideStatusKind, SuppressionReason, TermSign } from '@pioneer/rules/engine';
import type {
  BaseTerm,
  BreakdownLine,
  LineStatus,
  ModifierLabel,
  OverrideLine,
  OverrideStatus,
  RuleId,
  StatisticValue,
} from '@pioneer/rules/engine';
import { formatSummary } from '@pioneer/rules/predicate';
import type { PredicateSummary } from '@pioneer/rules/predicate';
import { OriginHopKind } from '@pioneer/rules/sdk';
import type { ContentId, StatisticKind } from '@pioneer/rules/sdk';
import type { MessageDescriptor } from '@pioneer/shared/kernel';
import { filter, merge } from 'rxjs';

import { NO_ORIGIN_NAMES } from '../origin-chain/origin-names';
import type { OriginNames } from '../origin-chain/origin-names';
import { BaseTerms } from './base-terms/base-terms.component';
import { BreakdownLines } from './breakdown-lines/breakdown-lines.component';
import { BreakdownMessage, LINE_STATUS_ORDER } from './breakdown-messages';
import { labelName, lineValue, summaryFormat } from './line-words';
import { numberStyle } from './number-style';
import { OverrideLines } from './override-lines/override-lines.component';
import type { ShownBreakdown, ShownLine, ShownOverride, ShownTerm } from './shown-breakdown';

/** A line and where it was in the engine's list, so lines of one status keep the engine's order. */
interface Placed {
  readonly line: BreakdownLine;
  readonly index: number;
}

/** A rule as the breakdown names it: its id and the label it carries. */
interface Labelled {
  readonly id: RuleId;
  readonly label: ModifierLabel;
}

function rank(status: LineStatus): number {
  return LINE_STATUS_ORDER.indexOf(status.kind);
}

/**
 * A statistic's breakdown (rules-engine.md, "Modifiers and stacking" and "Overrides"): its base and the terms of the
 * base formula that give it, then every modifier that reaches it, then its `Change`s and set overrides. Lines are
 * listed applied first, then conditional, suppressed, inactive and failed; each reads as its name, signed value and
 * type ("+1 status"), and one that does not simply apply is marked in text with what explains it: the line that beat
 * or removed it, when it would hold, or why it failed. Override lines keep the order they ran in and read as what
 * they did ("override 18 → 20"). When a set override pinned the total, a note above the base names it and keeps the
 * computed value in view.
 *
 * Read-only and presentational (ADR-0028): the caller passes the engine's `StatisticValue` and the display names of
 * the entries its lines and terms come from. A line is called by its `display.label`, else by the name the caller
 * gives its rule in `ruleNames`, else by its entry's name, else by the engine's message; a missing entry name shows
 * the id.
 *
 * ```html
 * <pio-breakdown [statistic]="ac" kind="dc" [entryNames]="names()" />
 * ```
 */
@Component({
  selector: 'pio-breakdown',
  imports: [BaseTerms, BreakdownLines, OverrideLines, Stack, Text, TranslocoPipe],
  templateUrl: './breakdown.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreakdownView {
  public readonly statistic = input.required<StatisticValue>();
  /** What the statistic is: a check's base, totals and override values carry a sign, a DC's or value's do not. */
  public readonly kind = input.required<StatisticKind>();
  /** Display names of the entries the lines come from, and of the variant rules that set a term. */
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  /** Names for rules that have no label of their own, before their entry's name (the playground's "Rule element 2"). */
  public readonly ruleNames = input<ReadonlyMap<RuleId, MessageDescriptor>>(new Map());
  /** Names for what the lines' origin chains refer to beyond entries: users, slots, items, events and packs. */
  public readonly originNames = input<OriginNames>(NO_ORIGIN_NAMES);

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
    const style = numberStyle(this.kind());
    const rules: readonly Labelled[] = [
      ...statistic.lines.map(({ modifier }): Labelled => modifier),
      ...statistic.overrides,
    ];
    const placed = statistic.lines.map((line, index): Placed => ({ line, index }));
    const ordered = placed.toSorted(
      (left, right) => rank(left.line.status) - rank(right.line.status) || left.index - right.index,
    );
    return {
      pinned: this.#pinned(statistic, rules, style),
      base: this.#i18n.translate(BreakdownMessage.Base, { value: this.#format.number(statistic.baseValue, style) }),
      terms: statistic.base.map((term, index) => this.#term(term, index)),
      lines: ordered.map(({ line }) => this.#line(line, rules)),
      overrides: statistic.overrides.map((line) => this.#override(line, rules, style)),
    };
  });

  #pinned(statistic: StatisticValue, rules: readonly Labelled[], style: Intl.NumberFormatOptions): string | undefined {
    if (statistic.pinnedBy === undefined) {
      return undefined;
    }
    return this.#i18n.translate(BreakdownMessage.Pinned, {
      name: this.#ruleName(statistic.pinnedBy, rules),
      total: this.#format.number(statistic.total, style),
      computed: this.#format.number(statistic.computed, style),
    });
  }

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

  #line(line: BreakdownLine, rules: readonly Labelled[]): ShownLine {
    const { modifier, status } = line;
    const shown = {
      name: this.#name(modifier),
      origin: modifier.origin,
      value: lineValue(line, this.#i18n, this.#format),
    };
    if (status.kind === LineStatusKind.Applied) {
      return { ...shown, status: undefined, detail: undefined };
    }
    return { ...shown, status: status.kind, detail: this.#detail(status, rules) };
  }

  #detail(
    status: Exclude<LineStatus, { readonly kind: typeof LineStatusKind.Applied }>,
    rules: readonly Labelled[],
  ): string | undefined {
    switch (status.kind) {
      case LineStatusKind.Suppressed: {
        const key =
          status.reason === SuppressionReason.Stacking ? BreakdownMessage.SuppressedBy : BreakdownMessage.RemovedBy;
        return this.#i18n.translate(key, {
          name: this.#ruleName(status.by, rules),
        });
      }
      case LineStatusKind.Conditional: {
        return status.beatenBy === undefined
          ? this.#appliesWhen(status.summary)
          : this.#beaten(status.summary, this.#ruleName(status.beatenBy, rules));
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

  /** "Applies when you Climb, but Steady Grip already counts for as much.": a conditional line an applied one already beats. */
  #beaten(summary: PredicateSummary | undefined, name: string): string {
    return this.#i18n.translate(BreakdownMessage.ConditionalBeatenBy, {
      hasSummary: summary === undefined ? 'no' : 'yes',
      summary: summary === undefined ? '' : formatSummary(summary, summaryFormat(this.#i18n, this.#format)),
      name,
    });
  }

  #override(line: OverrideLine, rules: readonly Labelled[], style: Intl.NumberFormatOptions): ShownOverride {
    const { status } = line;
    const shown = {
      name: this.#name(line),
      origin: line.origin,
      effect: this.#i18n.translate(BreakdownMessage.OverrideEffect, {
        mode: line.mode,
        replaced: this.#format.number(line.replaced, style),
        result: this.#format.number(line.result, style),
      }),
      byHand: line.origin.hops.some(({ kind }) => kind === OriginHopKind.Override),
    };
    if (status.kind === OverrideStatusKind.Applied) {
      return { ...shown, status: undefined, detail: undefined };
    }
    return {
      ...shown,
      status: status.kind,
      detail: this.#overrideDetail(status, rules),
    };
  }

  #overrideDetail(
    status: Exclude<OverrideStatus, { readonly kind: typeof OverrideStatusKind.Applied }>,
    rules: readonly Labelled[],
  ): string | undefined {
    switch (status.kind) {
      case OverrideStatusKind.Replaced: {
        return this.#i18n.translate(BreakdownMessage.ReplacedBy, {
          name: this.#ruleName(status.by, rules),
        });
      }
      case OverrideStatusKind.Conditional: {
        return this.#appliesWhen(status.summary);
      }
      case OverrideStatusKind.Inactive: {
        return this.#i18n.translate(BreakdownMessage.Inactive);
      }
      case OverrideStatusKind.Failed: {
        return this.#translate(status.error);
      }
      default: {
        return status satisfies never;
      }
    }
  }

  #appliesWhen(summary: PredicateSummary | undefined): string | undefined {
    if (summary === undefined) {
      return undefined;
    }
    return this.#i18n.translate(BreakdownMessage.AppliesWhen, {
      summary: formatSummary(summary, summaryFormat(this.#i18n, this.#format)),
    });
  }

  /** A rule a line names (the one that beat, removed, replaced or pinned it): by its name; else the caller's; else its id. */
  #ruleName(id: RuleId, rules: readonly Labelled[]): string {
    const rule = rules.find((candidate) => candidate.id === id);
    if (rule !== undefined) {
      return this.#name(rule);
    }
    const named = this.ruleNames().get(id);
    return named === undefined ? id : this.#translate(named);
  }

  #name({ id, label }: Labelled): string {
    if ('text' in label) {
      return label.text;
    }
    const named = this.ruleNames().get(id);
    if (named !== undefined) {
      return this.#translate(named);
    }
    return labelName(label, this.entryNames(), (descriptor) => this.#translate(descriptor));
  }

  #entryName(entry: ContentId): string {
    return this.entryNames().get(entry) ?? entry;
  }

  #translate(descriptor: MessageDescriptor): string {
    return this.#i18n.translate(descriptor.key, descriptor.params);
  }
}
