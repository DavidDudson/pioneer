import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { List, ListItem, Stack, Text } from '@pioneer/frontier';

import { BreakdownMessage } from '../breakdown-messages';
import type { ShownTerm } from '../shown-breakdown';

/** A statistic's base, term by term, already worded: each term as written with what it gives, and any rounding. */
@Component({
  selector: 'pio-base-terms',
  imports: [List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './base-terms.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseTerms {
  public readonly terms = input.required<readonly ShownTerm[]>();

  protected readonly Rounding = BreakdownMessage.Rounding;
}
