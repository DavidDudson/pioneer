import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Heading, LocaleFormat, Stack, Text } from '@pioneer/frontier';
import { formatSummary } from '@pioneer/rules/predicate';
import type { MessageDescriptor } from '@pioneer/shared/kernel';
import { filter, merge } from 'rxjs';

import { GrantList } from '../grant-list/grant-list.component';
import type { ShownRow } from '../grant-list/grant-list.component';
import { GrantsStatus } from '../grants-check';
import type { ConditionalRow, GrantsCheck } from '../grants-check';
import { RulesResult } from '../rules-result/rules-result.component';

/** Between the entries on a grant chain; an arrow reads the same in every locale. */
const PATH_SEPARATOR = ' → ';

interface ShownGrants {
  readonly items: readonly ShownRow[];
  readonly duplicates: readonly ShownRow[];
  readonly conditional: readonly ShownRow[];
  readonly errors: readonly ShownRow[];
}

const NO_ROWS: ShownGrants = { items: [], duplicates: [], conditional: [], errors: [] };

/**
 * The entries on the character with the chain that put each there, the grants skipped as already there, those
 * that depend on the situation, and what failed. Problems with the entries show instead.
 */
@Component({
  selector: 'pio-grants-result',
  imports: [GrantList, Heading, RulesResult, Stack, Text, TranslocoPipe],
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
        details: [...this.#via(row.via), this.#i18n.translate('play.rules.summary', { summary: this.#summary(row) })],
      })),
      errors: result.errors.map((row) => ({ title: this.#translate(row.error), details: this.#via(row.via) })),
    };
  });

  #translate(descriptor: MessageDescriptor): string {
    return this.#i18n.translate(descriptor.key, descriptor.params);
  }

  /** The chain that led to a row, or nothing for a root the player picked. */
  #via(via: readonly string[]): string[] {
    return via.length === 0
      ? []
      : [this.#i18n.translate('play.rules.grantedThrough', { path: via.join(PATH_SEPARATOR) })];
  }

  #summary(row: ConditionalRow): string {
    return formatSummary(row.summary, {
      message: (descriptor) => this.#translate(descriptor),
      list: (items, style): string => this.#format.list(items, style),
    });
  }
}
