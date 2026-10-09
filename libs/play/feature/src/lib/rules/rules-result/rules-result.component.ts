import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { List, ListItem, Message, Stack, Text } from '@pioneer/frontier';

import { CheckStatus, formatPath } from '../rules-check';
import type { CheckOutcome } from '../rules-check';

/** A JSON check's result: the value as Pioneer encodes it, or each problem with its path. */
@Component({
  selector: 'pio-rules-result',
  imports: [List, ListItem, Message, Stack, Text, TranslocoPipe],
  templateUrl: './rules-result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulesResult {
  protected readonly CheckStatus = CheckStatus;
  protected readonly formatPath = formatPath;
  public readonly outcome = input.required<CheckOutcome>();
}
