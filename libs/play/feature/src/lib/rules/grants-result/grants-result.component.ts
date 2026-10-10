import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { EmptyState, Heading, LocaleFormat, Stack } from '@pioneer/frontier';
import { formatSummary } from '@pioneer/rules/predicate';
import type { PredicateSummary } from '@pioneer/rules/predicate';
import type { MessageDescriptor } from '@pioneer/shared/kernel';
import { filter, merge } from 'rxjs';

import type { OptionRow } from '../grant-choices';
import { GrantList } from '../grant-list/grant-list.component';
import type { ShownRow } from '../grant-list/grant-list.component';
import type { ToggleRow } from '../grant-toggles';
import { GrantsStatus } from '../grants-check';
import type { GrantsCheck } from '../grants-check';
import { RulesResult } from '../rules-result/rules-result.component';

/** Between the entries on a grant chain; an arrow reads the same in every locale. */
const PATH_SEPARATOR = ' → ';

interface ShownGrants {
  readonly items: readonly ShownRow[];
  readonly duplicates: readonly ShownRow[];
  readonly conditional: readonly ShownRow[];
  readonly open: readonly ShownRow[];
  readonly answered: readonly ShownRow[];
  readonly toggles: readonly ShownRow[];
  readonly rollOptions: readonly ShownRow[];
  readonly errors: readonly ShownRow[];
}

const NO_ROWS: ShownGrants = {
  items: [],
  duplicates: [],
  conditional: [],
  open: [],
  answered: [],
  toggles: [],
  rollOptions: [],
  errors: [],
};

/**
 * The entries on the character with the chain that put each there, the grants skipped as already there, those
 * that depend on the situation, the choices to make and made, the toggles, the roll options the set derives once it
 * settles, and what failed.
 * Problems with the entries show instead.
 */
@Component({
  selector: 'pio-grants-result',
  imports: [EmptyState, GrantList, Heading, RulesResult, Stack, TranslocoPipe],
  templateUrl: './grants-result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GrantsResult {
  protected readonly GrantsStatus = GrantsStatus;
  public readonly check = input.required<GrantsCheck>();

  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  /** Ticks when the locale changes or a message scope (`play`, `predicate`, `grants`) finishes loading. */
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly shown = computed((): ShownGrants => {
    this.#messages();
    this.#format.locale();
    const result = this.check();
    if (result.status !== GrantsStatus.Valid) {
      return NO_ROWS;
    }
    return {
      items: result.items.map((row) => ({ title: row.name, details: this.#via(row.via) })),
      duplicates: result.duplicates.map((row) => ({ title: row.name, details: this.#via(row.via) })),
      conditional: result.conditional.map((row) => ({
        title: row.name,
        details: [
          ...this.#via(row.via),
          this.#i18n.translate('play.rules.summary', { summary: this.#summary(row.summary) }),
        ],
      })),
      open: result.open.map((row) => ({
        title: row.title,
        details: [...this.#slot(row.slot, row.via), ...this.#options(row.options)],
      })),
      answered: result.answered.map((row) => ({
        title: row.title,
        details: [...this.#slot(row.slot, row.via), this.#i18n.translate('play.rules.picked', { pick: row.pick })],
      })),
      toggles: result.toggles.map((row) => ({
        title: row.option,
        details: [this.#i18n.translate('play.rules.slot', { slot: row.slot }), this.#toggleState(row)],
      })),
      rollOptions: result.rollOptions.map((option) => ({ title: option, details: [] })),
      errors: result.errors.map((row) => ({ title: this.#translate(row.error), details: this.#via(row.via) })),
    };
  });

  /** Whether a toggle is on, and with which suboption. */
  #toggleState({ on, suboption }: ToggleRow): string {
    if (!on) {
      return this.#i18n.translate('play.rules.toggleOff');
    }
    return suboption === undefined
      ? this.#i18n.translate('play.rules.toggleOn')
      : this.#i18n.translate('play.rules.toggleOnWith', { suboption });
  }

  #translate(descriptor: MessageDescriptor): string {
    return this.#i18n.translate(descriptor.key, descriptor.params);
  }

  /** The chain that led to a row, or nothing for a root the player picked. */
  #via(via: readonly string[]): string[] {
    return via.length === 0
      ? []
      : [this.#i18n.translate('play.rules.grantedThrough', { path: via.join(PATH_SEPARATOR) })];
  }

  /** The slot as typed, and the chain to its entry. */
  #slot(slot: string, via: readonly string[]): string[] {
    return [this.#i18n.translate('play.rules.slot', { slot }), ...this.#via(via)];
  }

  /** What a slot offers, or that nothing can be picked: a query no entry satisfies, or listed options none of which apply. */
  #options(options: readonly OptionRow[]): string[] {
    return options.length === 0
      ? [this.#i18n.translate('play.rules.noOptions')]
      : options.map(({ value, label, summary }) => this.#option(label, value, summary));
  }

  /** An option the slot offers, with when it holds for one that depends on the situation. */
  #option(label: string, value: string, summary: PredicateSummary | undefined): string {
    return summary === undefined
      ? this.#i18n.translate('play.rules.option', { label, value })
      : this.#i18n.translate('play.rules.conditionalOption', { label, value, summary: this.#summary(summary) });
  }

  #summary(summary: PredicateSummary): string {
    return formatSummary(summary, {
      message: (descriptor) => this.#translate(descriptor),
      list: (items, style): string => this.#format.list(items, style),
    });
  }
}
