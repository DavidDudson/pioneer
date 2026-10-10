import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { List, ListItem, LocaleFormat, Stack, Text } from '@pioneer/frontier';

import type { TermLine } from '../statistics-check';

/** A base term with its value in the viewer's locale. */
interface ShownTerm {
  readonly code: string | undefined;
  readonly value: string;
  /** The variant rule that set the term's proficiency bonus, if one did. */
  readonly variant: string | undefined;
}

/** A statistic's base, term by term: each term as written with what it gives, and any rounding. */
@Component({
  selector: 'pio-base-terms',
  imports: [List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './base-terms.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseTerms {
  readonly #format = inject(LocaleFormat);
  public readonly terms = input.required<readonly TermLine[]>();

  protected readonly shown = computed((): readonly ShownTerm[] => {
    this.#format.locale();
    return this.terms().map((term): ShownTerm => ({
      code: term.code,
      value: this.#format.number(term.value),
      variant: term.variant,
    }));
  });
}
